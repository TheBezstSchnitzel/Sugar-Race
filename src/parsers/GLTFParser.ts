import { mat4, quat, vec3, vec4 } from "gl-matrix";
import { Transform, TransformType } from "../components/Transform.ts";
import { BasicMaterial, Material } from "../data/Material.ts";
import { Entity } from "../Entity.ts";
import { Scene } from "../Scene.ts";
import { AccessorComponentTypeEnum, type Animation, type AnimationChannel, type GlTF, type MeshPrimitive, type Node } from "./GLTFData.ts";
import { Camera } from "../components/Camera.ts";
import { Mesh } from "../components/Mesh.ts";
import { KeyframeAnimations, KeyframeAnimationChannel, KeyframeInterpolation, KeyframeTarget, type Keyframe, KeyframeAnimation } from "../components/KeyframeAnimation.ts";
import { Skin } from "../components/Skin.ts";
import { Light, LightType } from "../components/Light.ts";
import { Primitive } from "../data/Primitive.ts";
import { createTempTexture } from "../Utils.ts";

/**
 * A glTF parser.
 * See the glTF format specification for detailed workings of the format.
 */
export class GLTFParser {
    data: GlTF;                     // the parsed JSON data
    buffers: Uint8Array[] = [];     // all glTF buffers
    rootDirectory: string = "./";   // when retrieving files from disk, we need a root dir where the .gltf file resides

    // These structures are used as cache since
    // a lot of data links to other data that may
    // have already been loaded
    scenes: Map<any, Scene> = new Map();
    nodes: Map<any, Entity> = new Map();
    cameras: Map<any, Camera> = new Map();
    meshes: Map<any, Mesh> = new Map();
    materials: Map<any, Material> = new Map();
    lights: Map<any, Light> = new Map();
    images: Map<any, ImageBitmap> = new Map();
    animationChannels: Map<any, AnimationChannel> = new Map();
    accessors: Map<any, { data: Uint8Array<ArrayBuffer> | Int8Array<ArrayBuffer> | Int16Array<ArrayBuffer> | Uint16Array<ArrayBuffer> | Uint32Array<ArrayBuffer> | Float32Array<ArrayBuffer>, count: number, numComponents: number }> = new Map();

    constructor() {
        this.data = {
            'asset': { version: '2.0' }
        };
    }

    clearCache() {
        this.buffers = [];
        this.materials.clear();
        this.scenes.clear();
        this.nodes.clear();
        this.cameras.clear();
        this.meshes.clear();
        this.materials.clear();
        this.lights.clear();
        this.images.clear();
        this.animationChannels.clear();
        this.accessors.clear();
    }

    /**
     * Loads JSON file (.gltf).
     * @param content text contents of the glTF spec file
     * @param rootDirectory the disk directory where the .gltf file is located (used for buffer/texture loading)
     */
    async setJson(content: string, rootDirectory: string) {
        this.clearCache();
        this.data = JSON.parse(content);
        this.rootDirectory = rootDirectory;
    }

    /**
     * Loads the binary glTF (.glb).
     * @param content binary contents of the file
     */
    async setBinary(content: Uint8Array) {    
        this.clearCache();   
        const dataView = new DataView(content.buffer, content.byteOffset, content.byteLength);
        const magic = dataView.getUint32(0, true);
        const version = dataView.getUint32(4, true);
        const totalLength = dataView.getUint32(8, true);

        if (magic != 1179937895) {
            throw Error("GLTF Magic Error: Not a valid GLTF file!");
        }
        if (version != 2) {
            throw Error("GLTF Version Error: Unsupported GLTF version!");
        }
        if (totalLength > content.byteLength) {
            throw Error("GLTF Size Error: GLB length exceeds buffer size!");
        }

        const JSON_CHUNK_TYPE = 0x4e4f534a;
        const BIN_CHUNK_TYPE = 0x004e4942;

        let spec: string | undefined;
        let binaryChunks = [];

        let offset = 12;
        while (offset < totalLength) {
            const chunkLength = dataView.getUint32(offset, true);
            const chunkType = dataView.getUint32(offset + 4, true);
            const chunkStart = offset + 8;
            const chunkData = content.slice(chunkStart, chunkStart + chunkLength);

            if (chunkType == JSON_CHUNK_TYPE) {
                spec = new TextDecoder('utf-8').decode(chunkData);
            } else if (chunkType == BIN_CHUNK_TYPE) {
                binaryChunks.push(chunkData);
            }

            offset = chunkStart + chunkLength;
        }

        if (spec === undefined) {
            throw Error("GLTF Error: No JSON content!");
        }

        this.data = JSON.parse(spec);
        this.buffers = binaryChunks;
    }

