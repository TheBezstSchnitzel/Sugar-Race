import { mat4 } from "gl-matrix";
import { Transform } from "../components/Transform.ts";
import type { Entity } from "../Entity.ts";
import type { Scene } from "../Scene.ts";


function _computeTransformForEntity(entity: Entity, alreadyComputed: Set<Entity>) {
    if (alreadyComputed.has(entity)) {
        return;
    }

    const transform = entity.getComponent(Transform);
    if (!transform) {
        alreadyComputed.add(entity);
        return;
    }

    if (entity.parent) {
        const parentTransform = entity.parent.getComponent(Transform);
        if (parentTransform) {
            _computeTransformForEntity(entity.parent, alreadyComputed);
            mat4.multiply(
                transform.worldMatrix,
                parentTransform.worldMatrix,
                transform.localMatrix
            );
        } else {
            // Here we assume that parent without transform does not
            // have a parent with transform.
            mat4.copy(transform.worldMatrix, transform.localMatrix);
        }
    } else {
        mat4.copy(transform.worldMatrix, transform.localMatrix);
    }

    alreadyComputed.add(entity);
}


/**
 * A system that computes all global transformations
 * in the scene.
 * @param scene the scene 
 */
export function computeTransforms(scene: Scene) {
    const alreadyComputed: Set<Entity> = new Set();
    for (const entity of scene.entities) {
        _computeTransformForEntity(entity, alreadyComputed);
    }
}