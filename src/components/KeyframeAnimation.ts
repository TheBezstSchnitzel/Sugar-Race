import { quat, vec3 } from "gl-matrix";
import type { Component } from "../Component.ts";
import type { Entity } from "../Entity.ts";
import { Transform } from "./Transform.ts";

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}


/**
 * Interpolation of values between keyframes.
 */
export enum KeyframeInterpolation {
    Constant,
    Linear,
    CubicSpline
}

/**
 * Which property is being animated.
 */
export enum KeyframeTarget {
    Translation,
    Rotation,
    Scale
}

/**
 * A keyframe stores a specific value at a specific time,
 * thus creating change in values through the timeline.
 */
export type Keyframe = {
    time: number;       // in seconds
    value: vec3 | quat; // can be vector or quaternion, since we have translation/scale/rotation
};

/**
 * An animation channel. Holds the keyframes of a specific
 * value animation, its interpolation, and what property should be animated.
 */
export class KeyframeAnimationChannel {
    interpolation: KeyframeInterpolation;
    target: KeyframeTarget;
    keyframes: Keyframe[];

    keyframeIndex: number;
    previousTime: number;

    constructor(interpolation: KeyframeInterpolation, target: KeyframeTarget, keyframes: Keyframe[]) {
        this.keyframeIndex = 0;
        this.previousTime = 0;

        this.interpolation = interpolation;
        this.target = target;
        this.keyframes = keyframes;
        // We sort the keyframes through time in advance
        // so that keyframe lookup is more efficient
        keyframes.sort((a, b) => a.time - b.time);
    }

    /**
     * Finds the last keyframe before current animation time.
     * This and the next keyframe can then be used to compute
     * new animation value.
     * @param passedTime Current time in animation, in seconds
     */
    _findKeyframe(passedTime: number) {
        // POSSIBLE CHALLENGE: There is surely a more efficient
        // way to get the keyframe interval for current time ... ;)
        for (let i = 0; i < this.keyframes.length; i++) {
            const keyframe = this.keyframes[i];
            if (keyframe.time > passedTime) {
                this.keyframeIndex = Math.max(0, i - 1);
                return;
            }
        }
        this.keyframeIndex = this.keyframes.length - 1;
    }

    /**
     * Computes the animated value for the current time.
     * 
     * NOTE: Currently, only linear interpolation is supported!
     * If you need other types of interpolation, you will need to
     * implement them yourselves.
     * @param entity The entity to update the value of
     * @param passedTime Current time in animation, in seconds
     */
    update(entity: Entity, passedTime: number) {
        if (this.keyframes.length === 0) {
            return;
        }

        if (passedTime < this.previousTime) {
            this._findKeyframe(passedTime);
        }

        while (
            this.keyframeIndex < this.keyframes.length - 1 &&
            passedTime >= this.keyframes[this.keyframeIndex + 1].time
        ) {
            this.keyframeIndex = this.keyframeIndex + 1;
        }
        this.previousTime = passedTime;

        const startKeyframe = this.keyframes[this.keyframeIndex];
        const endKeyframe = this.keyframes[Math.min(this.keyframeIndex + 1, this.keyframes.length - 1)]
        const interval = endKeyframe.time - startKeyframe.time;
        const t = interval > 0
            ? clamp((passedTime - startKeyframe.time) / interval, 0, 1)
            : 0;

        const transform = entity.getComponent(Transform);
        if (!transform) {
            return;
        }

        if (this.target === KeyframeTarget.Translation) {
            transform.location = vec3.lerp(transform.location, startKeyframe.value, endKeyframe.value, t);
        } else if (this.target === KeyframeTarget.Rotation) {
            transform.rotation = quat.slerp(transform.rotation, startKeyframe.value, endKeyframe.value, t);
        } else if (this.target === KeyframeTarget.Scale) {
            transform.scale = vec3.lerp(transform.scale, startKeyframe.value, endKeyframe.value, t);
        }
    }
}

/**
 * 
 */
export class KeyframeAnimation implements Component {
    name: string;
    channels: KeyframeAnimationChannel[];
    // Whether the animation repeats after reaching its end.
    // This currently repeats all channels.
    isLooping: boolean;
    isPaused: boolean;

    passedTime: number;
    duration: number;

    constructor(
        name: string,
        channels: KeyframeAnimationChannel[],
        isLooping: boolean,
        isPaused: boolean
    ) {
        this.name = name;
        this.channels = channels;
        this.isLooping = isLooping;
        this.isPaused = isPaused;
        this.passedTime = 0.0;
        // We compute full animation duration from keyframe data,
        // taking the duration of the longest channel.
        this.duration = 0.0;
        for (const channel of channels) {
            const keyframes = channel.keyframes;
            if (keyframes.length !== 0) {
                this.duration = Math.max(keyframes[keyframes.length - 1].time, this.duration);
            }
        }
    }

    /**
     * Plays the entire animation.
     */
    play() {
        this.isPaused = false;
    }

    /**
     * Pauses the animation.
     */
    pause() {
        this.isPaused = true;
    }

    /**
     * Resets the animation to the beginning.
     */
    reset() {
        this.passedTime = 0;
    }

    /**
     * Updates the animated data based on passed time.
     * @param dt Time duration from previous frame to this one, in seconds
     */
    update(dt: number, entity: Entity) {
        if (this.isPaused) {
            return;
        }

        if (this.passedTime > this.duration && this.isLooping) {
            this.passedTime = 0.0;
        }

        for (const channel of this.channels) {
            channel.update(entity, this.passedTime);
        }

        this.passedTime += dt;
    }
}

/**
 * The component that handles the keyframed animations of the entity.
 * Currently only supports animation of {@link Transform} properties.
 */
export class KeyframeAnimations implements Component {
    animations: Map<string, KeyframeAnimation>;
    entity: Entity;

    constructor(entity: Entity) {
        this.animations = new Map();
        this.entity = entity;
    }

    /**
     * Adds a keyframed animation into animation pool.
     * The animation is stored under its name.
     * @param animation keyframed animation
     */
    addAnimation(animation: KeyframeAnimation) {
        this.animations.set(animation.name, animation);
    }

    /**
     * Plays an animation. The animation should be
     * specified by its name.
     * @param name name of the animation
     */
    playAnimation(name: string) {
        this.animations.get(name)?.play();
    }

    /**
     * Pauses an animation. The animation should be
     * specified by its name.
     * @param name name of the animation
     */
    pauseAnimation(name: string) {
        this.animations.get(name)?.pause();
    }

    /**
     * Resets an animation to the beginning.
     * The animation should be specified by its name.
     * @param name name of the animation
     */
    resetAnimation(name: string) {
        this.animations.get(name)?.reset();
    }

    /**
     * Updates all active animations.
     * @param dt time difference from the last frame
     */
    update(dt: number) {
        for (const animation of this.animations.values()) {
            animation.update(dt, this.entity);
        }
    }
}