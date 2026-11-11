import * as THREE from "three";

/** Adapted from the lighting model in Bruno Simon's folio-2025 (MIT).
 * Keep r169's PBR specular response while art-directing diffuse shadows and
 * low bounced light. The original TSL/WebGPU shader cannot run on this renderer.
 * See public/world3d/folio-reference/LICENSE.txt and docs/reference-analysis. */
export const illustratedLight = {
  strength: { value: 0 },
  sun: { value: new THREE.Vector3(-10, 22, 12).normalize() },
  lit: { value: new THREE.Color("#ffd2c2") },
  shadow: { value: new THREE.Color("#9182d6") },
  bounce: { value: new THREE.Color("#bc9672") },
};

// Catch the directional result already sampled by Three.js. A second shadow
// lookup for the art pass would double the most expensive fragment work.
const capturedLights = THREE.ShaderChunk.lights_fragment_begin.replace(
  /directLight\.color \*= ([^\n]*getShadow\( directionalShadowMap[^\n]+);/,
  (_line, factor: string) => `illustratedSunShadow = ${factor};
    illustratedDropShadow = min(illustratedDropShadow, illustratedSunShadow);
    directLight.color *= illustratedSunShadow;`,
).replace(
  "#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )",
  "vec3 illustratedLocalDiffuse=reflectedLight.directDiffuse;\n#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )",
);

export function illustratedLightShader(
  shader: THREE.WebGLProgramParametersWithUniforms,
) {
  shader.uniforms.uIllustratedStrength = illustratedLight.strength;
  shader.uniforms.uIllustratedSun = illustratedLight.sun;
  shader.uniforms.uIllustratedLit = illustratedLight.lit;
  shader.uniforms.uIllustratedShadow = illustratedLight.shadow;
  shader.uniforms.uIllustratedBounce = illustratedLight.bounce;
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      "#include <common>\nvarying float vIllustratedHeight;",
    )
    .replace(
      "#include <project_vertex>",
      `
      vec4 illustratedPoint=vec4(transformed,1.0);
      #ifdef USE_BATCHING
        illustratedPoint=batchingMatrix*illustratedPoint;
      #endif
      #ifdef USE_INSTANCING
        illustratedPoint=instanceMatrix*illustratedPoint;
      #endif
      vIllustratedHeight=(modelMatrix*illustratedPoint).y;
      #include <project_vertex>`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      uniform float uIllustratedStrength;
      uniform vec3 uIllustratedSun,uIllustratedLit,uIllustratedShadow,uIllustratedBounce;
      varying float vIllustratedHeight;`,
    )
    .replace(
      "#include <lights_fragment_begin>",
      `float illustratedDropShadow=1.0; float illustratedSunShadow=1.0;\n${capturedLights}`,
    )
    .replace(
      "#include <lights_fragment_end>",
      `#include <lights_fragment_end>
      vec3 illustratedNormal=inverseTransformDirection(normal,viewMatrix);
      float illustratedCore=smoothstep(-.25,1.0,dot(illustratedNormal,uIllustratedSun));
      float illustratedVisibility=min(illustratedCore,illustratedDropShadow);
      vec3 illustratedShade=mix(uIllustratedShadow,uIllustratedLit*1.25,illustratedVisibility);
      float illustratedBounce=pow(max(0.0,1.0-max(0.0,vIllustratedHeight)/1.5),2.0)
        *smoothstep(-1.0,1.0,-illustratedNormal.y)*.22;
      vec3 illustratedDiffuse=material.diffuseColor*illustratedShade;
      illustratedDiffuse=mix(illustratedDiffuse,material.diffuseColor*uIllustratedBounce,illustratedBounce);
      // Retain authored roughness, metal, glass and emissive behaviour.
      // Keep local lamps physically warm and bright; art-direct only sunlight.
      reflectedLight.directDiffuse=mix(reflectedLight.directDiffuse-illustratedLocalDiffuse,illustratedDiffuse,uIllustratedStrength)+illustratedLocalDiffuse;
      reflectedLight.indirectDiffuse*=1.0-uIllustratedStrength*.8;`,
    );
}

// Sunlit and shaded tones per time of day. Night is properly dark so lamps and windows glow.
const SHADOW = { day: "#8f86d0", dusk: "#7a4fa8", night: "#262f5c" };
const SUN = { day: "#fff0dc", dusk: "#ffae80", night: "#5b6db4" };
const lit = new THREE.Color(), shade = new THREE.Color(), grey = new THREE.Color();
/**
 * `gloom` (0..1) flattens the light on grey, wet days; `snow` brightens and cools it
 * (fresh snow bounces light back up into the shadows).
 */
export function updateIllustratedLight(
  phase: "day" | "dusk" | "night",
  indoors: boolean,
  weather: { gloom?: number; snow?: number; flash?: number } = {},
) {
  const gloom = weather.gloom ?? 0, snow = weather.snow ?? 0, flash = weather.flash ?? 0;
  illustratedLight.strength.value = indoors ? 0 : 0.62;
  lit.set(SUN[phase]); shade.set(SHADOW[phase]);
  // Overcast: sun and shade converge on a soft grey (no hard sunny contrast).
  grey.copy(lit).lerp(shade, .55).lerp(new THREE.Color(phase === "night" ? "#2a3150" : "#a7adbd"), .5);
  lit.lerp(grey, gloom * .75); shade.lerp(grey, gloom * .45);
  if (snow) { lit.lerp(new THREE.Color(phase === "night" ? "#7d8fc8" : "#f2f6ff"), snow * .5); shade.lerp(new THREE.Color(phase === "night" ? "#3b4878" : "#a9b6e0"), snow * .5); }
  if (flash) { lit.lerp(new THREE.Color("#eef2ff"), flash); shade.lerp(new THREE.Color("#c9d2f5"), flash); }
  illustratedLight.shadow.value.copy(shade);
  illustratedLight.lit.value.copy(lit);
}
