import { Camera } from "../components/Camera.ts";
import { Mesh } from "../components/Mesh.ts";
import { BasicMaterial } from "../data/Material.ts";
import { UnlitRenderer } from "../renderers/UnlitRenderer.ts";
import type { RenderState } from "../RenderState.ts";
import type { Scene } from "../Scene.ts";


/**
 * A system that prepares the render state for rendering.
 * Prepares textures and renderers.
 * @param state render state
 * @param scene current scene
 */
export async function prepareRendering(state: RenderState, scene: Scene) {
    console.log("Preparing textures...");

    for (const entity of scene.entities) {
        const mesh = entity.getComponent(Mesh);
        if (mesh) {
            const primitives = mesh.getPrimitivesByMaterial(BasicMaterial) ?? [];
            for (const primitive of primitives) {
                const material = primitive.material as BasicMaterial;
                const image = material.baseTexture;
                state.createImageTexture(image);
            }
        }
    }


    console.log("Preparing renderers...");
    
    // Unlit renderer
    const camera = scene.getEntitiesByComponent(Camera)[0];
    const unlitRenderer = new UnlitRenderer(
        scene,
        camera,
        state.sceneDepthTexture.texture.format,
        state.canvasFormat,
        state
    );
    state.unlitRenderer = unlitRenderer;
}