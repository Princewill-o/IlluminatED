"use client";

import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

import { eyewear3d, held3d, hat3d, pet3d } from "./accessories3d";
import { faceCanvas } from "./character";
import { addUniformLogo } from "./uniform-logo3d";

import { type Avatar, cosmeticById, look } from "@/game/core/cosmetics";
import { bodyBand, clipOutfitTriangle, garmentSurface, isSkinTexel, outfitColours, outfitVariants, paletteCell, type OutfitPiece } from "@/game/core/outfits";

/**
 * Your character in 3D, built from the same Kenney mini-characters as the 2D
 * sprites and dressed from your Locker: the head (and hairstyle) comes from one
 * character, each garment from its selected variant, and skin, hair, top,
 * bottoms and shoes are recoloured to your choices. The same model is used in the world and the Locker,
 * so what you see when you dress up is what walks around London.
 */

const loader = new GLTFLoader();
const CACHE = new Map<string, Promise<GLTF>>();
const loadChar = (variant: string) => {
  const url = `/world3d/chars/character-${variant}.glb`;
  let p = CACHE.get(url);
  if (!p) {
    p = loader.loadAsync(url);
    CACHE.set(url, p);
  }
  return p;
};

export const avatarColours = outfitColours;

/** Reads the colour each vertex shows from the palette texture. */
function texelReader(tex: THREE.Texture | null) {
  const img = tex?.image as (HTMLImageElement | ImageBitmap) | undefined;
  if (!img) return () => new THREE.Color("#888");
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img as CanvasImageSource, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  return (u: number, v: number) => {
    const x = Math.min(c.width - 1, Math.max(0, Math.floor(u * c.width)));
    const y = Math.min(c.height - 1, Math.max(0, Math.floor(v * c.height)));
    const i = (y * c.width + x) * 4;
    return new THREE.Color().setRGB(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255, THREE.SRGBColorSpace);
  };
}

/** Recolour the hairstyle and erase its original printed face. */
function recolourHead(mesh: THREE.SkinnedMesh, cols: ReturnType<typeof avatarColours>) {
  const src = mesh.material as THREE.MeshStandardMaterial;
  const read = texelReader(src.map ?? null);
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const uv = g.attributes.uv, pos = g.attributes.position;
  const counts = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    if (!isSkinTexel(uv.getX(i), uv.getY(i))) continue;
    const key = paletteCell(uv.getX(i), uv.getY(i)).join(":");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // The shared Kenney face contains 124 triangles. Hair may also use a brown
  // swatch, so select the actual face's palette cell instead of its hue.
  const skinCell = [...counts].sort((a, b) => Math.abs(a[1] - 372) - Math.abs(b[1] - 372))[0]?.[0];
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) { minY = Math.min(minY, pos.getY(i)); maxY = Math.max(maxY, pos.getY(i)); }
  const out = new Float32Array(pos.count * 3);
  const target = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };
  for (let i = 0; i < pos.count; i++) {
    const f = (pos.getY(i) - minY) / Math.max(0.001, maxY - minY);
    const inFace = (g.attributes.normal?.getZ(i) ?? 0) > 0.6 && f > 0.12 && f < 0.56;
    const skin = paletteCell(uv.getX(i), uv.getY(i)).join(":") === skinCell;
    target.set(skin || inFace ? cols.skin : cols.hair);
    if (skin) {
      read(uv.getX(i), uv.getY(i)).getHSL(hsl, THREE.SRGBColorSpace);
      target.offsetHSL(0, 0, (hsl.l - 0.47) * 0.2);
    }
    // Baked soft modelling: retains the inexpensive Lambert shader and mesh.
    const normal=g.attributes.normal;
    const illumination=0.88+Math.max(0,normal.getY(i))*0.09+Math.max(0,normal.getZ(i))*0.045;
    target.multiplyScalar(illumination);
    if(!skin && !inFace) target.multiplyScalar(0.94+f*0.09);
    target.toArray(out, i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(out, 3));
  // Refine the oversized source head without changing its rig or hairstyle.
  g.computeBoundingBox();
  const centre = g.boundingBox!.getCenter(new THREE.Vector3());
  g.translate(-centre.x, -centre.y, -centre.z);
  g.scale(0.93, 0.96, 0.95);
  g.translate(centre.x, centre.y, centre.z);
  mesh.geometry = g;
  mesh.material = new THREE.MeshLambertMaterial({ vertexColors: true });
}