    /**
     * Parses a specified scene from the glTF file.
     * @param index index of the scene in the glTF file
     * @returns a {@link Scene} object if it exists
     */
    async parseScene(index: number) {
        if (!this.data.scenes) {
            return null;
        }

        const sceneSpec = this.data.scenes[index];
        if (sceneSpec === undefined) {
            return null;
        }

        const nodes = sceneSpec.nodes ? sceneSpec.nodes : [];
        
        const scene = new Scene();
        for (const nodeIndex of nodes) {
            await this.parseNode(nodeIndex);
        }
        for (const entity of this.nodes.values()) {
            scene.addEntity(entity);
        }

        const animationMap = await this.parseAnimations();
        for (const [entity, animations] of animationMap) {
            entity.addComponent(animations);
        }

        const skinMap = await this.parseSkins();
        for (const [entity, skin] of skinMap) {
            entity.addComponent(skin);
        }

        return scene;
    }

    async parseNode(index: number) {
        if (!this.data.nodes) {
            return null;
        }

        const nodeSpec = this.data.nodes[index];
        if (this.nodes.has(nodeSpec)) {
            return this.nodes.get(nodeSpec)!;
        }

        const nodeEntity = new Entity();
        nodeEntity.name = nodeSpec.name ?? null;

        if (nodeSpec.mesh !== undefined) {
            const mesh = await this.parseMesh(nodeSpec.mesh);
            if (mesh) {
                nodeEntity.addComponent(mesh);
            }
        }
        
        if (nodeSpec.camera !== undefined) {
            const camera = this.parseCamera(nodeSpec.camera);
            if (camera) {
                nodeEntity.addComponent(camera);
            }
        }

        if (nodeSpec.extensions && nodeSpec.extensions.KHR_lights_punctual) {
            const light = this.parseLight(nodeSpec.extensions.KHR_lights_punctual.light);
            if (light) {
                nodeEntity.addComponent(light);
            }
        }

        const transformComponent = this.parseTransform(nodeSpec);
        nodeEntity.addComponent(transformComponent);
        
        const childIndices = nodeSpec.children ? nodeSpec.children : [];
        for (const childIndex of childIndices) {
            const childEntity = await this.parseNode(childIndex);
            if (childEntity) {
                childEntity.parent = nodeEntity;
            }
        }

        this.nodes.set(nodeSpec, nodeEntity);
        return nodeEntity;
    }

    parseTransform(nodeSpec: Node) {
        let translation: vec3;
        let rotation: quat;
        let scale: vec3;
        if (nodeSpec.matrix) {
            let matrix = mat4.fromValues(...nodeSpec.matrix);
            translation = mat4.getTranslation(vec3.create(), matrix);
            rotation = mat4.getRotation(quat.create(), matrix);
            scale = mat4.getScaling(vec3.create(), matrix);
        } else {
            const t = nodeSpec.translation ?? [0, 0, 0];
            const r = nodeSpec.rotation ?? [0, 0, 0, 1];
            const s = nodeSpec.scale ?? [1, 1, 1];
            translation = vec3.fromValues(...t);
            rotation = quat.fromValues(...r);
            scale = vec3.fromValues(...s);
        }
        const transformComponent = new Transform(TransformType.Free);
        transformComponent.location = translation;
        transformComponent.rotation = rotation;
        transformComponent.scale = scale;
        return transformComponent;
    }

    parseCamera(index: number) {
        if (!this.data.cameras) {
            return null;
        }

        let cameraSpec = this.data.cameras[index];
        if (this.cameras.has(cameraSpec)) {
            return this.cameras.get(cameraSpec)!;
        }

        if (cameraSpec.type === 'orthographic' || !cameraSpec.perspective) {
            console.warn("GLTF: Orhtographic camera is not supported!");
            return new Camera(1, Math.PI / 2, 0.1, 100.0);
        }

        let aspect = cameraSpec.perspective.aspectRatio ?? 1.0;
        let fovy = cameraSpec.perspective.yfov;
        let znear = cameraSpec.perspective.znear;
        let zfar = cameraSpec.perspective.zfar ?? 100.0;
        let camera = new Camera(aspect, fovy, znear, zfar);

        this.cameras.set(cameraSpec, camera);
        return camera;
    }

