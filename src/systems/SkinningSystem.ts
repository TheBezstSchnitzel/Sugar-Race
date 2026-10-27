import { mat4 } from "gl-matrix";
import { Skin } from "../components/Skin.ts";
import { Transform } from "../components/Transform.ts";
import type { Entity } from "../Entity.ts";
import type { Scene } from "../Scene.ts";


function _computeSkinForEntity(entity: Entity) {
    const skin = entity.getComponent(Skin);
    if (!skin) {
        return;
    }

    const transform = entity.getComponent(Transform);
    if (!transform) {
        return;
    }

    const inverseWorld = mat4.invert(
        mat4.create(),
        transform.worldMatrix
    );

    if (!inverseWorld) {
        return;
    }

    for (let i = 0; i < skin.joints.length; i++) {
        const joint = skin.joints[i];
        const jointTransform = joint.getComponent(Transform);
        if (!jointTransform) {
            console.warn(`Joint transform of joint ${i} of entity ${entity.name} is missing!`);
            continue;
        }

        const jointMatrix = skin.jointMatrices.subarray(i * 16, (i + 1) * 16);
        mat4.multiply(jointMatrix, jointTransform.worldMatrix, skin.inverseBindMatrices[i]);
        mat4.multiply(jointMatrix, inverseWorld, jointMatrix);
    }
}


/**
 * The system that computes deformation
 * matrices of the bones for entities
 * that have skeleton animation (skinning).
 * @param scene the scene
 */
export function computeSkins(scene: Scene) {
    for (const entity of scene.entities) {
        _computeSkinForEntity(entity);
    }
}