import type { UnlitRenderer } from "./renderers/UnlitRenderer.ts";


/**
 * A bundle of render texture and its view, used for texture storage.
 */
export interface RenderTexture {
    texture: GPUTexture;
    view: GPUTextureView;
}


/**
 * A structure that stores rendering data and interfaces.
 */
export class RenderState {
    device: GPUDevice;

    // Canvas
    
    canvas: HTMLCanvasElement;
    context: GPUCanvasContext;
    canvasFormat: GPUTextureFormat;

    // Textures

    sceneDepthTexture: RenderTexture;
    imageTextures: Map<ImageBitmap, RenderTexture> = new Map();
    // NOTE: Only a single default sampler is used!
    // You will need to modify this if you want to use a different sampler for some textures.
    sampler: GPUSampler;

    // Renderers

    unlitRenderer: UnlitRenderer | null = null;


    constructor(device: GPUDevice, canvas: HTMLCanvasElement) {
        this.device = device;
        this.canvas = canvas;

        // Configure context

        const context = this.canvas.getContext('webgpu');
        if (!context) {
            throw Error("Could not get WebGPU context!");
        }

        this.context = context;
        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.canvasFormat
        });

        // Initialize textures

        const sceneDepthTexture = this.device.createTexture({
            label: 'sceneDepthTexture',
            format: 'depth24plus',
            size: [this.canvas.width, this.canvas.height],
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        const sceneDepthTextureview = sceneDepthTexture.createView();
        this.sceneDepthTexture = { texture: sceneDepthTexture, view: sceneDepthTextureview };

        this.sampler = this.device.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat'
        });
    }

    /**
     * Creates and stores a new texture from existing image.
     * Also creates the corresponding texture view.
     * @param image An image to store into texture
     */
    createImageTexture(image: ImageBitmap) {
        if (this.imageTextures.has(image)) {
            return;
        }
        
        const texture = this.device.createTexture({
            format: 'rgba8unorm',
            size: [image.width, image.height],
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
        });
        const view = texture.createView();
        this.imageTextures.set(image, { texture, view });
        this.device.queue.copyExternalImageToTexture(
            { source: image },
            { texture },
            [image.width, image.height]
        );
    }

    /**
     * Retrieves the GPU texture that holds the provided image.
     * The function may return `undefined` if the texture
     * was not yet created for the provided image.
     * @param image An image to find the GPU texture for
     * @returns Texture and its view, if they exist for the image (of type {@link RenderTexture})
     */
    getMaterialTexture(image: ImageBitmap): RenderTexture | undefined {
        return this.imageTextures.get(image);
    }

    /**
     * Updates the canvas specific textures (e.g., canvas texture,
     * depth texture), and reconfigures the canvas context.
     * @param width Canvas width
     * @param height Canvas height
     */
    updateRenderTextureSizes(width: number, height: number) {
        this.sceneDepthTexture.texture.destroy();

        this.sceneDepthTexture.texture = this.device.createTexture({
            label: 'sceneDepthTexture',
            format: 'depth24plus',
            size: [width, height],
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.sceneDepthTexture.view = this.sceneDepthTexture.texture.createView();

        this.canvas.width = width;
        this.canvas.height = height;

        this.context.configure({
            device: this.device,
            format: this.canvasFormat
        });
    }
}