/** One source garment, cut at shared seams and attached to the common rig. */
function garmentGeometry(source: THREE.SkinnedMesh, piece: OutfitPiece, cols: ReturnType<typeof avatarColours>, skeleton: THREE.Skeleton, avatar: Avatar) {
  const g = source.geometry.index ? source.geometry.toNonIndexed() : source.geometry.clone();
  const pos = g.attributes.position, normal = g.attributes.normal, uv = g.attributes.uv;
  const indices = g.attributes.skinIndex, weights = g.attributes.skinWeight;
  const positions: number[] = [], normals: number[] = [], colours: number[] = [], joints: number[] = [], influences: number[] = [];
  const target = new THREE.Color();
  const norm = new THREE.Vector3();
  const boneMap = source.skeleton.bones.map((bone) => Math.max(0, skeleton.bones.findIndex((b) => b.name === bone.name)));
  const component = (attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, i: number, c: number) => attribute.getComponent(i, c);
  for (let i = 0; i < pos.count; i += 3) {
    const points = [0, 1, 2].map((j) => [pos.getX(i + j), pos.getY(i + j), pos.getZ(i + j)] as const);
    const band = bodyBand(piece);
    // A true skirt covers the thighs as one garment; keep just the exposed
    // lower legs from the source model beneath the separately fitted hem.
    if (piece === "bottom" && avatar.bottom === "bottom-skirt") band.max = 0.105;
    const triangles = clipOutfitTriangle(points, band);
    const bone = source.skeleton.bones[indices.getX(i)]?.name ?? "torso";
    const sourceSkin = isSkinTexel(uv.getX(i), uv.getY(i));
    // All garment surfaces, including imported prints, follow this slot's dye.
    // Only explicit skin texels on hands/legs/necks keep the selected skin tone.
    for (const triangle of triangles) for (const blend of triangle) {
      const y = blend.reduce((sum, w, j) => sum + w * points[j][1], 0);
      target.set(cols[garmentSurface(piece, bone, sourceSkin, avatar[piece], y)]);
      for (let c = 0; c < 3; c++) positions.push(blend.reduce((sum, w, j) => sum + w * component(pos, i + j, c), 0));
      norm.set(...[0, 1, 2].map((c) => blend.reduce((sum, w, j) => sum + w * component(normal, i + j, c), 0)) as [number, number, number]).normalize();
      normals.push(norm.x, norm.y, norm.z);
      // Sewn hems and directional colour shading add definition using the
      // existing vertices: no additional meshes, textures or draw calls.
      const surface = garmentSurface(piece, bone, sourceSkin, avatar[piece], y);
      if (surface !== "skin") {
        let shade = 0.86 + Math.max(0, norm.y) * 0.12 + Math.max(0, norm.z) * 0.04;
        if (piece === "top" && y < 0.188 || piece === "bottom" && y > 0.164 || piece === "shoes" && y < 0.008) shade *= 0.8;
        target.multiplyScalar(shade);
      }
      colours.push(target.r, target.g, target.b);
      const boneWeights = new Map<number, number>();
      for (let j = 0; j < 3; j++) for (let c = 0; c < 4; c++) {
        const influence = blend[j] * component(weights, i + j, c);
        if (influence <= 0) continue;
        const bone = boneMap[component(indices, i + j, c)] ?? 0;
        boneWeights.set(bone, (boneWeights.get(bone) ?? 0) + influence);
      }
      const strongest = [...boneWeights].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const sum = strongest.reduce((s, entry) => s + entry[1], 0) || 1;
      for (let c = 0; c < 4; c++) { joints.push(strongest[c]?.[0] ?? 0); influences.push((strongest[c]?.[1] ?? 0) / sum); }
    }
  }
  g.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(joints, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(influences, 4));
  return geometry;
}

