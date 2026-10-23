"use client";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { eyewear3d, held3d, hat3d, pet3d } from "./accessories3d";
import { faceCanvas } from "./character";
import { addUniformLogo } from "./uniform-logo3d";

import { BACK, BOTTOM, BRANDS, HAIR, SHOES, TOP } from "@/game/core/chibi-looks";
import { type Avatar, cosmeticById, look } from "@/game/core/cosmetics";
import { currentEvent } from "@/game/core/live-events";
import { outfitColours } from "@/game/core/outfits";

/**
 * Your character in 3D: IlluminatED's own chibi (big faceted head, small body),
 * modelled in Blender (art/blender/chibi.py) as one rigid rig carrying every
 * hairstyle, top, bottoms and shoe as a switchable mesh. We show one of each,
 * recolour by material (skin, hair, top, bottom, shoes) and add the drawn face,
 * the brand logo and accessories. Animations are generated here as ordinary
 * clips on the rig's pivots, so callers keep using `play` and `mixer`.
 */

const loader = new GLTFLoader();
let kit: Promise<THREE.Group> | null = null;
const loadKit = () => (kit ??= loader.loadAsync("/world3d/chibi.glb").then((g) => g.scene));

export const avatarColours = outfitColours;

function brandTexture(id: string) {
  const b = BRANDS[id];
  if (!b) return null;
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = b.bg;
  x.beginPath();
  if (b.shape === "circle") x.arc(128, 64, 60, 0, Math.PI * 2);
  else x.roundRect(b.shape === "pill" ? 8 : 68, 8, b.shape === "pill" ? 240 : 120, 112, b.shape === "pill" ? 56 : 16);
  x.fill();
  x.fillStyle = b.fg;
  x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `900 ${b.text.length > 4 ? 44 : 54}px system-ui, sans-serif`;
  x.fillText(b.text, 128, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------- animation: clips built from simple pose functions ---------------- */
type Pose = Partial<Record<"torso" | "head" | "arm-left" | "arm-right" | "leg-left" | "leg-right" | "root", [number, number, number]>> & { lift?: number };
const PI = Math.PI;
const POSES: Record<string, { length: number; loop: boolean; at: (t: number) => Pose }> = {
  static: { length: 1, loop: true, at: () => ({}) },
  idle: { length: 3, loop: true, at: (t) => { const s = Math.sin(t * 2 * PI / 3); return { "arm-left": [0, 0, -0.35 + s * 0.04], "arm-right": [0, 0, 0.35 - s * 0.04], torso: [s * 0.015, 0, 0], head: [-s * 0.02, 0, 0] }; } },
  // A bouncy, waddling walk: a little hop on every step and a side-to-side sway.
  walk: { length: 0.7, loop: true, at: (t) => { const w = t * 2 * PI / 0.7, s = Math.sin(w); return { "leg-left": [-s * 0.6, 0, 0], "leg-right": [s * 0.6, 0, 0], "arm-left": [s * 0.65, 0, -0.45], "arm-right": [-s * 0.65, 0, 0.45], torso: [0.06, s * 0.08, -s * 0.05], head: [0, 0, s * 0.06], root: [0, 0, s * 0.07], lift: Math.abs(Math.sin(w)) * 0.05 }; } },
  sprint: { length: 0.45, loop: true, at: (t) => { const s = Math.sin(t * 2 * PI / 0.45); return { "leg-left": [-s * 0.9, 0, 0], "leg-right": [s * 0.9, 0, 0], "arm-left": [s * 1.0, 0, -0.6], "arm-right": [-s * 1.0, 0, 0.6], torso: [0.2, s * 0.1, 0], lift: Math.abs(Math.cos(t * 2 * PI / 0.45)) * 0.025 }; } },
  sit: { length: 1, loop: true, at: () => ({ "leg-left": [-1.5, 0, 0.05], "leg-right": [-1.5, 0, -0.05], "arm-left": [-0.5, 0, -0.6], "arm-right": [-0.5, 0, 0.6], lift: -0.12 }) },
  drive: { length: 1, loop: true, at: () => ({ "leg-left": [-1.4, 0, 0.1], "leg-right": [-1.4, 0, -0.1], "arm-left": [-1.0, 0, -0.35], "arm-right": [-1.0, 0, 0.35], lift: -0.12 }) },
  crouch: { length: 1, loop: true, at: () => ({ "leg-left": [-0.6, 0, 0], "leg-right": [-0.6, 0, 0], torso: [0.35, 0, 0], lift: -0.05 }) },
  wave: { length: 0.8, loop: true, at: (t) => ({ "arm-right": [0, 0, -2.1 + Math.sin(t * 2 * PI / 0.8) * 0.35], "arm-left": [0, 0, -0.35], head: [0, 0, 0.1] }) },
  "emote-yes": { length: 0.8, loop: true, at: (t) => { const s = Math.sin(t * 2 * PI / 0.8); return { head: [0.18 + s * 0.18, 0, 0], "arm-left": [0, 0, 1.6 + s * 0.2], "arm-right": [0, 0, -1.6 - s * 0.2], lift: Math.max(0, s) * 0.03 }; } },
  "emote-no": { length: 0.8, loop: true, at: (t) => ({ head: [0, Math.sin(t * 2 * PI / 0.8) * 0.4, 0], "arm-left": [0, 0, -0.5], "arm-right": [0, 0, 0.5] }) },
  // Crouch, spring up with arms thrown high, tuck, land.
  jump: { length: 0.7, loop: false, at: (t) => { const k = t / 0.7; const crouch = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 0; const air = k > 0.15 && k < 0.85 ? Math.sin(((k - 0.15) / 0.7) * PI) : 0; return { "arm-left": [0, 0, 0.3 + air * 1.4], "arm-right": [0, 0, -0.3 - air * 1.4], "leg-left": [-crouch * 0.6 - air * 0.5, 0, 0], "leg-right": [-crouch * 0.6 - air * 0.2, 0, 0], torso: [crouch * 0.25, 0, 0], lift: air * 0.4 - crouch * 0.05 }; } },
  // Pedalling: legs turn alternate circles, hands on the bars, leaning in.
  cycle: { length: 0.6, loop: true, at: (t) => { const w = t * 2 * PI / 0.6; return { "leg-left": [-1.25 + Math.sin(w) * 0.45, 0, 0.08], "leg-right": [-1.25 - Math.sin(w) * 0.45, 0, -0.08], "arm-left": [-1.15, 0, -0.25], "arm-right": [-1.15, 0, 0.25], torso: [0.28, Math.sin(w) * 0.04, 0], head: [-0.15, 0, 0], lift: -0.1 + Math.abs(Math.cos(w)) * 0.01 }; } },
  "cycle-coast": { length: 1, loop: true, at: () => ({ "leg-left": [-1.0, 0, 0.08], "leg-right": [-1.5, 0, -0.08], "arm-left": [-1.15, 0, -0.25], "arm-right": [-1.15, 0, 0.25], torso: [0.25, 0, 0], head: [-0.12, 0, 0], lift: -0.1 }) },
  fall: { length: 1, loop: true, at: () => ({ "arm-left": [0, 0, 1.2], "arm-right": [0, 0, -1.2], "leg-left": [-0.3, 0, 0] }) },
  die: { length: 0.6, loop: false, at: (t) => { const k = Math.min(1, t / 0.5); return { root: [-k * PI / 2, 0, 0], "arm-left": [0, 0, k * 0.8], "arm-right": [0, 0, -k * 0.8], lift: k * 0.09 }; } },
  "pick-up": { length: 0.8, loop: false, at: (t) => { const k = Math.sin((t / 0.8) * PI); return { torso: [k * 0.6, 0, 0], "arm-right": [-k * 1.2, 0, 0.3], "arm-left": [-k * 1.2, 0, -0.3], "leg-left": [-k * 0.4, 0, 0], "leg-right": [-k * 0.4, 0, 0] }; } },
  "holding-right": { length: 1, loop: true, at: () => ({ "arm-right": [-1.1, 0, 0.3], "arm-left": [0, 0, -0.35] }) },
  "holding-left": { length: 1, loop: true, at: () => ({ "arm-left": [-1.1, 0, -0.3], "arm-right": [0, 0, 0.35] }) },
  "holding-both": { length: 1, loop: true, at: () => ({ "arm-left": [-1.1, 0, -0.1], "arm-right": [-1.1, 0, 0.1] }) },
  "attack-melee-right": { length: 0.5, loop: true, at: (t) => { const k = Math.sin((t / 0.5) * PI); return { "arm-right": [-0.4 - k * 1.4, 0, 0.6 - k * 0.6], torso: [0, -k * 0.35, 0], "arm-left": [-0.6, 0, -0.5] }; } },
  "attack-melee-left": { length: 0.5, loop: true, at: (t) => { const k = Math.sin((t / 0.5) * PI); return { "arm-left": [-0.4 - k * 1.4, 0, -0.6 + k * 0.6], torso: [0, k * 0.35, 0], "arm-right": [-0.6, 0, 0.5] }; } },
  "attack-kick-right": { length: 0.5, loop: true, at: (t) => ({ "leg-right": [-Math.sin((t / 0.5) * PI) * 1.3, 0, 0], torso: [-0.15, 0, 0] }) },
  "interact-right": { length: 0.8, loop: true, at: (t) => ({ "arm-right": [-1.2 - Math.sin(t * 2 * PI / 0.8) * 0.15, 0, 0.2] }) },
  "interact-left": { length: 0.8, loop: true, at: (t) => ({ "arm-left": [-1.2 - Math.sin(t * 2 * PI / 0.8) * 0.15, 0, -0.2] }) },
};
// Clips reached through other names elsewhere in the game.
for (const [alias, to] of [["holding-right-shoot", "holding-right"], ["holding-left-shoot", "holding-left"], ["holding-both-shoot", "holding-both"], ["wheelchair-sit", "sit"], ["cheer", "emote-yes"], ["dance", "emote-yes"], ["run", "sprint"]] as const) POSES[alias] = POSES[to];

const NODES = ["root", "torso", "head", "arm-left", "arm-right", "leg-left", "leg-right"] as const;
let CLIPS: Map<string, THREE.AnimationClip> | null = null;
function clips(rest: Record<string, THREE.Vector3>) {
  if (CLIPS) return CLIPS;
  CLIPS = new Map();
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const [name, def] of Object.entries(POSES)) {
    const steps = def.loop ? 24 : 18;
    const times = Array.from({ length: steps + 1 }, (_, i) => (i / steps) * def.length);
    const tracks: THREE.KeyframeTrack[] = [];
    for (const node of NODES) {
      const values: number[] = [];
      for (const t of times) {
        const r = def.at(t)[node] ?? [0, 0, 0];
        q.setFromEuler(e.set(r[0], r[1], r[2], "XYZ"));
        values.push(q.x, q.y, q.z, q.w);
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${node}.quaternion`, times, values));
    }
    const base = rest.root ?? new THREE.Vector3();
    tracks.push(new THREE.VectorKeyframeTrack("root.position", times, times.flatMap((t) => [base.x, base.y + (def.at(t).lift ?? 0), base.z])));
    CLIPS.set(name, new THREE.AnimationClip(name, def.length, tracks));
  }
  return CLIPS;
}

export interface Character3D {
  object: THREE.Group;
  mixer: THREE.AnimationMixer;
  play: (clip: string) => void;
  update: (dt: number, reducedMotion?: boolean) => void;
  dispose: () => void;
}

/** Builds your dressed 3D character at about `height` units tall. */
export async function buildCharacter(a: Avatar, height = 1.15, workplaceLogo: string | null = null): Promise<Character3D> {
  const source = await loadKit();
  const object = source.clone(true) as THREE.Group;
  const cols = avatarColours(a);
  const top = TOP[a.top] ?? TOP["top-tee"];
  const want: Record<string, string | null> = {
    hair: HAIR[a.hair] === undefined ? "short" : HAIR[a.hair],
    top: top.v,
    bottom: BOTTOM[a.bottom] ?? "trousers",
    shoes: SHOES[a.shoes] ?? "trainers",
    back: BACK[a.back ?? ""]?.v ?? null,
    extra: null,
  };
  const backItem = BACK[a.back ?? ""];
  const backColour = cosmeticById(a.back ?? "")?.color ?? "#e8473b";
  const colour: Record<string, string> = {
    skin: cols.skin, hair: cols.hair, top: cols.top, top2: top.second ?? "#ffffff", bottom: cols.bottom,
    shoes: cols.shoes, sole: "#2b2b33", white: "#ffffff", dark: "#15151c",
    lens: backItem?.v === "wings-fairy" && !top.extras?.length ? backColour : "#1d2a5c", gear: "#15151c",
    pack: backColour, pack2: backItem?.second ?? "#ffcf4a", metal: "#c9cbd6", membrane: backColour,
    accent: top.accent ? top.accent : a.top === "top-hivis" ? "#d8dde3" : a.top === "top-cape" ? "#c4433a" : a.shoes === "shoes-rocket" ? "#ff9f1c" : a.shoes === "shoes-skates" ? "#ff8fd1" : "#ff9f1c",
  };
  if (a.top === "top-hivis") colour.top = "#d7ff3a";
  // One material per fabric, shared by every piece of this character.
  // Soft, smooth "toy" materials (the kit is modelled smooth with bevelled edges).
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const matFor = (name: string) => {
    let m = mats.get(name);
    if (!m) {
      const metal = name === "metal" || name === "gear";
      m = new THREE.MeshStandardMaterial({
        color: colour[name] ?? "#cccccc",
        roughness: name === "skin" ? 0.6 : name === "hair" ? 0.55 : metal ? 0.35 : name === "sole" ? 0.7 : 0.85,
        metalness: metal ? 0.6 : 0,
        ...(name === "lens" ? { transparent: true, opacity: 0.55, roughness: 0.1 } : {}),
      });
      mats.set(name, m);
    }
    return m;
  };
  const drop: THREE.Object3D[] = [];
  object.traverse((o) => {
    const slot = o.userData.slot as string | undefined;
    if (!slot) return;
    const extras = new Set([...(top.extras ?? []), ...(top.cape ? ["cape"] : [])]);
    if (slot === "extra" ? !extras.has(o.userData.variant) : slot !== "body" && want[slot] !== o.userData.variant) { drop.push(o); return; }
    o.traverse((m) => {
      const mesh = m as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = (mesh.material as THREE.Material).name || "skin";
      mesh.material = matFor(name);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  });
  drop.forEach((o) => o.removeFromParent());
  object.updateMatrixWorld(true);

  // Face: the drawn eyes and mouth, wrapped onto the front of the head.
  const head = object.getObjectByName("head")!;
  let headMesh: THREE.Object3D | undefined;
  head.traverse((o) => { if (o.userData.variant === "head" && o.userData.slot === "body") headMesh = o; });
  const hb = new THREE.Box3().setFromObject(headMesh ?? head);
  const hc = hb.getCenter(new THREE.Vector3());
  const hw = hb.max.x - hb.min.x, hh = hb.max.y - hb.min.y, hd = hb.max.z - hb.min.z;
  const faceGeo = new THREE.SphereGeometry(0.5, 24, 16, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.3, Math.PI * 0.42);
  faceGeo.scale(hw * 1.012, hh * 1.012, hd * 1.012);
  {
    const pos = faceGeo.attributes.position, uv = faceGeo.attributes.uv;
    const size = hw * 0.78;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, -pos.getX(i) / size + 0.5, (pos.getY(i) + hh * 0.06) / size + 0.5);
    for (let i = 0; i < pos.count; i++) uv.setX(i, pos.getX(i) / size + 0.5);
  }
  const faceTex = (av: Avatar) => { const t = new THREE.CanvasTexture(faceCanvas(av)); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const expressions = [faceTex(a), faceTex({ ...a, eyes: "eyes-sleepy" }), faceTex({ ...a, brows: "brows-raised", mouth: "mouth-grin" }), faceTex({ ...a, eyes: "eyes-focused", mouth: "mouth-small" })];
  const face = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ map: expressions[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  face.name = "animated-face";
  face.userData.expressions = expressions;
  face.position.copy(head.worldToLocal(hc.clone()));
  head.add(face);

  // Brand logo on the chest.
  const torso = object.getObjectByName("torso")!;
  const logo = brandTexture(a.brand ?? "");
  if (logo && a.top !== "top-astronaut") {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(hw * 0.32, hw * 0.16), new THREE.MeshBasicMaterial({ map: logo, transparent: true, polygonOffset: true, polygonOffsetFactor: -3 }));
    let topPiece: THREE.Object3D = torso;
    torso.traverse((o) => { if (o.userData.slot === "top" && o.parent === torso && topPiece === torso) topPiece = o; });
    const tb = new THREE.Box3().setFromObject(topPiece);
    patch.position.copy(torso.worldToLocal(new THREE.Vector3(hw * 0.12, tb.min.y + (tb.max.y - tb.min.y) * 0.62, tb.max.z - (tb.max.z - tb.min.z) * 0.07)));
    patch.rotation.x = -0.18;
    patch.name = "brand-logo";
    torso.add(patch);
  }

  // Hat, eyewear and held item ride on the head and hand pivots.
  const hat = hat3d(a.hat ?? "", "#8fb4ff");
  if (hat) { hat.scale.setScalar(hw); hat.position.copy(head.worldToLocal(new THREE.Vector3(hc.x, hb.max.y - hh * 0.2, hc.z))); head.add(hat); }
  const eye = eyewear3d(a.face ?? "", "#1b1622");
  if (eye) { eye.scale.setScalar(hw * 0.85); eye.position.copy(head.worldToLocal(new THREE.Vector3(hc.x, hc.y - hh * 0.04, hb.max.z + hw * 0.02))); head.add(eye); }
  const arm = object.getObjectByName("arm-right");
  const item = held3d(a.held ?? "");
  let hand: THREE.Object3D | null = null;
  arm?.traverse((o) => { if (o.userData.variant === "hand") hand = o; });
  if (item && arm) {
    const hp = new THREE.Vector3();
    (hand ?? arm).getWorldPosition(hp);
    item.scale.setScalar(hh * 1.1);
    item.position.copy(arm.worldToLocal(hp.add(new THREE.Vector3(0, -hh * 0.05, hh * 0.08))));
    arm.add(item);
  }
  let torsoMesh: THREE.Object3D | null = null;
  torso.traverse((o) => { if (o.userData.variant === "torso") torsoMesh = o; });
  addUniformLogo(object, torsoMesh as THREE.SkinnedMesh | null, workplaceLogo);
  object.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.frustumCulled = false; });

  const bb = new THREE.Box3().setFromObject(object);
  object.scale.setScalar(height / Math.max(0.01, bb.max.y - bb.min.y));
  const holder = new THREE.Group();
  holder.add(object);

  const rest: Record<string, THREE.Vector3> = {};
  for (const n of NODES) { const node = object.getObjectByName(n); if (node) rest[n] = node.position.clone(); }
  const library = clips(rest);
  const mixer = new THREE.AnimationMixer(object);
  let current: THREE.AnimationAction | null = null;
  let currentName = "idle";
  const play: Character3D["play"] = (name) => {
    const clip = library.get(name);
    if (!clip) return;
    currentName = name;
    const next = mixer.clipAction(clip);
    if (next === current) return;
    const once = !POSES[name].loop;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    next.play();
    if (current) current.crossFadeTo(next, 0.18, false);
    current = next;
  };
  play("idle");

  let t = Math.random() * 4;
  const update = (dt: number, reducedMotion = false) => {
    mixer.update(dt);
    t += Math.max(0, dt);
    const blink = !reducedMotion && t % 4.3 < 0.14;
    const expression = blink ? 1 : /wave|dance|cheer|emote-yes/.test(currentName) ? 2 : /sprint|attack/.test(currentName) ? 3 : 0;
    face.material.map = expressions[expression];
  };

  const pet = pet3d(a.pet ?? "");
  if (pet) {
    pet.scale.setScalar(height / 1.15);
    pet.position.set(height * 0.5, 0, -height * 0.15);
    pet.userData.pet = true;
    holder.add(pet);
  }

  let released = false;
  const dispose = () => {
    if (released) return;
    released = true;
    mixer.stopAllAction(); mixer.uncacheRoot(object);
    expressions.forEach((x) => x.dispose());
    logo?.dispose();
    mats.forEach((m) => m.dispose());
    faceGeo.dispose(); face.material.dispose();
    holder.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.material && (mesh.material as THREE.Material).userData?.sharedAccessory) return;
      if (o.userData.pet || o.parent?.userData.pet) return;
    });
    holder.removeFromParent(); holder.clear();
  };
  return { object: holder, mixer, play, update, dispose };
}

/** Londoners: varied looks for people in the street, on trains and in buildings. */
const NPC_SKIN = ["skin-1", "skin-2", "skin-3", "skin-4", "skin-5", "skin-6", "skin-7", "skin-8"];
const NPC_HAIR = ["hair-short", "hair-bob", "hair-ponytail", "hair-curly", "hair-buzz", "hair-long", "hair-braids", "hair-buns", "hair-quiff", "hair-afro", "hair-spiky"];
const NPC_HAIRCOL = ["haircol-black", "haircol-brown", "haircol-blonde", "haircol-auburn", "haircol-ginger", "haircol-silver"];
const NPC_TOP = ["top-hoodie", "top-suit", "top-tee", "top-denim", "top-knit", "top-hivis", "top-polo", "top-stripes", "top-tracksuit"];
const NPC_BOTTOM = ["bottom-jeans", "bottom-smart", "bottom-joggers", "bottom-skirt", "bottom-cargo", "bottom-shorts"];
const NPC_SHOES = ["shoes-trainers", "shoes-hightops", "shoes-boots", "shoes-smart", "shoes-sliders"];
const NPC_BRAND = ["brand-none", "brand-volt", "brand-northwind", "brand-none", "brand-thamesline", "brand-peckham", "brand-orbit"];
/** During Hero Week, one Londoner in four wears a Lumen League suit. */
const NPC_HEROES = ["top-hero-quotient", "top-hero-photon", "top-hero-helix", "top-hero-catalyst", "top-hero-byte", "top-hero-quill"];
export const npcLook = (i: number) =>
  look({
    skin: NPC_SKIN[(i * 3 + 1) % 8], hair: NPC_HAIR[(i * 7) % 11], hairColor: NPC_HAIRCOL[(i * 5) % 6],
    top: NPC_TOP[(i * 2 + 1) % 9], bottom: NPC_BOTTOM[i % 6], shoes: NPC_SHOES[(i * 3) % 5], brand: NPC_BRAND[(i * 5) % 7],
    ...(currentEvent().event.id === "hero-week" && i % 4 === 0 ? {} : { topColor: ["topcol-purple", "topcol-teal", "topcol-yellow", "topcol-red", "topcol-green", "topcol-blue"][i % 6] }),
    bottomColor: ["botcol-navy", "botcol-black", "botcol-beige"][i % 3],
    ...(currentEvent().event.id === "hero-week" && i % 4 === 0 ? { top: NPC_HEROES[(i / 4) % 6 | 0], topColor: "topcol-auto" } : {}),
  });
