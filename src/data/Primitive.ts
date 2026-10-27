import type { Material } from "./Material.ts";


/**
 * The smallest unit of the model.
 * Mesh is composed of primitives.
 * Each primitive has its own material
 * and stores all GPU buffer data as well.
 */
export class Primitive {
    vertices: Float32Array;
    indices: Uint32Array | Uint16Array;
    material: Material;
    skinVertices: ArrayBuffer | null;

    vertexBuffer: GPUBuffer | null = null;
    skinVertexBuffer: GPUBuffer | null = null;
    indexBuffer: GPUBuffer | null = null;

    constructor(vertices: Float32Array, indices: Uint32Array | Uint16Array, material: Material, skinVertices: ArrayBuffer | null = null) {
        this.vertices = vertices;
        this.indices = indices;
        this.material = material;
        this.skinVertices = skinVertices;
    }
}