import { Camera } from "../components/Camera.ts";
import { Mesh } from "../components/Mesh.ts";
import { Skin } from "../components/Skin.ts";
import { Transform } from "../components/Transform.ts";
import { BasicMaterial, Material } from "../data/Material.ts";
import type { Entity } from "../Entity.ts";
import type { RenderState } from "../RenderState.ts";
import type { Scene } from "../Scene.ts";
import shaderCode from "../shaders/Unlit.wgsl?raw";


/**
 * A simple renderer that uses an unlit shader (Unlit.wgsl)
 * to render textured objects
 */
export class UnlitRenderer {
    pipeline: GPURenderPipeline;        // for objects without skeleton
    skinnedPipeline: GPURenderPipeline; // for objects with skeleton

    // Bind groups are constructed based on the level of change
    // during the render pass execution: frame bind group is set
    // once per render invocation, model bind group is set once for each
    // entity, and material bind group is set for each material
    // (pipeline). Skin bind group binds skeleton data.
    frameBindGroup: GPUBindGroup;
    modelBindGroups: Map<Entity, GPUBindGroup> = new Map();
    materialBindGroups: Map<Material, GPUBindGroup> = new Map();
    skinBindGroups: Map<Entity, GPUBindGroup> = new Map();

    constructor(
        scene: Scene,
        camera: Entity,
        depthTextureFormat: GPUTextureFormat,
        outputTextureFormat: GPUTextureFormat,
        renderState: RenderState
    ) {
        if (!camera) {
            throw Error("No camera provided to Unlit Renderer!");
        }

        // Bind Group Layouts

        const cameraBindGroupLayout = renderState.device.createBindGroupLayout({
            label: 'UnlitCameraLayout',
            entries: [{
                binding: 0,  // View + Projection matrix
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' }
            }]
        });

        const modelBindGroupLayout = renderState.device.createBindGroupLayout({
            label: 'UnlitModelLayout',
            entries: [{
                binding: 0, // Model matrix
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' }
            }]
        });

        const materialBindGroupLayout = renderState.device.createBindGroupLayout({
            label: 'UnlitMaterialLayout',
            entries: [
                {
                    binding: 0,  // Material uniforms
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: 'unfilterable-float',
                        viewDimension: '2d',
                        multisampled: false
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: 'non-filtering'
                    }
                }
            ]
        });

