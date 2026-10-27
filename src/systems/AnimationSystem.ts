import type { Entity } from "../Entity.ts";
import type { Scene } from "../Scene.ts";
import { KeyframeAnimations } from "../components/KeyframeAnimation.ts";
import { ProceduralAnimation } from "../components/ProceduralAnimation.ts";

/**
 * A system that updates animated entities.
 * @param scene the collection of entities to update
 * @param dt the duration between previous and current frame (in seconds)
 */
export function animate(scene: Scene, dt: number) {
    const proceduralAnimatables = scene.getEntitiesByComponent(ProceduralAnimation);
    for (const animatable of proceduralAnimatables) {
        const animation = animatable.getComponent(ProceduralAnimation)!;
        animation.update(dt);
    }

    const keyframeAnimatables = scene.getEntitiesByComponent(KeyframeAnimations);
    for (const animatable of keyframeAnimatables) {
        const animation = animatable.getComponent(KeyframeAnimations)!;
        animation.update(dt);
    }
}


/**
 * Activates the animation with given name on this entity
 * and all its descendents. Can be used for e.g. skeletons.
 * @param scene the current scene
 * @param entity the top entity
 * @param name name of the animation
 */
export function playAnimation(scene: Scene, entity: Entity, name: string) {
    const animation = entity.getComponent(KeyframeAnimations);
    animation?.playAnimation(name);

    for (const e of scene.entities) {
        if (e.parent === entity) {
            playAnimation(scene, e, name);
        }
    }
}


/**
 * Pauses the animation with given name on this entity
 * and all its descendents. Can be used for e.g. skeletons.
 * @param scene the current scene
 * @param entity the top entity
 * @param name name of the animation
 */
export function pauseAnimation(scene: Scene, entity: Entity, name: string) {
    const animation = entity.getComponent(KeyframeAnimations);
    animation?.pauseAnimation(name);

    for (const e of scene.entities) {
        if (e.parent === entity) {
            pauseAnimation(scene, e, name);
        }
    }
}


/**
 * Resets the animation with given name on this entity
 * and all its descendents. Can be used for e.g. skeletons.
 * @param scene the current scene
 * @param entity the top entity
 * @param name name of the animation
 */
export function resetAnimation(scene: Scene, entity: Entity, name: string) {
    const animation = entity.getComponent(KeyframeAnimations);
    animation?.resetAnimation(name);

    for (const e of scene.entities) {
        if (e.parent === entity) {
            resetAnimation(scene, e, name);
        }
    }
}