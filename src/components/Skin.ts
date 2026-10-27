import type { mat4 } from "gl-matrix";
import type { Component } from "../Component.ts";
import type { Entity } from "../Entity.ts";

/**
 * This defines the skeleton on the mesh
 * that can be animated.
 */
export class Skin implements Component {
    joints: Entity[];   // bones of the skeleton
    inverseBindMatrices: mat4[];    // transforms mesh coordinates to the space of the bones

    jointMatrices: Float32Array;    // transforms of the bones to use in the shader
    jointMatricesBuffer: GPUBuffer | null = null;

    constructor(joints: Entity[], inverseBindMatrices: mat4[]) {
        this.joints = joints;
        this.inverseBindMatrices = inverseBindMatrices;
        this.jointMatrices = new Float32Array(joints.length * 16);
    }
}