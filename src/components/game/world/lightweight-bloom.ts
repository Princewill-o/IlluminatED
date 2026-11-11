import * as THREE from "three";
import { FullScreenQuad, Pass } from "three/examples/jsm/postprocessing/Pass.js";

const vertexShader = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;

// Five bilinear samples implement a normalized nine-tap Gaussian in each axis.
const gaussian = `vec3 blur5(sampler2D image,vec2 uv,vec2 stepSize){
  vec3 colour=texture2D(image,uv).rgb*.2270270270;
  colour+=(texture2D(image,uv+stepSize*1.3846153846).rgb+texture2D(image,uv-stepSize*1.3846153846).rgb)*.3162162162;
  colour+=(texture2D(image,uv+stepSize*3.2307692308).rgb+texture2D(image,uv-stepSize*3.2307692308).rgb)*.0702702703;
  return colour;
}`;

function material(name: string, uniforms: THREE.ShaderMaterialParameters["uniforms"], fragmentShader: string) {
  return new THREE.ShaderMaterial({
    name, uniforms, vertexShader, fragmentShader,
    depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false,
  });
}

/** Three draws and two half-resolution targets; the original linear HDR input
 * is added only in the final draw. OutputPass remains the sole tone mapper. */
export class LightweightBloomPass extends Pass {
  private readonly bright = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  });
  private readonly blurred = this.bright.clone();
  private readonly highPass = material("Bloom luminance", {
    tDiffuse: { value: null }, threshold: { value: 1.45 }, smoothWidth: { value: .15 },
  }, `uniform sampler2D tDiffuse;uniform float threshold,smoothWidth;varying vec2 vUv;
void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));
// A stray NaN/Inf pixel (e.g. a hot lamp highlight) would smear into a black block: drop it.
if(!(l>=0.0&&l<1e4)){c=vec3(0.0);l=0.0;}c=min(c,vec3(24.0));
gl_FragColor=vec4(c*smoothstep(threshold,threshold+smoothWidth,l),0.0);}`);
  private readonly horizontal = material("Bloom horizontal", {
    tBloom: { value: this.bright.texture }, stepSize: { value: new THREE.Vector2(1,0) },
  }, `uniform sampler2D tBloom;uniform vec2 stepSize;varying vec2 vUv;
${gaussian}
void main(){gl_FragColor=vec4(blur5(tBloom,vUv,stepSize),0.0);}`);
  private readonly composite = material("Bloom vertical and HDR composite", {
    tSource: { value: null }, tBloom: { value: this.blurred.texture },
    stepSize: { value: new THREE.Vector2(0,1) }, strength: { value: .18 },
  }, `uniform sampler2D tSource,tBloom;uniform vec2 stepSize;uniform float strength;varying vec2 vUv;
${gaussian}
void main(){vec4 source=texture2D(tSource,vUv);vec3 glow=blur5(tBloom,vUv,stepSize)*strength;
// Never let a stray NaN pixel through to the screen.
if(!(dot(source.rgb,vec3(1.0))>-1.0))source.rgb=vec3(0.0);if(!(dot(glow,vec3(1.0))>-1.0))glow=vec3(0.0);
gl_FragColor=vec4(source.rgb+glow,source.a);}`);
  private readonly quad = new FullScreenQuad(this.highPass);
  private disposed = false;

  constructor(public strength = .18, public threshold = 1.45, public smoothWidth = .15) {
    super();
    this.bright.texture.name = "Bloom bright half";
    this.blurred.texture.name = "Bloom blurred half";
    this.bright.texture.generateMipmaps = this.blurred.texture.generateMipmaps = false;
  }

  /** EffectComposer supplies physical pixels, including its current pixel ratio. */
  setSize(width: number, height: number) {
    const w = Math.max(1, Math.round(width / 2)), h = Math.max(1, Math.round(height / 2));
    this.bright.setSize(w,h);this.blurred.setSize(w,h);
    this.horizontal.uniforms.stepSize.value.set(1/w,0);
    this.composite.uniforms.stepSize.value.set(0,1/h);
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, _deltaTime = 0, maskActive = false) {
    void _deltaTime;
    if (this.disposed) return;
    const target = renderer.getRenderTarget(), cubeFace = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel();
    const autoClear = renderer.autoClear;
    try {
      renderer.autoClear = false;
      if (maskActive) renderer.state.buffers.stencil.setTest(false);
      this.highPass.uniforms.tDiffuse.value = readBuffer.texture;
      this.highPass.uniforms.threshold.value = this.threshold;
      this.highPass.uniforms.smoothWidth.value = this.smoothWidth;
      this.quad.material = this.highPass;
      renderer.setRenderTarget(this.bright);this.quad.render(renderer);
      this.quad.material = this.horizontal;
      renderer.setRenderTarget(this.blurred);this.quad.render(renderer);
      this.composite.uniforms.tSource.value = readBuffer.texture;
      this.composite.uniforms.strength.value = this.strength;
      this.quad.material = this.composite;
      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      if (maskActive) renderer.state.buffers.stencil.setTest(true);
      if (this.clear) renderer.clear(renderer.autoClearColor,renderer.autoClearDepth,renderer.autoClearStencil);
      this.quad.render(renderer);
    } finally {
      if (maskActive) renderer.state.buffers.stencil.setTest(true);
      renderer.autoClear = autoClear;
      renderer.setRenderTarget(target,cubeFace,mip);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.bright.dispose();this.blurred.dispose();
    this.highPass.dispose();this.horizontal.dispose();this.composite.dispose();
    this.quad.dispose();
  }
}
