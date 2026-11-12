import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

/**
 * Coloured cartoon outlines for the low-poly look, from the rendered depth.
 * Silhouettes show as depth jumps, and creases (where two flat faces meet)
 * show as a change in the depth slope. Lines fade with distance so the far
 * horizon stays clean. The GLSL is shared with the contact-shadow pass, which
 * applies it in the same draw when ambient occlusion is on.
 */
export const OUTLINE_GLSL = `
uniform vec2 outlineTexel;
uniform float outlineThickness;
uniform vec3 outlineInk;
float outlineViewZ(sampler2D depthTex, mat4 inverseProjection, vec2 uv){
  float d=texture2D(depthTex,uv).x;
  vec4 p=inverseProjection*vec4(uv*2.0-1.0,d*2.0-1.0,1.0);
  return -p.z/p.w;
}
float outlineInkDiff(vec3 a, vec3 b){
  vec3 d=abs(a-b);
  return max(max(d.r,d.g),d.b)+abs(dot(a-b,vec3(0.299,0.587,0.114)))*0.5;
}
vec3 applyOutline(vec3 colour, sampler2D colourTex, sampler2D depthTex, mat4 inverseProjection, vec2 uv){
  vec2 o=outlineTexel*outlineThickness;
  float c=outlineViewZ(depthTex,inverseProjection,uv);
  if(c>140.0) return colour;
  float l=outlineViewZ(depthTex,inverseProjection,uv-vec2(o.x,0.0)), r=outlineViewZ(depthTex,inverseProjection,uv+vec2(o.x,0.0));
  float u=outlineViewZ(depthTex,inverseProjection,uv+vec2(0.0,o.y)), d=outlineViewZ(depthTex,inverseProjection,uv-vec2(0.0,o.y));
  float jump=max(max(abs(l-c),abs(r-c)),max(abs(u-c),abs(d-c)))/max(c,0.5);
  float crease=(abs(l+r-2.0*c)+abs(u+d-2.0*c))/max(c,0.5);
  float silhouette=smoothstep(0.07,0.13,jump);
  float creaseLine=smoothstep(0.03,0.06,crease);
  // Colour boundaries too, so flat ground gets lightly inked: road against pavement, kerbs, grass
  // edges and road paint. Only strong changes, so soft shading and paving stay clean.
  vec3 cl=texture2D(colourTex,uv-vec2(o.x,0.0)).rgb, cr=texture2D(colourTex,uv+vec2(o.x,0.0)).rgb;
  vec3 cu=texture2D(colourTex,uv+vec2(0.0,o.y)).rgb, cd=texture2D(colourTex,uv-vec2(0.0,o.y)).rgb;
  vec3 cc=texture2D(colourTex,uv).rgb;
  float tone=max(max(outlineInkDiff(cl,cc),outlineInkDiff(cr,cc)),max(outlineInkDiff(cu,cc),outlineInkDiff(cd,cc)));
  float toneLine=smoothstep(0.24,0.42,tone)*(1.0-smoothstep(25.0,60.0,c));
  float fade=1.0-smoothstep(45.0,120.0,c);
  // Coloured line art: each line is a deep, saturated shade of what it outlines (squaring the
  // colour keeps its hue and richness), never flat black. Silhouettes are darkest; creases and
  // ground lines are softer, so the scene reads as illustrated rather than scribbled over.
  vec3 deep=colour*colour*0.5+outlineInk*0.35;
  vec3 soft=mix(colour*0.62,deep,0.35);
  vec3 inked=mix(colour,soft,max(creaseLine*0.6,toneLine*0.38)*fade);
  return mix(inked,deep,silhouette*0.9*fade);
}`;

export const outlineUniforms = () => ({
  outlineTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
  outlineThickness: { value: 1.0 },
  outlineInk: { value: new THREE.Color("#1d1640") },
});

/** Size the lines to the drawing buffer (call on resize). */
export function sizeOutline(pass: ShaderPass, width: number, height: number, ratio: number) {
  pass.uniforms.outlineTexel.value.set(1 / (Math.max(1, width) * ratio), 1 / (Math.max(1, height) * ratio));
  pass.uniforms.outlineThickness.value = Math.max(1.5, ratio * 1.5);
}

/** The stand-alone outline pass, used when the contact-shadow pass is off. */
export function toonOutline(camera: THREE.Camera) {
  const pass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, projectionInverse: { value: camera.projectionMatrixInverse }, ...outlineUniforms() },
    vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `uniform sampler2D tDiffuse, tDepth; uniform mat4 projectionInverse; varying vec2 vUv;
${OUTLINE_GLSL}
void main(){ vec4 colour=texture2D(tDiffuse,vUv); gl_FragColor=vec4(applyOutline(colour.rgb,tDiffuse,tDepth,projectionInverse,vUv),colour.a); }`,
  });
  const render = pass.render.bind(pass);
  pass.render = (renderer, writeBuffer, readBuffer, deltaTime, maskActive) => {
    pass.uniforms.projectionInverse.value.copy(camera.projectionMatrixInverse);
    pass.uniforms.tDepth.value = readBuffer.depthTexture;
    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  };
  return pass;
}
