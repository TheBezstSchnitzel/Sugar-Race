import { Camera } from "../components/Camera.ts";
import { Transform } from "../components/Transform.ts";
import type { Entity } from "../Entity.ts";
import type { RenderState } from "../RenderState.ts";
import type { Scene } from "../Scene.ts";
import { Mesh } from "../components/Mesh.ts";
import { BasicMaterial, Material } from "../data/Material.ts";
import { _writeCameraBuffer, _writeMaterialBuffer, _writeMeshBuffers, _writeSkinBuffer, _writeTransformBuffer } from "./BufferUpdateSystem.ts";
import { Skin } from "../components/Skin.ts";

function _createCameraBuffers(state: RenderState, cameraEntity: Entity) {
    const camera = cameraEntity.getComponent(Camera);
    if (!camera) {
        return;
    }

    let projectionViewMatricesSize = 2 * 16 * 4;
    camera.cameraBuffer = state.device.createBuffer({
        size: projectionViewMatricesSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
    });
}

function _createSkinBuffer(state: RenderState, entity: Entity) {
    const skin = entity.getComponent(Skin);
    if (!skin) {
        return;
    }

    let jointMatrixSize = 16 * 4 * skin.joints.length;
    skin.jointMatricesBuffer = state.device.createBuffer({
        size: jointMatrixSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
    });
}

function _createTransformBuffers(state: RenderState, entity: Entity) {
    const transform = entity.getComponent(Transform);
    if (!transform) {
        return;
    }

    let transformMatrixSize = 16 * 4;
    transform.uniformBuffer = state.device.createBuffer({
        size: transformMatrixSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
    });
}

function _createMeshBuffer(state: RenderState, entity: Entity) {
    const mesh = entity.getComponent(Mesh);
    if (!mesh) {
        return;
    }

    for (const primitives of mesh.primitives.values()) {
        for (const primitive of primitives) {
            primitive.vertexBuffer = state.device.createBuffer({
                size: primitive.vertices.byteLength,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX
            });
            // This could cause an error
            // if primitive.indices.byteLength is not a multiple of 4
            primitive.indexBuffer = state.device.createBuffer({
                size: primitive.indices.byteLength,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX
            });
        
            if (primitive.skinVertices) {
                let skinVertexBufferSize = primitive.skinVertices.byteLength;
                primitive.skinVertexBuffer = state.device.createBuffer({
                    size: skinVertexBufferSize,
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
                });
            }
        
            let material = primitive.material;
            createMateralBuffer(state, material);
        }
    }

}

function createMateralBuffer(state: RenderState, material: Material) {
    if (material instanceof BasicMaterial) {
        material.uniformBuffer = state.device.createBuffer({
            size: 4 * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });
    }
}

/**
 * A system that creates all GPU buffers for the scene.
 * The system also writes initial data to the buffers.
 * @param state render state instance
 * @param scene current scene
 */
export function createBuffers(state: RenderState, scene: Scene) {
    for (const entity of scene.entities) {
        _createCameraBuffers(state, entity);
        _createTransformBuffers(state, entity);
        _createMeshBuffer(state, entity);
        _createSkinBuffer(state, entity);
    }

    for (const entity of scene.entities) {
        _writeMeshBuffers(state, entity);
        _writeMaterialBuffer(state, entity);
        _writeCameraBuffer(state, entity);
        _writeTransformBuffer(state, entity);
        _writeSkinBuffer(state, entity);
    }
}