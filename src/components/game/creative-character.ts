"use client";

import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import { eyewear3d, hat3d, held3d, pet3d } from "./accessories3d";
import { activityPose, preparePoseAxes } from "./activity-pose";

import { BRANDS } from "@/game/core/chibi-looks";
import { type Avatar } from "@/game/core/cosmetics";
import { CREATIVE_KIT, kitLook, type HairExtra } from "@/game/core/creative-looks";
import PALETTE from "@/game/core/creative-palette.json";
import { logoFor } from "@/game/core/logos";
import { outfitColours } from "@/game/core/outfits";

export interface Character3D {
  object: THREE.Group;
  mixer: THREE.AnimationMixer;
  play: (clip: string) => void;
  update: (dt: number, reducedMotion?: boolean, motion?: { speed: number; turn: number }) => void;
  dispose: () => void;
}

// ── Dyeing: the kit's texture is a colour gradient, so a piece is recoloured by moving its UVs ──
const rgb = (hex: string) => [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)] as const;
const CELLS = PALETTE.rows.map((row) => Array.from({ length: PALETTE.nu }, (_, i) => rgb(row.slice(i * 6, i * 6 + 6))));
const lightness = ([r, g, b]: readonly number[]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
/** Smooth (bilinear) lightness of the gradient at a UV, so neighbouring vertices don't jump between cells. */
const lightAt = (u: number, v: number) => {
  if (u >= PALETTE.uMax) return 0.98;
  const fx = Math.min(PALETTE.nu - 1.001, Math.max(0, (u / PALETTE.uMax) * PALETTE.nu - 0.5));
  const fy = Math.min(PALETTE.nv - 1.001, Math.max(0, v * PALETTE.nv - 0.5));
  const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
  const l = (a: number, b: number) => lightness(CELLS[b][a]);
  return (l(i, j) * (1 - tx) + l(i + 1, j) * tx) * (1 - ty) + (l(i, j + 1) * (1 - tx) + l(i + 1, j + 1) * tx) * ty;
};
const targets = new Map<string, { u: number; v: number }>();
/** The palette cell closest to a colour (weighted RGB distance). */
function paletteFor(hex: string) {
  const key = hex.toLowerCase();
  const hit = targets.get(key);
  if (hit) return hit;
  const c = new THREE.Color(key);
  const t = [c.r * 255, c.g * 255, c.b * 255];
  let best = { u: 0.5, v: 0.5 }, bestD = Infinity;
  CELLS.forEach((row, j) => row.forEach((p, i) => {
    const rm = (p[0] + t[0]) / 2, dr = p[0] - t[0], dg = p[1] - t[1], db = p[2] - t[2];
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bestD) { bestD = d; best = { u: ((i + 0.5) / PALETTE.nu) * PALETTE.uMax, v: (j + 0.5) / PALETTE.nv }; }
  }));
  targets.set(key, best);
  return best;
}
const dyed = new Map<string, THREE.BufferGeometry>();
/** A copy of a piece with every texel moved to the target colour, keeping its light and dark details. */
function dyeGeometry(source: THREE.BufferGeometry, hex: string) {
  const key = `${source.uuid}:${hex}`;
  const hit = dyed.get(key);
  if (hit) return hit;
  const uv = source.getAttribute("uv");
  if (!uv) return source;
  const light = new Float32Array(uv.count);
  let mean = 0;
  for (let k = 0; k < uv.count; k++) { light[k] = lightAt(uv.getX(k), uv.getY(k)); mean += light[k]; }
  mean /= Math.max(1, uv.count);
  const target = paletteFor(hex);
  const lo = target.v < 0.5 ? 0.01 : 0.51, hi = target.v < 0.5 ? 0.49 : 0.99;
  const next = new Float32Array(uv.count * 2);
  for (let k = 0; k < uv.count; k++) {
    next[k * 2] = target.u;
    // Lighter details (stripes, cuffs) sit higher on the gradient, darker ones lower.
    next[k * 2 + 1] = Math.min(hi, Math.max(lo, target.v + (mean - light[k]) * 0.3));
  }
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) geometry.setAttribute(name, name === "uv" ? new THREE.BufferAttribute(next, 2) : attribute);
  geometry.setIndex(source.index);
  geometry.boundingBox = source.boundingBox;
  geometry.boundingSphere = source.boundingSphere;
  dyed.set(key, geometry);
  return geometry;
}

