import { vec4 } from "gl-matrix";
import type { Component } from "./Component.ts";
import { Mesh } from "./components/Mesh.ts";
import { Transform, TransformType } from "./components/Transform.ts";
import { BasicMaterial, Material } from "./data/Material.ts";
import { Entity } from "./Entity.ts";
import { Primitive } from "./data/Primitive.ts";



/**
 * This is an auxiliary type needed in some function inputs that require
 * passing component types, e.g. Scene.getEntitiesByComponent
 */
export type ComponentConstructor<T extends Component = Component> = new (...args: any[]) => T;
export type MaterialConstructor<T extends Material = Material> = new (...args: any[]) => T;


/**
 * Creates a cube entity.
 * @returns An entity with mesh and transform
 */
export async function createCube() {
    const vertices = new Float32Array([
        -1, -1, -1,     0, 0, 0,    0, 0,   0, 0, 0,
        -1, -1,  1,     0, 0, 1,    0, 1,   0, 0, 0,
        -1,  1, -1,     0, 1, 0,    1, 0,   0, 0, 0,
        -1,  1,  1,     0, 1, 1,    1, 1,   0, 0, 0,
         1, -1, -1,     1, 0, 0,    0, 0,   0, 0, 0,
         1, -1,  1,     1, 0, 1,    0, 1,   0, 0, 0,
         1,  1, -1,     1, 1, 0,    1, 0,   0, 0, 0,
         1,  1,  1,     1, 1, 1,    1, 1,   0, 0, 0,
    ]);

    const indices = new Uint32Array([
        0, 1, 2,    2, 1, 3,
        4, 0, 6,    6, 0, 2,
        5, 4, 7,    7, 4, 6,
        1, 5, 3,    3, 5, 7,
        6, 2, 7,    7, 2, 3,
        1, 0, 5,    5, 0, 4,
    ]);
    
    const texture = await createTempTexture([1, 1, 1, 1]);
    const material = new BasicMaterial(texture, vec4.fromValues(0.5, 1, 0, 1));

    const cube = new Entity();
    const mesh = new Mesh();
    mesh.addPrimitive(new Primitive(vertices, indices, material));
    const transform = new Transform(TransformType.Free);
    cube.addComponent(mesh);
    cube.addComponent(transform);
    return cube;
}


/**
 * Creates a texture image of the size of 1 pixel.
 * The function returns a promise.
 * @param color color of the 1-pixel texture
 * @returns an image bitmap
 */
export async function createTempTexture(color?: vec4) {
    const raw = new Uint8ClampedArray(4);
    const col = color ?? vec4.fromValues(1, 0, 0, 1);
    raw[0] = col[0] * 255;
    raw[1] = col[1] * 255;
    raw[2] = col[2] * 255;
    raw[3] = col[3] * 255;
    const texture = new ImageData(raw, 1, 1);
    const bitmap = await createImageBitmap(texture);
    return bitmap;
}