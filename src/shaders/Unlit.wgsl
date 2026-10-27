struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) tangent: vec3f,
}

struct SkinnedVertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) tangent: vec3f,
    @location(4) joints: vec4u,
    @location(5) weights: vec4f
}

struct VertexOutput {
   @builtin(position) position: vec4f, 
   @location(0) uv: vec2f,
}

struct Camera {
    view: mat4x4f,
    projection: mat4x4f
}

struct Model {
    matrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(1) @binding(0) var<uniform> model: Model;
@group(2) @binding(0) var<uniform> color: vec4f;
@group(2) @binding(1) var baseTexture: texture_2d<f32>;
@group(2) @binding(2) var textureSampler: sampler;
@group(3) @binding(0) var<storage, read> jointMatrices: array<mat4x4f>;

@vertex
fn vertex(input:VertexInput) -> VertexOutput {
    let position = camera.projection * camera.view * model.matrix * vec4f(input.position, 1.0);

    var output: VertexOutput;
    output.position = position;
    output.uv = input.uv;
    return output;
}

@vertex
fn vertexSkinned(input: SkinnedVertexInput) -> VertexOutput {
    let skin =
        input.weights.x * jointMatrices[input.joints.x] +
        input.weights.y * jointMatrices[input.joints.y] +
        input.weights.z * jointMatrices[input.joints.z] +
        input.weights.w * jointMatrices[input.joints.w];

    var output: VertexOutput;
    output.position = camera.projection * camera.view * model.matrix * skin * vec4f(input.position, 1.0);
    output.uv = input.uv;
    return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4f {
    return textureSample(baseTexture, textureSampler, input.uv);
}