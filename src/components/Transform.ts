import { mat4, quat, vec3 } from "gl-matrix";
import type { Component } from "../Component.ts";

/**
 * The transform type specifies how the attributes
 * of the Transform component are interpreted.
 * LookAt is sometimes used with camera and
 * its local matrix is actually an inverse!
 */
export enum TransformType {
    Free,   // Uses _location, _rotation, and _scale to construct a transform
    LookAt  // Uses _location, _target, and _up to construct a matrix that points towards the target
}

/**
 * A transformation component.
 */
export class Transform implements Component {
    transformType: TransformType;
    
    private _location: vec3;    // position of the object
    private _rotation: quat;    // rotation of the object
    private _scale: vec3;       // scale of the object

    private _target: vec3;      // (look-at) what the object looks toward
    private _up: vec3;          // (look-at) where does the upward axis of the object point to

    private _localMatrix: mat4; // object's local matrix
    private _worldMatrix: mat4; // object's global matrix that accounts for its parent's transform (should be computed inside a system)
    private _isDirty: boolean;  // marks that the local matrix should be recomputed

    uniformBuffer: GPUBuffer | null = null;

    constructor(transformType: TransformType) {
        this._location = vec3.fromValues(0, 0, 0);
        this._rotation = quat.fromValues(0, 0, 0, 1);
        this._scale = vec3.fromValues(1, 1, 1);

        this._target = vec3.fromValues(0, 0, 0);
        this._up = vec3.fromValues(0, 0, 1);

        this._localMatrix = mat4.create();
        this._worldMatrix = mat4.create();
        this._isDirty = true;
        this.transformType = transformType;
    }

    get location(): vec3 {
        return this._location;
    }

    set location(location: vec3) {
        this._location = location;
        this._isDirty = true;
    }

    get rotation(): quat {
        return this._rotation;
    }

    set rotation(rotation: quat) {
        this._rotation = rotation;
        this._isDirty = true;
    }

    get scale(): vec3 {
        return this._scale;
    }

    set scale(scale: vec3) {
        this._scale = scale;
        this._isDirty = true;
    }

    get target(): vec3 {
        return this._target;
    }

    set target(target: vec3) {
        this._target = target;
        this._isDirty = true;
    }

    get up(): vec3 {
        return this._up;
    }

    set up(up: vec3) {
        this._up = up;
        this._isDirty = true;
    }

    get isDirty() {
        return this._isDirty;
    }

    get localMatrix(): mat4 {
        if (this._isDirty) {
            switch(this.transformType) {
                case TransformType.Free:
                    mat4.fromRotationTranslationScale(
                        this._localMatrix,
                        this._rotation,
                        this._location,
                        this._scale
                    )
                    break;
                
                case TransformType.LookAt:
                    mat4.lookAt(
                        this._localMatrix,
                        this._location,
                        this._target,
                        this._up
                    );
                    break;
            }
            this._isDirty = false;
        }
        return this._localMatrix;
    }

    get worldMatrix() {
        return this._worldMatrix;
    }

    get viewMatrix() {
        switch(this.transformType) {
            case TransformType.Free:
                try {
                    // May throw an error if scale is (0, 0, 0)
                    return mat4.invert(mat4.create(), this._worldMatrix);
                } catch {
                    return mat4.create();
                }
            case TransformType.LookAt:
                return this._worldMatrix;
        }
    }
}