    async parseMesh(index: number) {
        if (!this.data.meshes) {
            return null;
        }

        let meshSpec = this.data.meshes[index];
        if (this.meshes.has(meshSpec)) {
            return this.meshes.get(meshSpec)!;
        }

        const mesh: Mesh = new Mesh();
        for (const primitiveSpec of meshSpec.primitives) {
            const primitive = await this.parseMeshPrimitive(primitiveSpec);
            if (primitive) {
                mesh.addPrimitive(primitive);
            }
        }

        this.meshes.set(meshSpec, mesh);
        return mesh;
    }

    async parseMeshPrimitive(primitive: MeshPrimitive) {
        const mode = primitive.mode ?? 4;
        if (mode !== 4) {
            console.warn(`GLTF: Unsupported primitive mode ${mode} on mesh, skipping...`);
            return null;
        }

        // Positions

        const positionIndex = primitive.attributes['POSITION'];
        if (positionIndex === undefined) {
            console.warn("GLTF: Mesh does not have position attribute, skipping...");
            return null;
        }
        const positions = await this.parseAccessor(positionIndex);
        if (!positions) {
            console.warn("GLTF: Could not get positions");
            return null;
        }
        const vertexCount = positions.count;

        // Indices

        let indices: Uint32Array | Uint16Array;
        if (primitive.indices !== undefined) {
            const accessor = await this.parseAccessor(primitive.indices);
            if (!accessor) {
                console.warn("Could not get mesh indices");
                return null;
            }
            if (accessor.data instanceof Uint32Array || accessor.data instanceof Uint16Array) {
                indices = accessor.data;
            } else {
                indices = Uint16Array.from(accessor.data);
            }
        } else {
            indices = Uint32Array.from({ length: vertexCount }, (_, index) => index);
        }

        // Optional attributes

        const normals = primitive.attributes['NORMAL'] !== undefined
            ? await this.parseAccessor(primitive.attributes['NORMAL'])
            : null;

        const textureCoordinates = primitive.attributes['TEXCOORD_0'] !== undefined
            ? await this.parseAccessor(primitive.attributes['TEXCOORD_0'])
            : null;

        const tangents = primitive.attributes['TANGENT'] !== undefined
            ? await this.parseAccessor(primitive.attributes['TANGENT'])
            : null;

        const joints = primitive.attributes['JOINTS_0'] !== undefined
            ? await this.parseAccessor(primitive.attributes['JOINTS_0'])
            : null;

        const weights = primitive.attributes['WEIGHTS_0'] !== undefined
            ? await this.parseAccessor(primitive.attributes['WEIGHTS_0'])
            : null;
        
        // Into a single 
        
        const vertices = new Float32Array(vertexCount * 11);
        for (let i = 0; i < vertexCount; i++) {
            const vertexStart = i * 11;
            
            for (let c = 0; c < 3; c++) {
                vertices[vertexStart + c] = positions.data[i * positions.numComponents + c];
            }
            if (normals) {
                for (let c = 0; c < 3; c++) {
                    vertices[vertexStart + 3 + c] = normals.data[i * normals.numComponents + c];
                }
            }
            if (textureCoordinates) {
                for (let c = 0; c < 2; c++) {
                    vertices[vertexStart + 6 + c] = textureCoordinates.data[i * textureCoordinates.numComponents + c];
                }
            }
            if (tangents) {
                for (let c = 0; c < 3; c++) {
                    vertices[vertexStart + 8 + c] = tangents.data[i * tangents.numComponents + c];
                }
            }
        }

        let material: Material;
        if (primitive.material !== undefined) {
            material = await this.parseMaterial(primitive.material);
        } else {
            const bitmap = await createTempTexture();
            material = new BasicMaterial(bitmap, vec4.fromValues(1, 1, 1, 1));
        }

        let skinVertices = null;
        if (joints && weights) {
            skinVertices = new ArrayBuffer(vertexCount * 32); // 8 values * 4 bytes
            const jointView = new Uint32Array(skinVertices);
            const weightView = new Float32Array (skinVertices);

            for(let i = 0; i < vertexCount; i++) {
                for (let c = 0; c < 4; c++) {
                    jointView[i * 8 + c] = joints.data[i * 4 + c];
                    weightView[i * 8 + c + 4] = weights.data [i * 4 + c];
                }
            }
        }

        return new Primitive(vertices, indices, material, skinVertices);
    }