const loaded = new Map<string, Promise<GLTF>>();
function loadKit(load: (url: string) => Promise<GLTF>) {
  let kit = loaded.get(CREATIVE_KIT);
  if (!kit) { kit = load(CREATIVE_KIT); loaded.set(CREATIVE_KIT, kit); kit.catch(() => loaded.delete(CREATIVE_KIT)); }
  return kit;
}

/** Head size and position in model space, measured once from the body's head-weighted vertices. */
let headInfo: { centre: THREE.Vector3; radius: number; top: number } | null = null;
function measureHead(body: THREE.SkinnedMesh) {
  if (headInfo) return headInfo;
  const head = body.skeleton.bones.findIndex((b) => /Head$/.test(b.name));
  const pos = body.geometry.getAttribute("position"), joints = body.geometry.getAttribute("skinIndex"), weights = body.geometry.getAttribute("skinWeight");
  const box = new THREE.Box3(), v = new THREE.Vector3();
  for (let k = 0; k < pos.count; k++) {
    let w = 0;
    for (let c = 0; c < 4; c++) if (joints.getComponent(k, c) === head) w += weights.getComponent(k, c);
    if (w > 0.6) box.expandByPoint(v.fromBufferAttribute(pos, k).applyMatrix4(body.bindMatrix));
  }
  if (box.isEmpty()) box.set(new THREE.Vector3(-0.14, 1.5, -0.14), new THREE.Vector3(0.14, 1.82, 0.14));
  const size = box.getSize(new THREE.Vector3());
  headInfo = { centre: box.getCenter(new THREE.Vector3()), radius: Math.max(size.x, size.z) / 2, top: box.max.y };
  return headInfo;
}

/** An empty under a bone whose axes and scale match the model, so items are placed in plain model units. */
function anchorOn(body: THREE.SkinnedMesh, name: string) {
  const index = body.skeleton.bones.findIndex((b) => b.name.replace(/^mixamorig:?/, "") === name);
  if (index < 0) return null;
  const bone = body.skeleton.bones[index];
  const rest = new THREE.Matrix4().copy(body.skeleton.boneInverses[index]).invert();
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  rest.decompose(p, q, s);
  const anchor = new THREE.Group();
  anchor.quaternion.copy(q).invert();
  anchor.scale.set(1 / s.x, 1 / s.y, 1 / s.z);
  anchor.userData.restPosition = p;
  bone.add(anchor);
  return anchor;
}

/** Soft extra hair shapes for styles the kit has no haircut for. Sizes are in head radii. */
function hairShapes(extra: HairExtra, material: THREE.Material, r: number) {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x * r, y * r, z * r); m.scale.set(sx, sy, sz); m.rotation.x = rx; m.castShadow = true; g.add(m);
  };
  const ball = (k: number) => new THREE.SphereGeometry(k * r, 20, 14);
  switch (extra) {
    case "long": add(ball(0.95), 0, -0.35, -0.42, 1.05, 1.5, 0.6); break;
    case "bob": add(ball(1.02), 0, -0.05, -0.18, 1.08, 0.95, 0.95); break;
    case "ponytail": add(ball(0.32), 0, 0.15, -1.05); add(ball(0.3), 0, -0.45, -1.15, 0.85, 1.9, 0.85, 0.2); break;
    case "buns": add(ball(0.36), -0.55, 0.85, -0.1); add(ball(0.36), 0.55, 0.85, -0.1); break;
    case "braids":
      for (const x of [-0.55, 0.55]) add(new THREE.CapsuleGeometry(0.13 * r, 1.1 * r, 6, 10), x, -0.85, -0.55);
      break;
    case "afro":
      add(ball(1.12), 0, 0.55, -0.32, 1.05, 0.85, 1);
      break;
    case "spiky":
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const m = new THREE.Mesh(new THREE.ConeGeometry(0.2 * r, 0.6 * r, 8), material); m.position.set(Math.cos(a) * 0.55 * r, 0.92 * r, Math.sin(a) * 0.55 * r - 0.1 * r); m.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(m); }
      break;
    case "mohawk": add(new THREE.BoxGeometry(0.22 * r, 0.5 * r, 1.7 * r), 0, 0.95, -0.12); break;
  }
  return g;
}

