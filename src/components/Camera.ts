import { mat4 } from "gl-matrix";
import type { Component } from "../Component.ts";

/**
 * A camera component. Stores projection transformations
 * and camera's GPU buffer. See getters and setters to
 * find out how changes in projection are handled.
 * 
 * NOTE: Currently only supports perspective projection!
 * Extend yourselves if you need orthographic camera.
 */
export class Camera implements Component {
    private _aspect: number;    // aspect=width/height (of viewing plane)
    private _fovy: number;      // vertical field of view angle (in radians)
    private _near: number;      // distance of near plane
    private _far: number;       // distance of far plane

    private _perspectiveMatrix: mat4;
    // _isDirty marks that there was a change in camera parameters
    // but _perspectiveMatrix is not yet updated
    private _isDirty: boolean;

    cameraBuffer: GPUBuffer | null = null;

    constructor(aspect: number, fovy: number, near: number, far: number) {
        this._aspect = aspect;
        this._fovy = fovy;
        this._near = near;
        this._far = far;

        this._perspectiveMatrix = mat4.create();
        this._isDirty = true;
    }

    set aspect(aspect: number) {
        this._aspect = aspect;
        this._isDirty = true;
    }

    get aspect(): number {
        return this._aspect;
    }

    set fovy(fovy: number) {
        this._fovy = fovy;
        this._isDirty = true;
    }

    get fovy(): number {
        return this._fovy;
    }

    set near(near: number) {
        this._near = near;
        this._isDirty = true;
    }

    get near(): number {
        return this._near;
    }

    set far(far: number) {
        this._far = far;
        this._isDirty = true;
    }

    get far(): number {
        return this._far;
    }

    get perspectiveProjection(): mat4 {
        if (this._isDirty) {
            mat4.perspectiveZO(
                this._perspectiveMatrix,
                this._fovy,
                this._aspect,
                this._near,
                this._far
            )
            this._isDirty = false;
        }
        return this._perspectiveMatrix;
    }
}