        const skinBindGroupLayout = renderState.device.createBindGroupLayout({
            label: 'UnlitSkinLayout',
            entries: [{
                binding: 0, // Joint matrices
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: 'read-only-storage' }
            }]
        });

        // Pipeline

        const pipelineLayout = renderState.device.createPipelineLayout({
            bindGroupLayouts: [
                cameraBindGroupLayout,
                modelBindGroupLayout,
                materialBindGroupLayout
            ]
        });

        const skinnedPipelineLayout = renderState.device.createPipelineLayout({
            bindGroupLayouts: [
                cameraBindGroupLayout,
                modelBindGroupLayout,
                materialBindGroupLayout,
                skinBindGroupLayout
            ]
        });

        const shaderModule = renderState.device.createShaderModule({
            label: 'UnlitShader',
            code: shaderCode
        });
        const vertexLayout: GPUVertexBufferLayout = {
            arrayStride: 44,
            attributes: [
                {
                    shaderLocation: 0,  // Position
                    format: 'float32x3',
                    offset: 0,
                },
                {
                    shaderLocation: 1,  // Normal
                    format: 'float32x3',
                    offset: 12,
                },
                {
                    shaderLocation: 2,  // Texture coordinates
                    format: 'float32x2',
                    offset: 24,
                },
                {
                    shaderLocation: 3,  // Tangent
                    format: 'float32x3',
                    offset: 32,
                },
            ],
        };
        this.pipeline = renderState.device.createRenderPipeline({
            label: 'UnlitPipeline',
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: 'vertex',
                buffers: [
                    vertexLayout
                ]
            },
            fragment: {
                module: shaderModule,
                targets: [{ format: outputTextureFormat }]
            },
            depthStencil: {
                format: depthTextureFormat,
                depthWriteEnabled: true,
                depthCompare: 'less'
            }
        });

        
        this.skinnedPipeline = renderState.device.createRenderPipeline({
            label: 'UnlitSkinnedPipeline',
            layout: skinnedPipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: 'vertexSkinned',
                buffers: [
                    vertexLayout,
                    {
                        arrayStride: 32,
                        attributes: [
                            { shaderLocation: 4, format: 'uint32x4', offset: 0 },
                            { shaderLocation: 5, format: 'float32x4', offset: 16 },
                        ]
                    }
                ]
            },
            fragment: {
                module: shaderModule,
                targets: [{ format: outputTextureFormat }]
            },
            depthStencil: {
                format: depthTextureFormat,
                depthWriteEnabled: true,
                depthCompare: 'less'
            }
        });

        // Bind Groups

        const cameraComponent = camera.getComponent(Camera);
        if (!cameraComponent || !cameraComponent.cameraBuffer) {
            throw Error("Provided entity is not a valid camera!");
        }
        this.frameBindGroup = renderState.device.createBindGroup({
            layout: cameraBindGroupLayout,
            entries: [{
                binding: 0,
                resource: cameraComponent.cameraBuffer
            }]
        });

        for (const entity of scene.entities) {
            const transform = entity.getComponent(Transform);
            if (transform && transform.uniformBuffer) {
                const modelBuffer = transform.uniformBuffer;
                const modelBindGroup = renderState.device.createBindGroup({
                    layout: modelBindGroupLayout,
                    entries: [{
                        binding: 0,
                        resource: modelBuffer
                    }]
                });
                this.modelBindGroups.set(entity, modelBindGroup);
            }

            const mesh = entity.getComponent(Mesh);
            if (mesh) {
                const primitives = mesh.getPrimitivesByMaterial(BasicMaterial) ?? [];

                for (const primitive of primitives) {
                    const material = primitive.material as BasicMaterial;
                    if (this.materialBindGroups.has(material)) {
                        continue;
                    }

                    const materialBuffer = material.uniformBuffer;
                    const texture = renderState.getMaterialTexture(material.baseTexture);
                    if (!texture) {
                        throw Error("Material texture not initialized!");
                    }
                    const materialBindGroup = renderState.device.createBindGroup({
                        layout: materialBindGroupLayout,
                        entries: [
                            { binding: 0, resource: materialBuffer! },
                            { binding: 1, resource: texture.view },
                            { binding: 2, resource: renderState.sampler }
                        ]
                    });

                    this.materialBindGroups.set(material, materialBindGroup);
                }
            }

            const skin = entity.getComponent(Skin);
            if (skin) {
                this.skinBindGroups.set(entity, renderState.device.createBindGroup({
                    layout: skinBindGroupLayout,
                    entries: [{ binding: 0, resource: skin.jointMatricesBuffer! }]
                }));
            }
        }
    }

    /**
     * Renders the scene in the given render pass
     * @param pass render pass to draw in
     * @param scene the scene to render
     */
    render(pass: GPURenderPassEncoder, scene: Scene) {
        pass.setBindGroup(0, this.frameBindGroup);
        for (const entity of scene.entities) {
            const mesh = entity.getComponent(Mesh);
            if (!mesh) {
                continue;
            }

            const skin = entity.getComponent(Skin);

            const modelBindGroup = this.modelBindGroups.get(entity);

            const primitives = mesh.getPrimitivesByMaterial(BasicMaterial) ?? [];

            for (const primitive of primitives) {
                const material = primitive.material as BasicMaterial;

                const materialBindGroup = this.materialBindGroups.get(material);
                const vertexBuffer = primitive.vertexBuffer;
                const indexBuffer = primitive.indexBuffer;

                if (!modelBindGroup || !materialBindGroup || !vertexBuffer || !indexBuffer) {
                    continue;
                }

                const skinBindGroup = this.skinBindGroups.get(entity);
                if (!skin || !skinBindGroup || !primitive.skinVertexBuffer) {
                    pass.setPipeline(this.pipeline);
                } else {
                    pass.setPipeline(this.skinnedPipeline);
                    pass.setBindGroup(3, this.skinBindGroups.get(entity));
                    pass.setVertexBuffer(1, primitive.skinVertexBuffer);
                }

                pass.setBindGroup(1, modelBindGroup);
                pass.setBindGroup(2, materialBindGroup);
                pass.setVertexBuffer(0, vertexBuffer);
                if (primitive.indices instanceof Uint16Array) {
                    pass.setIndexBuffer(indexBuffer, 'uint16');
                } else {
                    pass.setIndexBuffer(indexBuffer, 'uint32');
                }
                pass.drawIndexed(primitive.indices.length);
            }
        }
    }
}