    async parseAccessor(index: number) {
        if (!this.data.accessors) {
            return null;
        }

        const accessorSpec = this.data.accessors[index];
        if (this.accessors.has(accessorSpec)) {
            return this.accessors.get(accessorSpec)!;
        }

        const numComponents = COMPONENTS_IN_TYPE[accessorSpec.type];
        const arrayConstructor = ARRAY_TYPE_BY_COMPONENT[accessorSpec.componentType];
        const componentSize = COMPONENT_SIZE[accessorSpec.componentType];
        const componentMax = COMPONENT_TYPE_MAX[accessorSpec.componentType];

        const count = accessorSpec.count;
        const arraySize = count * numComponents;
        const data = new arrayConstructor(arraySize);

        if (accessorSpec.sparse) {
            console.warn("GLTF: Sparse accessors not supported");
            return { data, count, numComponents };
        }

        if (accessorSpec.bufferView === undefined) {
            console.warn("GLTF: Accessor has no buffer view");
            return { data, count, numComponents };
        }

        if (!this.data.bufferViews) {
            console.warn("GLTF: No buffer views in the file");
            return { data, count, numComponents };
        }

        const viewSpec = this.data.bufferViews[accessorSpec.bufferView];
        const buffer = await this.getBuffer(viewSpec.buffer);
        if (!buffer) {
            console.warn("GLTF: Buffer missing!")
            return { data, count, numComponents };
        }
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

        const elementSize = componentSize * numComponents;
        const stride = viewSpec.byteStride ?? elementSize;
        const start = (viewSpec.byteOffset ?? 0) + (accessorSpec.byteOffset ?? 0);
        const normalized = accessorSpec.normalized === true && componentMax > 0;

        let dataSize = start + (count - 1) * stride + elementSize;
        if (count > 0 && dataSize > buffer.byteLength) {
            throw Error(`GLTF: Accessor ${accessorSpec.name} exceeds buffer size!`);
        }

        for (let i = 0; i < count; i++) {
            const elementOffset = start + i * stride;
            for (let componentIndex = 0; componentIndex < numComponents; componentIndex++) {
                let value: number;
                
                let offset = elementOffset + componentIndex * componentSize;
                switch(accessorSpec.componentType) {
                    case AccessorComponentTypeEnum.Byte:
                        value = view.getInt8(offset);
                        break;
                    case AccessorComponentTypeEnum.UnsignedByte:
                        value = view.getUint8(offset);
                        break;
                    case AccessorComponentTypeEnum.Short:
                        value = view.getInt16(offset, true);
                        break;
                    case AccessorComponentTypeEnum.UnsignedShort:
                        value = view.getUint16(offset, true);
                        break;
                    case AccessorComponentTypeEnum.UnsignedInt:
                        value = view.getUint32(offset, true);
                        break;
                    default:
                        value = view.getFloat32(offset, true);
                }

                if (normalized) {
                    value = Math.max(value / componentMax, -1);
                }
                data[i * numComponents + componentIndex] = value;
            }
        }

        return { data, count, numComponents };
    }

    async getBuffer(index: number) {
        const cached = this.buffers[index];
        if (cached) {
            return cached;
        }

        if (!this.data.buffers) {
            return null;
        }

        let bufferSpec = this.data.buffers[index];
        if (!bufferSpec.uri) {
            return this.buffers[0];
        }

        if (bufferSpec.uri.startsWith('data:')) {
            const base64 = bufferSpec.uri.split(',')[1];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            this.buffers[index] = bytes;
            return bytes;
        } else {
            let filepath = this.rootDirectory + (bufferSpec.uri);
            const content = await fetch(filepath).then((r) => {
                if (!r.ok) {
                    console.warn(`GLTF: Could not load buffer: ${r.statusText}`);
                    return new Uint8Array(0).buffer;
                }
                return r.arrayBuffer();
            });
            const buffer = new Uint8Array(content);
            this.buffers[index] = buffer;
            return buffer;
        }
    }

