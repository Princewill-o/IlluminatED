import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";

import { contactShadows } from "./contact-shadows";
import { environmentPalette, type EnvironmentPhase } from "./environment-palette";
import { miniatureFocus } from "./miniature-focus";
import { outdoorEnvironment } from "./sky-environment";

import type { visualProfile } from "@/game/core/visual-quality";

type Profile = ReturnType<typeof visualProfile>;
/** HDR presentation with a single tone-map/output conversion; never touches HTML UI. */
export function cinematicRenderer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  profile: Profile,
  phase: EnvironmentPhase = "day",
) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = profile.exposure;
  let environment: THREE.WebGLRenderTarget | null = null;
  const outside = !!scene.fog;
  let environmentKey = "";
  const cleanup: Array<() => void> = [];
  const dispose = () => {
    if (scene.environment === environment?.texture) scene.environment = null;
    environment?.dispose(); environment = null;
    for (const release of cleanup.reverse()) release();
    cleanup.length = 0;
  };
  // Time/weather change rarely: rebake only on a changed palette, never per frame.
  const setAtmosphere = (next: EnvironmentPhase, overcast = false) => {
    const key = `${next}:${overcast}`;
    if (!profile.environment || !outside || environmentKey === key) return;
    const target = outdoorEnvironment(renderer, next, overcast);
    const previous = environment;
    environment = target; environmentKey = key;
    scene.environment = target.texture;
    previous?.dispose();
  };
  try {
    if (profile.environment) {
      if (scene.fog) {
        setAtmosphere(phase);
      } else {
        const generator = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
        try { environment = generator.fromScene(room, 0.04); }
        finally { room.dispose(); generator.dispose(); }
      }
      if (environment) scene.environment = environment.texture;
      scene.environmentIntensity = outside ? environmentPalette(phase).environment : .32;
    }
    if (!profile.postProcessing)
      return {
        render: () => renderer.render(scene, camera),
        resize: () => {},
        setAtmosphere,
        dispose,
      };
    const hdr = renderer.extensions.has("EXT_color_buffer_float");
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType,
      depthBuffer: true,
    });
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const supported: number[] = Array.from(
      gl.getInternalformatParameter(
        gl.RENDERBUFFER,
        hdr ? gl.RGBA16F : gl.RGBA8,
        gl.SAMPLES,
      ) ?? [],
    );
    target.samples =
      supported
        .filter((samples) => samples <= profile.samples)
        .sort((a, b) => b - a)[0] ?? 0;
    cleanup.push(() => target.dispose());
    const composer = new EffectComposer(renderer, target);
    cleanup.push(() => composer.dispose());
    if (profile.ambientOcclusion) {
      // Both ping-pong buffers can become the next frame's scene input.
      for (const buffer of [composer.renderTarget1, composer.renderTarget2]) {
        const depth = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
        buffer.depthTexture = depth;
        cleanup.push(() => depth.dispose());
      }
    }
    const render = new RenderPass(scene, camera);
    composer.addPass(render);
    cleanup.push(() => render.dispose());
    if (profile.ambientOcclusion) {
      const contact = contactShadows(camera, profile.occlusionSamples);
      composer.addPass(contact);
      cleanup.push(() => contact.dispose());
    }
    const bloom =
      profile.bloom && hdr
        ? new UnrealBloomPass(
            new THREE.Vector2(1, 1),
            profile.bloomStrength,
            0.45,
            1.45,
          )
        : null;
    if (bloom) {
      composer.addPass(bloom);
      cleanup.push(() => bloom.dispose());
    }
    const grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader:
        "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: `uniform sampler2D tDiffuse;varying vec2 vUv;
void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.2126,.7152,.0722));
// Linear HDR split toning: warm highlights, blue-green shadow fill.
float highlight=smoothstep(.25,1.8,l);
c.rgb*=mix(vec3(.9,.93,1.1),vec3(1.07,1.01,.91),highlight);
l=dot(c.rgb,vec3(.2126,.7152,.0722));
c.rgb=mix(vec3(l),c.rgb,1.12);
// Preserve black detail while giving the miniature scene more separation.
c.rgb*=mix(.91,1.025,smoothstep(.04,.8,l));
vec2 p=vUv*(1.0-vUv.yx);float edge=clamp(pow(16.0*p.x*p.y,.12),0.0,1.0);
c.rgb*=mix(.91,1.0,edge);gl_FragColor=vec4(max(c.rgb,vec3(0.0)),c.a);}`,
    });
    composer.addPass(grade);
    cleanup.push(() => grade.dispose());
    const focus = profile.depthOfField && scene.fog ? miniatureFocus() : null;
    if (focus) { composer.addPass(focus); cleanup.push(() => focus.dispose()); }
    const output = new OutputPass();
    composer.addPass(output);
    cleanup.push(() => output.dispose());
    const aa = target.samples === 0 ? new ShaderPass(FXAAShader) : null;
    if (aa) {
      composer.addPass(aa);
      cleanup.push(() => aa.dispose());
    }
    return {
      render: () => composer.render(),
      setAtmosphere,
      resize: (width: number, height: number) => {
        composer.setPixelRatio(renderer.getPixelRatio());
        composer.setSize(Math.max(1, width), Math.max(1, height));
        if (focus) focus.uniforms.resolution.value.set(Math.max(1, width) * renderer.getPixelRatio(), Math.max(1, height) * renderer.getPixelRatio());
        if (aa)
          aa.uniforms.resolution.value.set(
            1 / (Math.max(1, width) * renderer.getPixelRatio()),
            1 / (Math.max(1, height) * renderer.getPixelRatio()),
          );
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
