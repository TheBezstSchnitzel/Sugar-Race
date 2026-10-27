// -----------------------------------
// This file stores all glTF definitions
// so that the data parsed from JSON
// contains types
// -----------------------------------

export interface GlTF {
    extensionsUsed?: string[];
    extensionsRequired?: string[];
    accessors?: Accessor[];
    animations?: Animation[];
    asset: Asset;
    buffers?: Buffer[];
    bufferViews?: BufferView[];
    cameras?: Camera[];
    images?: Image[];
    materials?: Material[];
    meshes?: Mesh[];
    nodes?: Node[];
    samplers?: Sampler[];
    scene?: number;
    scenes?: Scene[];
    skins?: Skin[];
    textures?: Texture[];
    extensions?: Extensions;
}
 
export interface Asset {
    copyright?: string;
    generator?: string;
    version: string;
    minVersion?: string;
}
 
export interface Buffer {
    uri?: string;
    byteLength: number;
    name?: string;
}
 
export interface BufferView {
    buffer: number;
    byteOffset?: number;
    byteLength: number;
    byteStride?: number;
    target?: 34962 | 34963 | number;
    name?: string;
}
 
export type AccessorComponentType = 5120 | 5121 | 5122 | 5123 | 5125 | 5126;

export enum AccessorComponentTypeEnum {
    Byte = 5120,
    UnsignedByte = 5121,
    Short = 5122,
    UnsignedShort = 5123,
    UnsignedInt = 5125,
    Float = 5126,
}
 
export type AccessorType =
  | 'SCALAR'
  | 'VEC2'
  | 'VEC3'
  | 'VEC4'
  | 'MAT2'
  | 'MAT3'
  | 'MAT4';
 
export interface Accessor {
    bufferView?: number;
    byteOffset?: number;
    componentType: AccessorComponentType;
    normalized?: boolean;
    count: number;
    type: AccessorType;
    max?: number[];
    min?: number[];
    sparse?: AccessorSparse;
    name?: string;
}
 
export interface AccessorSparse {
    count: number;
    indices: AccessorSparseIndices;
    values: AccessorSparseValues;
}
 
export interface AccessorSparseIndices {
    bufferView: number;
    byteOffset?: number;
    componentType: 5121 | 5123 | 5125;
}
 
export interface AccessorSparseValues {
    bufferView: number;
    byteOffset?: number;
}
 
export interface Animation {
    channels: AnimationChannel[];
    samplers: AnimationSampler[];
    name?: string;
}
 
export interface AnimationChannel {
    sampler: number;
    target: AnimationChannelTarget;
}
 
export type AnimationChannelTargetPath =
  | 'translation'
  | 'rotation'
  | 'scale'
  | 'weights';
 
export interface AnimationChannelTarget {
    node?: number;
    path: AnimationChannelTargetPath;
}
 
export type AnimationSamplerInterpolation = 'LINEAR' | 'STEP' | 'CUBICSPLINE';
 
export interface AnimationSampler {
    input: number;
    interpolation?: AnimationSamplerInterpolation;
    output: number;
}
 
export type CameraType = 'perspective' | 'orthographic';
 
export interface Camera {
    orthographic?: CameraOrthographic;
    perspective?: CameraPerspective;
    type: CameraType;
    name?: string;
}
 
export interface CameraOrthographic {
    xmag: number;
    ymag: number;
    zfar: number;
    znear: number;
}
 
export interface CameraPerspective {
    aspectRatio?: number;
    yfov: number;
    zfar?: number;
    znear: number;
}
 
export interface Image {
    uri?: string;
    mimeType?: 'image/jpeg' | 'image/png';
    bufferView?: number;
    name?: string;
}
 
export type MaterialAlphaMode = 'OPAQUE' | 'MASK' | 'BLEND';
 
export interface Material {
    name?: string;
    pbrMetallicRoughness?: MaterialPbrMetallicRoughness;
    normalTexture?: MaterialNormalTextureInfo;
    occlusionTexture?: MaterialOcclusionTextureInfo;
    emissiveTexture?: TextureInfo;
    emissiveFactor?: [number, number, number];
    alphaMode?: MaterialAlphaMode;
    alphaCutoff?: number;
    doubleSided?: boolean;
}
 
export interface MaterialPbrMetallicRoughness {
    baseColorFactor?: [number, number, number, number];
    baseColorTexture?: TextureInfo;
    metallicFactor?: number;
    roughnessFactor?: number;
    metallicRoughnessTexture?: TextureInfo;
}
 
export interface MaterialNormalTextureInfo {
    index: number;
    texCoord?: number;
    scale?: number;
}
 
export interface MaterialOcclusionTextureInfo {
    index: number;
    texCoord?: number;
    strength?: number;
}
 
export interface Mesh {
    primitives: MeshPrimitive[];
    weights?: number[];
    name?: string;
}
 
export type MeshPrimitiveMode = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export enum MeshPrimitiveModeEnum {
    Points = 0,
    Lines = 1,
    LineLoop = 2,
    LineStrip = 3,
    Triangles = 4,
    TriangleStrip = 5,
    TriangleFan = 6,
}
 
export interface MeshPrimitive {
    attributes: { [semantic: string]: number };
    indices?: number;
    material?: number;
    mode?: MeshPrimitiveMode;
    targets?: { [semantic: string]: number }[];
}
 
export interface Node {
    camera?: number;
    children?: number[];
    skin?: number;
    matrix?: [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
  ];
    mesh?: number;
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
    translation?: [number, number, number];
    weights?: number[];
    name?: string;
    extensions?: NodeExtensions;
}

export interface NodeExtensions {
    KHR_lights_punctual?: NodeExtensionLights;
}

export interface NodeExtensionLights {
    light: number;
}
 
export type SamplerMagFilter = 9728 | 9729;
export type SamplerMinFilter = 9728 | 9729 | 9984 | 9985 | 9986 | 9987;
export type SamplerWrapMode = 33071 | 33648 | 10497;

export enum SamplerMagFilterEnum {
    Nearest = 9728,
    Linear = 9729,
}

export enum SamplerMinFilterEnum {
    Nearest = 9728,
    Linear = 9729,
    NearestMipmapNearest = 9984,
    LinearMipmapNearest = 9985,
    NearestMipmapLinear = 9986,
    LinearMipmapLinear = 9987,
}

export enum SamplerWrapModeEnum {
    ClampToEdge = 33071,
    MirroredRepeat = 33648,
    Repeat = 10497,
}
 
export interface Sampler {
    magFilter?: SamplerMagFilter;
    minFilter?: SamplerMinFilter;
    wrapS?: SamplerWrapMode;
    wrapT?: SamplerWrapMode;
    name?: string;
}
 
export interface Scene {
    nodes?: number[];
    name?: string;
}
 
export interface Skin {
    inverseBindMatrices?: number;
    skeleton?: number;
    joints: number[];
    name?: string;
}
 
export interface Texture {
    sampler?: number;
    source?: number;
    name?: string;
}
 
export interface TextureInfo {
    index: number;
    texCoord?: number;
}

export interface Extensions {
    KHR_lights_punctual?: LightsExtension;
}

export interface LightsExtension {
    lights: Light[];
}

export type LightType = 'point' | 'spot' | 'directional';

export interface Light {
    color?: [number, number, number];
    intensity?: number;
    type: LightType;
    name?: string;
    range?: number;
    spot?: Spot;
}

export interface Spot {
    innerConeAngle?: number;
    outerConeAngle?: number;
}