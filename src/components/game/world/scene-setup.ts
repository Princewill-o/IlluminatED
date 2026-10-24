import * as THREE from "three";

import type { visualProfile } from "@/game/core/visual-quality";

/**
 * Renderer, lights and shadows for every 3D scene in the game, in one place.
 *
 *   const renderer = createRenderer(visual);           // MSAA, sRGB, soft shadows
 *   const lights = createLighting(scene, { phase, indoors, visual });
 *   addGameObject(world, myModel);                     // drop anything in: it casts and receives shadows
 *   followSun(lights.sun, focus);                      // each frame: keep the sharp shadow box on the player
 */
export type Visual = ReturnType<typeof visualProfile>;
export type Phase = "day" | "dusk" | "night";

/** WebGL renderer with hardware MSAA, correct sRGB output and soft PCF shadow maps. */
export function createRenderer(visual: Visual) {
  const renderer = new THREE.WebGLRenderer({
    // MSAA on the default framebuffer. When post-processing is on, the composer
    // uses its own multisampled targets (visual.samples) instead.
    antialias: visual.msaa,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(visual.pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = visual.exposure;
  renderer.shadowMap.enabled = visual.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  return renderer;
}

const SKY: Record<Phase, { sky: string; ground: string; sun: string; sunPower: number; ambient: number }> = {
  day: { sky: "#aab8e7", ground: "#9c816b", sun: "#ffd394", sunPower: 3.0, ambient: 0.13 },
  dusk: { sky: "#a0a7d0", ground: "#876653", sun: "#ffad67", sunPower: 2.3, ambient: 0.14 },
  night: { sky: "#7497c9", ground: "#3c5057", sun: "#a7c5f5", sunPower: 0.7, ambient: 0.15 },
};
export const skyColours = (phase: Phase) => SKY[phase];

/**
 * Ambient light for overall environment brightness, a soft sky/ground fill,
 * and a directional sun that casts sharp-but-smooth shadows.
 */
export function createLighting(scene: THREE.Scene, { phase, indoors, visual }: { phase: Phase; indoors: boolean; visual: Visual }) {
  const tone = SKY[phase];
  const ambient = new THREE.AmbientLight("#ffffff", indoors ? 0.5 : tone.ambient);
  const hemi = new THREE.HemisphereLight(tone.sky, tone.ground, indoors ? 1.45 : phase === "night" ? 0.7 : 0.85);
  const sun = new THREE.DirectionalLight(tone.sun, indoors ? 1.2 : tone.sunPower);
  sun.castShadow = visual.shadows;
  // A tight shadow box that follows the player keeps every texel close to the
  // camera: crisp contact shadows, softened by PCF filtering.
  sun.shadow.mapSize.set(visual.shadowSize, visual.shadowSize);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.018;
  sun.shadow.radius = 4;
  if (indoors) {
    hemi.color.set("#fff8ec");
    hemi.groundColor.set("#b8b5ab");
    sun.color.set("#fff5df");
  }
  scene.add(ambient, hemi, sun, sun.target);
  return { ambient, hemi, sun };
}

/** Keeps the sun's shadow box centred on what the camera is looking at. */
export function followSun(sun: THREE.DirectionalLight, focus: THREE.Vector3) {
  sun.position.set(focus.x - 10, 22, focus.z + 12);
  sun.target.position.copy(focus);
}

/**
 * Drop any model into the scene: every mesh casts and receives shadows
 * (transparent ones only receive, so glass and water don't cast black shapes).
 */
export function addGameObject(parent: THREE.Object3D, object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.castShadow = !materials.some((m) => m.transparent);
    mesh.receiveShadow = true;
  });
  parent.add(object);
  return object;
}
