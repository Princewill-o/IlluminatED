import * as THREE from "three";

import { environmentPalette, type EnvironmentPhase } from "./environment-palette";

// Share the radial palette between the background and standard-material fog.
// A screen-space gradient follows the reference without an extra full-screen pass.
const atmosphere = {
  centre: { value: new THREE.Color() },
  edge: { value: new THREE.Color() },
  resolution: { value: new THREE.Vector2(1280, 720) },
};
const declarations = `uniform vec3 uHazeCentre,uHazeEdge; uniform vec2 uHazeResolution;
vec3 cityHazeColour(){
  vec2 p=gl_FragCoord.xy/max(uHazeResolution,vec2(1.0));
  float radial=smoothstep(.15,.85,length((p-vec2(.5,.38))*vec2(1.05,.8)));
  return mix(uHazeCentre,uHazeEdge,radial);
}`;

export function atmosphereShader(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.uHazeCentre = atmosphere.centre;
  shader.uniforms.uHazeEdge = atmosphere.edge;
  shader.uniforms.uHazeResolution = atmosphere.resolution;
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <fog_pars_fragment>", `#include <fog_pars_fragment>\n${declarations}`)
    .replace("#include <fog_fragment>", THREE.ShaderChunk.fog_fragment.replace("fogColor", "cityHazeColour()"));
}

export function createAtmosphere(scene: THREE.Scene, phase: EnvironmentPhase) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1,-1,0, 3,-1,0, -1,3,0],3));
  const material = new THREE.ShaderMaterial({
    uniforms: { uHazeCentre: atmosphere.centre, uHazeEdge: atmosphere.edge, uHazeResolution: atmosphere.resolution },
    depthWrite: false, depthTest: false,
    vertexShader: "void main(){gl_Position=vec4(position.xy,1.0,1.0);}",
    fragmentShader: `${declarations}\nvoid main(){gl_FragColor=vec4(cityHazeColour(),1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.name = "Radial atmospheric backdrop";
  sky.frustumCulled = false; sky.renderOrder = -10000;
  scene.add(sky);
  const colour = new THREE.Color();
  const update = (next: EnvironmentPhase, haze: number, dt: number) => {
    const tone = environmentPalette(next), blend = dt === Infinity ? 1 : 1-Math.exp(-Math.min(.1,dt)*1.5);
    atmosphere.centre.value.lerp(colour.set(tone.fog), blend);
    atmosphere.edge.value.lerp(colour.set(tone.fogEdge), blend);
    if (scene.background instanceof THREE.Color) scene.background.copy(atmosphere.centre.value);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(atmosphere.centre.value);
      scene.fog.near = 34 - haze*16;
      scene.fog.far = 70 - haze*24;
    }
  };
  update(phase,0,Infinity);
  return { update,
    resize: (width: number, height: number) => atmosphere.resolution.value.set(width,height),
    dispose: () => { sky.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}
