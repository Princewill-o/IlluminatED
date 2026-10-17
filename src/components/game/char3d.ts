"use client";

import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

import { type Avatar, cosmeticById } from "@/game/core/cosmetics";
import { BOTTOM_LOOK, HAIR_LOOK, TOP_LOOK } from "@/game/core/looks";

/**
 * Your character in 3D, built from the same Kenney mini-characters as the 2D
 * sprites and dressed from your Locker: the head (and hairstyle) comes from one
 * character, the body from another, and skin, hair, top, bottoms and shoes are
 * recoloured to your choices. The same model is used in the world and the Locker,
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

const dyed = (item: string | undefined, dye: string | undefined) => {
  const d = dye && !dye.endsWith("-auto") ? cosmeticById(dye)?.color : undefined;
  return d ?? cosmeticById(item ?? "")?.color ?? "#8d93a0";
};

export function avatarColours(a: Avatar) {
  return {
    skin: cosmeticById(a.skin)?.color ?? "#d09460",
    hair: cosmeticById(a.hairColor)?.color ?? "#2a2233",
    top: dyed(a.top, a.topColor),
    bottom: dyed(a.bottom, a.bottomColor),
    shoes: dyed(a.shoes, a.shoesColor),
  };
}

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

const keyOf = (c: THREE.Color) => c.getHexString();
const isDark = (c: THREE.Color) => c.r + c.g + c.b < 0.45;

/** Recolours a Kenney mesh with flat vertex colours for each part. */
function recolour(mesh: THREE.SkinnedMesh, part: "head" | "body", cols: ReturnType<typeof avatarColours>) {
  const src = mesh.material as THREE.MeshStandardMaterial;
  const read = texelReader(src.map ?? null);
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const uv = g.attributes.uv;
  const pos = g.attributes.position;
  const n = pos.count;
  const orig: THREE.Color[] = [];
  const counts = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const c = read(uv.getX(i), uv.getY(i));
    orig.push(c);
    counts.set(keyOf(c), (counts.get(keyOf(c)) ?? 0) + 1);
  }
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    minY = Math.min(minY, pos.getY(i));
    maxY = Math.max(maxY, pos.getY(i));
  }
  // Kenney shades every part with a few tones, so classify by colour family rather than exact texel:
  // warm, mid-bright tones are skin; small dark bits (eyes, mouth) stay as they are.
  const hsl = { h: 0, s: 0, l: 0 };
  const isSkin = (c: THREE.Color) => {
    c.getHSL(hsl, THREE.SRGBColorSpace);
    return hsl.h > 0.015 && hsl.h < 0.11 && hsl.s > 0.3 && hsl.l > 0.3 && hsl.l < 0.8;
  };
  const target = new THREE.Color();
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = orig[i];
    const small = (counts.get(keyOf(c)) ?? 0) < n * 0.05;
    const f0 = (pos.getY(i) - minY) / Math.max(0.001, maxY - minY);
    if (isSkin(c) && (part === "head" || f0 > 0.3)) {
      // Keep Kenney's light and shade on the skin, in your skin tone.
      c.getHSL(hsl, THREE.SRGBColorSpace);
      target.set(cols.skin).offsetHSL(0, 0, (hsl.l - 0.47) * 0.35);
    } else if (small && (isDark(c) || c.r + c.g + c.b > 2.4)) target.copy(c);
    else if (part === "head") target.set(cols.hair);
    else {
      const f = (pos.getY(i) - minY) / Math.max(0.001, maxY - minY);
      if (f < 0.12) target.set(cols.shoes);
      else if (f < 0.42) target.set(cols.bottom);
      else target.set(cols.top);
    }
    target.toArray(out, i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(out, 3));
  mesh.geometry = g;
  mesh.material = new THREE.MeshLambertMaterial({ vertexColors: true });
}

export interface Character3D {
  object: THREE.Group;
  mixer: THREE.AnimationMixer;
  play: (clip: "idle" | "walk" | "sit" | "emote-yes") => void;
}

/** Builds your dressed 3D character at about `height` units tall. */
export async function buildCharacter(a: Avatar, height = 1.15): Promise<Character3D> {
  const headV = HAIR_LOOK[a.hair]?.head ?? "male-a";
  const bodyV = TOP_LOOK[a.top] ?? BOTTOM_LOOK[a.bottom] ?? "male-a";
  const [bodyG, headG] = await Promise.all([loadChar(bodyV), loadChar(headV)]);
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
  if (headMesh) recolour(headMesh, "head", cols);
  if (bodyMesh) recolour(bodyMesh, "body", cols);
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
  const play: Character3D["play"] = (name) => {
    const clip = bodyG.animations.find((c) => c.name === name);
    if (!clip) return;
    const next = mixer.clipAction(clip);
    if (next === current) return;
    next.reset().play();
    if (current) current.crossFadeTo(next, 0.2, false);
    current = next;
  };
  play("idle");
  return { object: holder, mixer, play };
}