const bodyIn = (scene: THREE.Object3D) => {
  let mesh: THREE.SkinnedMesh | null = null;
  scene.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh && !o.name.startsWith("head")) mesh = o as THREE.SkinnedMesh; });
  return mesh;
};

/** Face, hat, eyewear and held item, fixed to the head and hand bones so they move with you. */
function dress(object: THREE.Object3D, headMesh: THREE.SkinnedMesh | null, bodyMesh: THREE.SkinnedMesh | null, a: Avatar) {
  object.updateMatrixWorld(true);
  const headBone = object.getObjectByName("head");
  if (headMesh && headBone) {
    headMesh.geometry.computeBoundingBox();
    const hb = headMesh.geometry.boundingBox!.clone().applyMatrix4(headMesh.matrixWorld);
    const w = hb.max.x - hb.min.x;
    const h = hb.max.y - hb.min.y;
    const cx = (hb.min.x + hb.max.x) / 2;
    const cz = (hb.min.z + hb.max.z) / 2;
    // The face: the same drawn eyes, brows and mouth as the 2D character, on the front of the head.
    const tex = new THREE.CanvasTexture(faceCanvas(a));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, w * 0.86), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    face.name = "animated-face";
    const expressions = [tex, ...[
      { ...a, eyes: "eyes-sleepy" },
      { ...a, brows: "brows-raised", mouth: "mouth-grin" },
      { ...a, eyes: "eyes-focused", mouth: "mouth-small" },
    ].map(avatar => {
      const texture = new THREE.CanvasTexture(faceCanvas(avatar));
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })];
    face.userData.expressions = expressions;
    face.position.set(cx, hb.min.y + h * 0.36, hb.max.z + 0.004);
    headBone.attach(face);
    const hatItem = cosmeticById(a.hat ?? "");
    const hat = hat3d(a.hat ?? "", hatItem?.color ?? "#8fb4ff");
    if (hat) {
      hat.scale.setScalar(w);
      hat.position.set(cx, hb.max.y - h * 0.27, cz);
      headBone.attach(hat);
    }
    const eye = eyewear3d(a.face ?? "", cosmeticById(a.face ?? "")?.color ?? "#1b1622");
    if (eye) {
      eye.scale.setScalar(w);
      eye.position.set(cx, hb.min.y + h * 0.42, hb.max.z + w * 0.06);
      headBone.attach(eye);
    }
  }
  const arm = object.getObjectByName("arm-right") ?? object.getObjectByName("arm-left");
  const item = held3d(a.held ?? "");
  if (item && arm && bodyMesh) {
    bodyMesh.geometry.computeBoundingBox();
    const bb = bodyMesh.geometry.boundingBox!.clone().applyMatrix4(bodyMesh.matrixWorld);
    const s = (bb.max.y - Math.min(0, bb.min.y)) * 1.1;
    const armPos = new THREE.Vector3();
    arm.getWorldPosition(armPos);
    // The hand is at the end of the arm (arms rest out to the side on Kenney's rig).
    const handX = armPos.x < 0 ? bb.min.x + s * 0.12 : bb.max.x - s * 0.12;
    item.scale.setScalar(s);
    item.position.set(handX, armPos.y - s * 0.15, armPos.z + s * 0.1);
    arm.attach(item);
  }
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
  const variants = outfitVariants(a);
  const [bodyG, headG, bottomG, shoesG] = await Promise.all([
    loadChar(variants.top), loadChar(variants.head), loadChar(variants.bottom), loadChar(variants.shoes),
  ]);
  const object = cloneSkinned(bodyG.scene) as THREE.Group;
  let bodyMesh: THREE.SkinnedMesh | null = null;
  let headMesh: THREE.SkinnedMesh | null = null;
  object.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) {
      if (o.name.startsWith("head")) headMesh = o as THREE.SkinnedMesh;
      else bodyMesh = o as THREE.SkinnedMesh;
    }
  });
  // Swap in the head (hairstyle) from the other character: same rig, same bones.
  let headSrc: THREE.SkinnedMesh | null = null;
  headG.scene.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh && o.name.startsWith("head")) headSrc = o as THREE.SkinnedMesh;
  });
  if (headMesh && headSrc) {
    (headMesh as THREE.SkinnedMesh).geometry = (headSrc as THREE.SkinnedMesh).geometry;
    (headMesh as THREE.SkinnedMesh).material = (headSrc as THREE.SkinnedMesh).material;
  }
  const cols = avatarColours(a);
  if (headMesh) recolourHead(headMesh, cols);
  if (bodyMesh) {
    const upper = bodyMesh as THREE.SkinnedMesh;
    // Keep one rig and animation mixer; each selected item supplies its own
    // disjoint geometry instead of stacking three complete character bodies.
    for (const [piece, source] of [["bottom", bodyIn(bottomG.scene)], ["shoes", bodyIn(shoesG.scene)]] as const) {
      if (!source) continue;
      const mesh = new THREE.SkinnedMesh(garmentGeometry(source, piece, cols, upper.skeleton, a), new THREE.MeshLambertMaterial({ vertexColors: true }));
      mesh.name = `outfit-${piece}`;
      mesh.position.copy(upper.position);
      mesh.quaternion.copy(upper.quaternion);
      mesh.scale.copy(upper.scale);
      mesh.bind(upper.skeleton, upper.bindMatrix);
      upper.parent?.add(mesh);
    }
    upper.geometry = garmentGeometry(upper, "top", cols, upper.skeleton, a);
    upper.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    if (a.bottom === "bottom-skirt") {
      // Source models call two trouser legs a skirt. Give this Locker item a
      // connected, flared silhouette on the pelvis, above the walking legs.
      const skirt = new THREE.CylinderGeometry(0.14, 0.175, 0.085, 10, 1, false);
      skirt.translate(0, 0.17625 - 0.085 / 2, -0.02875);
      const count = skirt.attributes.position.count;
      const joint = upper.skeleton.bones.findIndex((bone) => bone.name === "torso");
      const jointIndices = new Uint16Array(count * 4), jointWeights = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) { jointIndices[i * 4] = Math.max(0, joint); jointWeights[i * 4] = 1; }
      skirt.setAttribute("skinIndex", new THREE.BufferAttribute(jointIndices, 4));
      skirt.setAttribute("skinWeight", new THREE.BufferAttribute(jointWeights, 4));
      const mesh = new THREE.SkinnedMesh(skirt, new THREE.MeshLambertMaterial({ color: cols.bottom, flatShading: true }));
      mesh.name = "outfit-skirt";
      mesh.bind(upper.skeleton, upper.bindMatrix);
      upper.parent?.add(mesh);
    }
  }
  dress(object, headMesh, bodyMesh, a);
  addUniformLogo(object, bodyMesh, workplaceLogo);
  object.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
    }
  });
  const bb = new THREE.Box3().setFromObject(object);
  object.scale.setScalar(height / Math.max(0.01, bb.max.y - bb.min.y));
  const holder = new THREE.Group();
  holder.add(object);
  const mixer = new THREE.AnimationMixer(object);
  let current: THREE.AnimationAction | null = null;
  let currentName = "idle";
  const play: Character3D["play"] = (name) => {
    const clip = bodyG.animations.find((c) => c.name === name);
    if (!clip) return;
    currentName = name;
    const next = mixer.clipAction(clip);
    if (next === current) return;
    next.reset().play();
    if (current) current.crossFadeTo(next, 0.2, false);
    current = next;
  };
  play("idle");
  const face = object.getObjectByName("animated-face") as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | undefined;
  const head = object.getObjectByName("head");
  const headPose = new THREE.Quaternion();
  const restingScale = object.scale.clone();
  let posed = false, expressionTime = Math.random() * 4;
  const update = (dt: number, reducedMotion = false) => {
    if (head && posed) head.quaternion.copy(headPose);
    mixer.update(dt);
    expressionTime += Math.max(0, dt);
    object.scale.copy(restingScale);
    if (!reducedMotion && currentName === "idle") object.scale.y *= 1 + Math.sin(expressionTime * 2) * 0.003;
    if (head) {
      headPose.copy(head.quaternion); posed = true;
      if (!reducedMotion && currentName === "idle") {
        head.rotateY(Math.sin(expressionTime * 0.65) * 0.07);
        head.rotateZ(Math.sin(expressionTime * 1.3) * 0.018);
      }
      if (!reducedMotion && /walk|run/.test(currentName)) head.rotateZ(Math.sin(expressionTime * 8) * 0.025);
    }
    if (face) {
      const blink = !reducedMotion && expressionTime % 4.3 < 0.14;
      const expression = blink ? 1 : /wave|dance|cheer/.test(currentName) ? 2 : /run/.test(currentName) ? 3 : 0;
      face.material.map = face.userData.expressions[expression];
    }
  };
  // A pet trots along beside you.
  const pet = pet3d(a.pet ?? "");
  if (pet) {
    pet.scale.setScalar(height / 1.15);
    pet.position.set(height * 0.5, 0, -height * 0.15);
    pet.userData.pet = true;
    holder.add(pet);
  }
  const sharedGeometry = new Set<THREE.BufferGeometry>();
  const sharedMaterials = new Set<THREE.Material>();
  for (const asset of [bodyG, headG, bottomG, shoesG]) asset.scene.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    sharedGeometry.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) sharedMaterials.add(material);
  });
  let released = false;
  const dispose = () => {
    if (released) return;
    released = true;
    mixer.stopAllAction(); mixer.uncacheRoot(object);
    const geometry = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>(), skeletons = new Set<THREE.Skeleton>();
    holder.traverse(o => {
      for (const texture of o.userData.expressions ?? []) textures.add(texture);
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      if (!sharedGeometry.has(mesh.geometry)) geometry.add(mesh.geometry);
      if (mesh.isSkinnedMesh) skeletons.add(mesh.skeleton);
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (sharedMaterials.has(m) || m.userData.sharedAccessory) continue;
        materials.add(m);
        for (const value of Object.values(m)) if (value instanceof THREE.CanvasTexture) textures.add(value);
      }
    });
    skeletons.forEach(s => s.dispose()); geometry.forEach(g => g.dispose());
    materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    holder.removeFromParent(); holder.clear();
  };
  return { object: holder, mixer, play, update, dispose };
}

