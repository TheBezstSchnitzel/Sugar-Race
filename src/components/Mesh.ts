import type { Component } from "../Component.ts";
import type { Primitive } from "../data/Primitive.ts";
import type { MaterialConstructor } from "../Utils.ts";


/**
 * The mesh component, holding the renderable 3D model data
 * and corresponding GPU vertex/index buffers.
 */
export class Mesh implements Component {
    primitives: Map<MaterialConstructor, Primitive[]> = new Map();

    constructor() {}

    /**
     * Adds a primitive to mesh.
     * @param primitive primitive to add
     */
    addPrimitive(primitive: Primitive) {
        const constructor = primitive.material.constructor as MaterialConstructor;
        if (this.primitives.has(constructor)) {
            this.primitives.get(constructor)?.push(primitive);
        } else {
            this.primitives.set(constructor, [primitive]);
        }
    }

    /**
     * Gets all primitives in the mesh that contain material of that type.
     * @param materialType constructor of the material
     * @returns list of primitives or `undefined` if none of this type exist on the mesh
     */
    getPrimitivesByMaterial(materialType: MaterialConstructor) {
        return this.primitives.get(materialType);
    }
}