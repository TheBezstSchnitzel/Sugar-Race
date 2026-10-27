import type { Component } from "../Component.ts";
import type { Entity } from "../Entity.ts";


/**
 * The type that defines what kind of functions
 * are allowed as procedural animations.
 */
type ProceduralAnimationFunction = {
    (
        entity: Entity,         // the entity to animate
        dt: number,             // duration between previous and this frame (in seconds)
        passedTime: number,     // current time in animation (in seconds)
        duration: number        // overall animation duration (in seconds)
    ): void
};


/**
 * The channel of procedural animation,
 * holding a specific animation function
 * and other animation properties.
 */
export class ProceduralAnimationChannel {
    animation: ProceduralAnimationFunction;
    duration: number;
    passedTime: number;
    isCyclic: boolean;
    isPaused: boolean;

    constructor(
        animation: ProceduralAnimationFunction,
        duration: number,
        isCyclic: boolean
    ) {
        this.animation = animation;
        this.duration = duration;
        this.passedTime = 0;
        this.isCyclic = isCyclic;
        this.isPaused = true;
    }

    /**
     * Plays/resumes the animation.
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
     * Updates the animation.
     * @param entity The entity to animate
     * @param dt Duration between previous and current frame (in seconds)
     */
    update(entity: Entity, dt: number) {
        if (this.isPaused) {
            return;
        }

        if (this.isCyclic) {
            this.passedTime = this.passedTime % this.duration;
        }
        if (this.passedTime > this.duration) {
            return;
        }

        this.animation(entity, dt, this.passedTime, this.duration);

        this.passedTime += dt;
    }
}


/**
 * A component for procedural animation of entities.
 */
export class ProceduralAnimation implements Component {
    channels: ProceduralAnimationChannel[];
    entity: Entity;

    constructor(channels: ProceduralAnimationChannel[], entity: Entity) {
        this.entity = entity;
        this.channels = channels;
    }

    playAll() {
        for (const channel of this.channels) {
            channel.play();
        }
    }

    pauseAll() {
        for (const channel of this.channels) {
            channel.pause();
        }
    }

    update(dt: number) {
        for (const channel of this.channels) {
            channel.update(this.entity, dt);
        }
    }
}