    async parseMaterial(index: number) {
        const bitmap = await createTempTexture();

        if (!this.data.materials) {
            console.warn("No materials found in GLTF");
            return new BasicMaterial(bitmap, vec4.fromValues(1, 1, 1, 1));
        }

        const materialSpec = this.data.materials[index];
        if (this.materials.has(materialSpec)) {
            return this.materials.get(materialSpec)!;
        }
        
        const material = new BasicMaterial(bitmap, vec4.fromValues(1, 1, 1, 1));
        const pbrSpec = materialSpec.pbrMetallicRoughness;
        if (pbrSpec) {
            if (pbrSpec.baseColorFactor ) {
                material.baseColor = vec4.fromValues(...pbrSpec.baseColorFactor);
                material.baseTexture = await createTempTexture(material.baseColor);
            }
            if (pbrSpec.baseColorTexture) {
                material.baseTexture = await this.parseTexture(pbrSpec.baseColorTexture.index);
            }
        }

        this.materials.set(materialSpec, material);
        return material;
    }

    async parseTexture(index: number) {
        if (!this.data.textures || !this.data.images) {
            return createTempTexture();
        }

        const textureSpec = this.data.textures[index];
        const source = textureSpec.source;
        if (source === undefined) {
            return await createTempTexture();
        }
        let image = await this.getImage(source);
        if (!image) {
            image = await createTempTexture();
        }

        return image;
    }

    async getImage(index: number) {
        if (!this.data.images) {
            return null;
        }

        const imageSpec = this.data.images[index];
        if (this.images.has(imageSpec)) {
            return this.images.get(imageSpec)!;
        }
        
        let blob: Blob;
        if (imageSpec.bufferView !== undefined) {
            if (!this.data.bufferViews) {
                console.warn("GLTF: No buffer views in the file");
                return null;
            }

            const viewSpec = this.data.bufferViews[imageSpec.bufferView];
            const start = viewSpec.byteOffset ?? 0;
            const buffer = await this.getBuffer(viewSpec.buffer);
            if (!buffer) {
                console.warn("GLTF: Buffer missing!")
                return null;
            }
            const bytes = buffer.slice(start, start + viewSpec.byteLength);
            blob = new Blob([bytes], { type: imageSpec.mimeType });
        } else if (imageSpec.uri !== undefined) {
            const url = imageSpec.uri.startsWith('data:') ? imageSpec.uri : this.rootDirectory + imageSpec.uri;
            const response = await fetch(url);
            if (!response.ok) {
                console.warn("GLTF: Could not load the image!");
                return null;
            }
            blob = await response.blob();
        } else {
            console.warn("GLTF: Image does not have uri or bufferView!");
            return null;
        }

        const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
        this.images.set(imageSpec, bitmap);
        return bitmap;
    }

    async parseSkins() {
        const entitySkinMap: Map<Entity, Skin> = new Map();
        if (!this.data.nodes || !this.data.skins) {
            return entitySkinMap;
        }
        for (const node of this.data.nodes) {
            if (node.skin === undefined) {
                continue;
            }

            const entity = this.nodes.get(node);
            if (!entity) {
                continue;
            }

            const skin = await this.parseSkin(node.skin);
            if (skin) {
                entitySkinMap.set(entity, skin);
            }
        }
        return entitySkinMap;
    }

    async parseSkin(index: number) {
        if (!this.data.skins) {
            return null;
        }
        const skinSpec = this.data.skins[index];

        const joints: Entity[] = [];
        for (const jointIndex of skinSpec.joints) {
            const joint = await this.parseNode(jointIndex);
            if (!joint) {
                console.warn(`GLTF: Skin ${skinSpec.name} has missing joint ${jointIndex}, skipping...`);
                return null;
            }
            joints.push(joint)
        }

        const accessor = skinSpec.inverseBindMatrices !== undefined
            ? await this.parseAccessor(skinSpec.inverseBindMatrices)
            : null;

        const inverseBindMatrices: mat4[] = [];
        for (let i = 0; i < joints.length; i++) {
            if (accessor && accessor.numComponents === 16 && i < accessor.count) {
                inverseBindMatrices.push(mat4.clone(accessor.data.subarray(i * 16, (i + 1) * 16)));
            } else {
                inverseBindMatrices.push(mat4.create());
            }
        }

        return new Skin(joints, inverseBindMatrices);
    }

    async parseAnimations() {
        const animations: Map<Entity, KeyframeAnimations> = new Map();
        if (!this.data.animations) {
            return new Map<Entity, KeyframeAnimations>();
        }

        for (const animationSpec of this.data.animations) {
            if (animationSpec.name === undefined) {
                console.warn("GLTF: Animation does not have a name. Storing under 'undefined'...");
            }
            const name = animationSpec.name ?? 'undefined';
            const animationChannels = await this.parseAnimation(animationSpec);

            for (const [entity, channels] of animationChannels.entries()) {
                const animation = new KeyframeAnimation(name, channels, true, true);
                if (!animations.has(entity)) {
                    animations.set(entity, new KeyframeAnimations(entity));
                }
                animations.get(entity)?.addAnimation(animation);
            }
        }
        return animations;
    }

