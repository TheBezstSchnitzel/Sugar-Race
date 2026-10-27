import type { RenderState } from "../RenderState.ts";
import type { Scene } from "../Scene.ts";


/**
 * A system that renders the given scene.
 * @param state render state
 * @param scene the scene
 */
export function render(state: RenderState, scene: Scene) {
    const canvasTexture = state.context.getCurrentTexture();
    const depthView = state.sceneDepthTexture.view;

    const commandEncoder = state.device.createCommandEncoder();

    const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
            view: canvasTexture.createView(),
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: [0.3, 0.6, 0.8, 1.0]
        }],
        depthStencilAttachment: {
            view: depthView,
            depthStoreOp: 'discard',
            depthLoadOp: 'clear',
            depthClearValue: 1,
            depthReadOnly: false,
        }
    });

    state.unlitRenderer?.render(renderPass, scene);

    renderPass.end();
    state.device.queue.submit([commandEncoder.finish()]);
}