/** Londoners: varied looks for people in the street, on trains and in buildings. */
const NPC_SKIN = ["skin-1", "skin-2", "skin-3", "skin-4", "skin-5", "skin-6", "skin-7", "skin-8"];
const NPC_HAIR = ["hair-short", "hair-bob", "hair-ponytail", "hair-curly", "hair-buzz", "hair-long", "hair-braids", "hair-buns", "hair-quiff", "hair-spiky"];
const NPC_HAIRCOL = ["haircol-black", "haircol-brown", "haircol-blonde", "haircol-auburn", "haircol-ginger", "haircol-silver"];
const NPC_TOP = ["top-hoodie", "top-suit", "top-tee", "top-denim", "top-knit", "top-hivis", "top-polo", "top-stripes", "top-tracksuit"];
const NPC_BOTTOM = ["bottom-jeans", "bottom-smart", "bottom-joggers", "bottom-skirt", "bottom-cargo"];
export const npcLook = (i: number) =>
  look({ skin: NPC_SKIN[(i * 3 + 1) % 8], hair: NPC_HAIR[(i * 7) % 10], hairColor: NPC_HAIRCOL[(i * 5) % 6], top: NPC_TOP[(i * 2 + 1) % 9], bottom: NPC_BOTTOM[i % 5], topColor: ["topcol-purple", "topcol-teal", "topcol-yellow", "topcol-red", "topcol-green", "topcol-blue"][i % 6], bottomColor: ["botcol-navy", "botcol-black", "botcol-beige"][i % 3] });