    async parseAnimation(animation: Animation) {
        const channels = animation.channels;
        const samplers = animation.samplers;

        const channelsPerEntity: Map<Entity, KeyframeAnimationChannel[]> = new Map();

        for (const channel of channels) {
            const target = channel.target;
            const sampler = samplers[channel.sampler];

            if (target.node === undefined) {
                continue;
            }

            const entity = await this.parseNode(target.node);
            if (!entity) {
                continue;
            }

            const targetPath = ANIMATION_PATH[target.path];
            if (targetPath === null) {
                console.warn(`GLTF: Animation target ${target.path} not supported!`);
                continue;
            }

            const input = await this.parseAccessor(sampler.input);
            const output = await this.parseAccessor(sampler.output);
            const interpolation = ANIMATION_INTERPOLATION[sampler.interpolation ?? 'LINEAR'];

            if (!input || !output) {
                continue;
            }

            // TODO: Handle spline interpolation!
            const keyframes: Keyframe[] = [];
            for (let i = 0; i < input.count; i++) {
                const timestamp = input.data[i];

                let index = output.numComponents * i;
                let value: vec3 | quat;
                if (targetPath === KeyframeTarget.Translation || targetPath === KeyframeTarget.Scale) {
                    value = vec3.fromValues(output.data[index], output.data[index + 1], output.data[index + 2]);
                } else {
                    value = quat.fromValues(output.data[index], output.data[index + 1], output.data[index + 2], output.data[index + 3]);
                }

                const keyframe = { time: timestamp, value };
                keyframes.push(keyframe);
            }

            const keyframeChannel = new KeyframeAnimationChannel(
                interpolation,
                targetPath,
                keyframes
            );

            if (channelsPerEntity.has(entity)) {
                channelsPerEntity.get(entity)?.push(keyframeChannel);
            } else {
                channelsPerEntity.set(entity, [keyframeChannel]);
            }
        }
        return channelsPerEntity;
    }

    parseLight(index: number) {
        if (!this.data.extensions || !this.data.extensions.KHR_lights_punctual) {
            return null;
        }

        const lightSpec = this.data.extensions.KHR_lights_punctual.lights[index];
        if (this.lights.has(lightSpec)) {
            return this.lights.get(lightSpec)!;
        }

        const lightType = LIGHT_TYPE[lightSpec.type];

        const light = new Light(lightType);
        light.color = lightSpec.color !== undefined ? vec3.fromValues(...lightSpec.color) : vec3.fromValues(1, 1, 1);
        light.intensity = lightSpec.intensity ?? 1.0;
        light.range = lightSpec.range ?? Number.POSITIVE_INFINITY;
        if (lightSpec.spot) {
            light.innerConeAngle = lightSpec.spot.innerConeAngle ?? 0;
            light.outerConeAngle = lightSpec.spot.outerConeAngle ?? Math.PI / 4;
        }

        this.lights.set(lightSpec, light);
        return light;
    }
}


const COMPONENTS_IN_TYPE = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16,
};


const ARRAY_TYPE_BY_COMPONENT = {
    5120: Int8Array,
    5121: Uint8Array,
    5122: Int16Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array
};


const COMPONENT_SIZE = {
    5120: 1,
    5121: 1,
    5122: 2,
    5123: 2,
    5125: 4,
    5126: 4
};


const COMPONENT_TYPE_MAX = {
    5120: 127,
    5121: 255,
    5122: 32767,
    5123: 65535,
    5125: 0,
    5126: 0
};


const ANIMATION_PATH = {
    'translation': KeyframeTarget.Translation,
    'rotation': KeyframeTarget.Rotation,
    'scale': KeyframeTarget.Scale,
    'weights': null
};


const ANIMATION_INTERPOLATION = {
    'LINEAR': KeyframeInterpolation.Linear,
    'STEP': KeyframeInterpolation.Constant,
    'CUBICSPLINE': KeyframeInterpolation.CubicSpline
};


const LIGHT_TYPE = {
    'spot': LightType.Spot,
    'directional': LightType.Directional,
    'point': LightType.Point
};