/** Clip names the rest of the game asks for, mapped to the kit's own animations. No fighting moves. */
const ALIASES: Record<string, string> = {
  static: "idle", sprint: "run", die: "fall", death: "fall", "pick-up": "relaxed", "emote-yes": "relaxed", "emote-no": "look",
  celebrate: "relaxed", cheer: "relaxed", attack: "relaxed", punch: "relaxed", "attack-melee-right": "relaxed", "attack-melee-left": "relaxed",
  "attack-kick-right": "relaxed", "interact-right": "relaxed", "interact-left": "relaxed", sit: "idle", drive: "idle", "wheelchair-sit": "idle",
  crouch: "crouch", cycle: "walk", "cycle-coast": "idle", "holding-right": "idle", "holding-left": "idle", "holding-both": "idle",
  "holding-right-shoot": "relaxed", "holding-left-shoot": "relaxed", "holding-both-shoot": "relaxed", "carry-walk": "walk", climb: "climb",
  "walk-back": "walk-back", jump: "jump", fall: "fall", land: "land", look: "look",
};
const ONCE = new Set(["jump", "land", "look", "relaxed"]);

export async function buildCreativeCharacter(
  a: Avatar, height: number, workplaceLogo: string | null, load: (url: string) => Promise<GLTF>, accessories = true,
): Promise<Character3D> {
  const kit = await loadKit(load);
  const look = kitLook(a);
  const object = clone(kit.scene) as THREE.Group;
  object.userData.characterModel = "creative-kit";
  const wanted = new Set<string>(["Body_010", look.face, look.top.mesh, look.bottom.mesh, look.shoes.mesh].concat(
    [look.hair, look.socks ? "Socks_008" : null, look.kitHat, look.kitGlasses, look.gloves ? "Gloves_014" : null, look.moustache].filter((x): x is string => !!x)));
  const dyes: Record<string, string> = {
    [look.top.mesh]: look.top.colour, [look.bottom.mesh]: look.bottom.colour, [look.shoes.mesh]: look.shoes.colour,
    ...(look.hair ? { [look.hair]: look.hairColour } : {}), ...(look.socks ? { Socks_008: look.socks } : {}),
    ...(look.gloves ? { Gloves_014: look.gloves } : {}), ...(look.moustache ? { [look.moustache]: look.hairColour } : {}),
  };
  const materials = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>(), skeletons = new Set<THREE.Skeleton>();
  const unused: THREE.Object3D[] = [];
  let body: THREE.SkinnedMesh | null = null;
  let cloth: THREE.MeshStandardMaterial | null = null;
  object.traverse((node) => {
    const mesh = node as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    const owner = wanted.has(mesh.name) ? mesh.name : wanted.has(mesh.parent?.name ?? "") ? mesh.parent!.name : null;
    if (!owner) { unused.push(mesh); return; }
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    if (mesh.isSkinnedMesh) skeletons.add(mesh.skeleton);
    const original = mesh.material as THREE.MeshStandardMaterial;
    if (owner === "Body_010") {
      body = mesh;
      const skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.62, metalness: 0, shadowSide: THREE.BackSide });
      mesh.material = skin; materials.add(skin);
      return;
    }
    if (original.name === "Glass") { const glass = original.clone(); materials.add(glass); mesh.material = glass; return; }
    if (!cloth) { cloth = original.clone(); cloth.roughness = 0.78; cloth.metalness = 0; cloth.shadowSide = THREE.BackSide; materials.add(cloth); }
    mesh.material = cloth;
    const dye = dyes[owner];
    if (dye) mesh.geometry = dyeGeometry(mesh.geometry, dye);
  });
  for (const node of unused) node.removeFromParent();
  if (!body) throw new Error("The character kit has no body");
  const skinned = body as THREE.SkinnedMesh;
  preparePoseAxes(object);

  // Animation: every kit clip, with root motion kept in place so the game moves the character.
  const mixer = new THREE.AnimationMixer(object);
  const clips = new Map(kit.animations.map((original) => {
    const clip = original.clone();
    for (const track of clip.tracks) if (/(Hips|Root)\.position$/.test(track.name)) for (let i = 0; i < track.values.length; i += 3) { track.values[i] = track.values[0]; track.values[i + 2] = track.values[2]; }
    return [clip.name.toLowerCase(), clip] as const;
  }));
  let current: THREE.AnimationAction | null = null, currentName = "idle", base = "idle", disposed = false, activityTime = 0, idleFor = 0, fidget = 7 + Math.random() * 8;
  const start = (clipName: string, fade = 0.2) => {
    const clip = clips.get(clipName) ?? clips.get("idle");
    if (!clip) return;
    const action = mixer.clipAction(clip);
    if (action === current) return;
    const once = ONCE.has(clipName);
    action.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    action.play();
    if (current) current.crossFadeTo(action, fade, false);
    current = action;
  };
  const play = (name: string) => {
    currentName = name;
    const clip = ALIASES[name] ?? name.toLowerCase();
    base = ONCE.has(clip) ? "idle" : clip;
    idleFor = 0;
    start(clips.has(clip) ? clip : "idle", 0.18);
  };
  // A one-off clip (jump, look around) eases back into whatever the character was doing.
  mixer.addEventListener("finished", () => { if (!disposed) start(currentName === "jump" ? "jump-loop" : base, 0.3); });
  play("idle");
  mixer.update(0);
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(skinned, true);

  const extraMaterials = new Set<THREE.Material>();
  const track = (g: THREE.Object3D) => g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true; geometries.add(m.geometry);
    (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => extraMaterials.add(x));
  });
  const head = measureHead(skinned);
  const headAnchor = anchorOn(skinned, "Head");
  const atHead = (g: THREE.Object3D, y: number, z = 0) => {
    if (!headAnchor) return;
    const rest = headAnchor.userData.restPosition as THREE.Vector3;
    g.position.set(head.centre.x - rest.x, head.centre.y - rest.y + y * head.radius, head.centre.z - rest.z + z * head.radius);
    headAnchor.add(g); track(g);
  };
  if (look.hairExtra) {
    const hairMaterial = new THREE.MeshStandardMaterial({ color: look.hairColour, roughness: 0.7 });
    materials.add(hairMaterial);
    atHead(hairShapes(look.hairExtra, hairMaterial, head.radius), 0);
  }
  if (accessories) {
    const hat = !look.kitHat && a.hat !== "hat-none" ? hat3d(a.hat, outfitColours(a).top) : null;
    if (hat) { hat.scale.setScalar(head.radius / 0.5); hat.name = "avatar-headwear"; atHead(hat, 0.62); }
    const glasses = !look.kitGlasses ? eyewear3d(a.face, "#1b1622") : null;
    if (glasses) { glasses.scale.setScalar(head.radius / 0.55); glasses.name = "avatar-eyewear"; atHead(glasses, 0.02, 0.98); }
    const held = held3d(a.held), hand = held ? anchorOn(skinned, "RightHand") : null;
    if (held && hand) { held.scale.setScalar(0.32); held.position.set(0, -0.06, 0.05); held.name = "avatar-held-item"; hand.add(held); track(held); }
    if (look.cape) {
      const spine = anchorOn(skinned, "Spine1") ?? anchorOn(skinned, "Spine");
      if (spine) {
        const shape = new THREE.Shape();
        shape.moveTo(-0.17, 0.12); shape.lineTo(0.17, 0.12); shape.lineTo(0.27, -0.42); shape.lineTo(0, -0.58); shape.lineTo(-0.27, -0.42); shape.closePath();
        const cape = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: look.cape, roughness: 0.9, side: THREE.DoubleSide }));
        cape.name = "avatar-cape"; cape.position.set(0, 0.05, -0.16); cape.rotation.x = 0.12; spine.add(cape); track(cape);
      }
    }
    const brand = BRANDS[a.brand], employer = workplaceLogo ? logoFor(workplaceLogo) : null, emblem = look.emblem;
    const chest = (brand || employer || emblem) ? anchorOn(skinned, "Spine1") ?? anchorOn(skinned, "Spine") : null;
    if (chest && emblem && !employer) {
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = emblem.fg; ctx.beginPath(); ctx.arc(64, 64, 62, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = emblem.bg; ctx.beginPath(); ctx.arc(64, 64, 52, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = emblem.fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "900 70px system-ui"; ctx.fillText(emblem.letter, 64, 70);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const badge = new THREE.Mesh(new THREE.CircleGeometry(0.06, 32), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      badge.position.set(0, 0.07, 0.16); badge.name = "hero-emblem";
      (badge.material as THREE.MeshBasicMaterial).userData.generatedTexture = texture;
      chest.add(badge); track(badge);
    }
    if (chest && (brand || employer)) {
      const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext("2d")!;
      if (employer) {
        ctx.translate(64, 0); ctx.scale(2, 2); ctx.fillStyle = employer.bg; ctx.beginPath(); ctx.roundRect(0, 0, 64, 64, 12); ctx.fill();
        for (const s of employer.shapes) if (s.fill !== "none") { ctx.fillStyle = s.fill; ctx.fill(new Path2D(s.d)); }
      } else if (brand) {
        ctx.fillStyle = brand.bg; ctx.beginPath(); ctx.roundRect(0, 0, 256, 128, brand.shape === "square" ? 12 : 64); ctx.fill();
        ctx.fillStyle = brand.fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold 54px system-ui"; ctx.fillText(brand.text, 128, 66);
      }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.065), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      badge.position.set(0.07, 0.06, 0.15); badge.name = employer ? "uniform-workplace-logo" : "avatar-brand-badge";
      (badge.material as THREE.MeshBasicMaterial).userData.generatedTexture = texture;
      chest.add(badge); track(badge);
    }
  }

  const targetHeight = height * 0.9;
  const scale = targetHeight / Math.max(0.01, bounds.max.y - bounds.min.y);
  object.scale.setScalar(scale);
  object.position.y = -bounds.min.y * scale;
  const holder = new THREE.Group();
  holder.userData.characterModel = "creative-kit";
  holder.add(object);
  const pet = accessories ? pet3d(a.pet) : null;
  if (pet) { pet.scale.setScalar(targetHeight / 1.15); pet.position.set(targetHeight * 0.5, 0, -targetHeight * 0.15); holder.add(pet); track(pet); }

  return {
    object: holder, mixer, play,
    update: (dt, reduced = false, motion) => {
      if (disposed) return;
      const step = Math.min(0.1, Math.max(0, dt));
      // Match the stride to how fast the character is actually moving.
      if (current && motion && (base === "walk" || base === "run")) current.timeScale = THREE.MathUtils.clamp(motion.speed / (base === "run" ? 4.2 : 1.9), 0.6, 1.6);
      else if (current) current.timeScale = 1;
      // Standing still for a while: glance around now and then.
      if (base === "idle" && currentName === "idle" && !reduced) {
        idleFor += step;
        if (idleFor > fidget) { idleFor = 0; fidget = 9 + Math.random() * 10; start(Math.random() < 0.6 ? "look" : "relaxed", 0.35); }
      }
      mixer.update(reduced && currentName === "idle" ? 0 : step);
      activityTime += step;
      activityPose(object, currentName, activityTime, reduced);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction(); mixer.uncacheRoot(object);
      skeletons.forEach((s) => s.dispose());
      materials.forEach((m) => m.dispose());
      extraMaterials.forEach((m) => { (m.userData?.generatedTexture as THREE.Texture | undefined)?.dispose(); m.dispose(); });
      geometries.forEach((g) => g.dispose());
      holder.removeFromParent(); holder.clear();
    },
  };
}
