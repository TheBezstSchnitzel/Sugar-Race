import { Camera } from "../components/Camera.ts";
import { Transform } from "../components/Transform.ts";
import type { RenderState } from "../RenderState.ts";
import type { Scene } from "../Scene.ts";
import { Mesh } from "../components/Mesh.ts";
import type { Entity } from "../Entity.ts";
import { BasicMaterial } from "../data/Material.ts";
import { Skin } from "../components/Skin.ts";

export function _writeCameraBuffer(state: RenderState, entity: Entity) {
    const camera = entity.getComponent(Camera);
    const transform = entity.getComponent(Transform);

    if (!camera) {
        return;
    }
    if (!transform) {
        console.warn("Error while writing buffers: Active camera does not have a transform! Ignoring...");
        return;
    }
    const viewMatrix = transform.viewMatrix;

    if (camera.cameraBuffer) {
        state.device.queue.writeBuffer(camera.cameraBuffer, 0, viewMatrix);
        state.device.queue.writeBuffer(camera.cameraBuffer, 64, camera.perspectiveProjection);
    } else {
        console.warn("Camera buffer was not initialized! Ignoring...");
    }
}

export function _writeTransformBuffer(state: RenderState, entity: Entity) {
    const transform = entity.getComponent(Transform);
    if (!transform) {
        return;
    }

    if (transform.uniformBuffer) {
        state.device.queue.writeBuffer(transform.uniformBuffer, 0, transform.worldMatrix);
    } else {
        console.warn("Transform buffer was not initialized! Ignoring...");
    }
}

export function _writeMeshBuffers(state: RenderState, entity: Entity) {
    const mesh = entity.getComponent(Mesh);
    if (!mesh) {
        return;
    }

    for (const primitives of mesh.primitives.values()) {
        for (const primitive of primitives) {
            if (primitive.vertexBuffer) {
                state.device.queue.writeBuffer(primitive.vertexBuffer, 0, primitive.vertices);
            } else {
                console.warn("Vertex buffer not initialized!");
            }
        
            if (primitive.indexBuffer) {
                state.device.queue.writeBuffer(primitive.indexBuffer, 0, primitive.indices);
            } else {
                console.warn("Index buffer not initialized!");
            }
        
            if (primitive.skinVertexBuffer) {
                state.device.queue.writeBuffer(primitive.skinVertexBuffer, 0, primitive.skinVertices);
            }
        }
    }

}

export function _writeSkinBuffer(state: RenderState, entity: Entity) {
    const skin = entity.getComponent(Skin);
    if (!skin) {
        return;
    }

    if (skin.jointMatricesBuffer) {
        state.device.queue.writeBuffer(skin.jointMatricesBuffer, 0, skin.jointMatrices);
    } else {
        console.warn("Joint matrix buffer not initialized!");
    }
}

export function _writeMaterialBuffer(state: RenderState, entity: Entity) {
    const mesh = entity.getComponent(Mesh);
    if (!mesh) {
        return;
    }

    const primitives = mesh.getPrimitivesByMaterial(BasicMaterial) ?? [];
    for (const primitive of primitives) {
        const material = primitive.material as BasicMaterial;
        if (!material.uniformBuffer) {
            console.warn("Material buffer not initialized!");
            continue;
        }

        state.device.queue.writeBuffer(material.uniformBuffer, 0, material.baseColor);
    }
}

/**
 * The system that writes the data to the GPU buffers of the scene.
 * Only camera buffers, transform buffers, and skin buffers are
 * written by default.
 * @param state the render state
 * @param scene the current scene
 */
export function updateBuffers(state: RenderState, scene: Scene) {
    // We only update buffers that likely change every frame.
    // Change if your buffer update requirements are different.
    for (const entity of scene.entities) {
        _writeCameraBuffer(state, entity);
        _writeTransformBuffer(state, entity);
        _writeSkinBuffer(state, entity);
    }
}