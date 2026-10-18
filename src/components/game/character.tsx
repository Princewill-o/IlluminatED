"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import META_JSON from "../../../public/characters/meta.json";

import { type Avatar, DEFAULT_AVATAR } from "@/game/core/cosmetics";
import { logoFor } from "@/game/core/logos";
import { HAIR_LOOK } from "@/game/core/looks";
import { outfitColours, outfitVariants } from "@/game/core/outfits";

/**
 * IlluminatED characters, rendered from Blender.
 *
 * Every Locker item is a sprite sheet in /public/characters (cel-shaded with ink
 * outlines, built by scripts/characters/build.py + post.py). A character is the
 * sheets stacked in order. Skin and hair are rendered light grey and tinted
 * here, so one sheet covers every colour. Faces (eyes, brows, mouth, extras and
 * glasses) are drawn on top as crisp 2D shapes at the face anchor Blender
 * exported for every frame, so expressions stay sharp at any size.
 */

export type Mood = "happy" | "sad" | "wow" | "cool" | "cross";
export type Facing = "S" | "N" | "E" | "W";
export type Clip = "idle" | "walk" | "wave";

const FRAME = 176;
const COLS = 7;
/** Head radius in sheet pixels, for drawing faces. */
const U = (META_JSON as { u?: number }).u ?? 32;
const INK = "#13203a";
const BASE = "/characters";

interface Meta {
  layers: string[];
  /** Head radius in sheet px (for the 2D face). */
  u?: number;
  frames: [string, string, number][];
  anchors: { face: [number, number]; head: [number, number]; chest: [number, number] }[];
}

// The anchors live next to the sheets; imported statically so the first paint has them.
const META = META_JSON as unknown as Meta;
const META_LAYERS = new Set(META.layers);

const CLIP_START = new Map<string, { start: number; count: number }>();
META.frames.forEach(([d, c], i) => {
  const k = `${d}:${c}`;
  const cur = CLIP_START.get(k);
  if (cur) cur.count++;
  else CLIP_START.set(k, { start: i, count: 1 });
});

const FPS: Record<Clip, number> = { idle: 4, walk: 11, wave: 8 };

// ── Image loading and tinting (cached for the whole app) ───────────────────
const images = new Map<string, Promise<HTMLImageElement | null>>();
function load(name: string) {
  let p = images.get(name);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `${BASE}/${name}.webp`;
    });
    images.set(name, p);
  }
  return p;
}

const tinted = new Map<string, HTMLCanvasElement>();
function tint(img: HTMLImageElement, name: string, colour: string, torso?: string) {
  const key = `${name}|${colour}|${torso ?? ""}`;
  let c = tinted.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0);
    // Imported ties/badges must not retain the source character's colours.
    const flat = name.endsWith("-detail");
    g.globalCompositeOperation = flat ? "source-in" : "multiply";
    g.fillStyle = colour;
    g.fillRect(0, 0, c.width, c.height);
    if (!flat) {
      g.globalCompositeOperation = "destination-in";
      g.drawImage(img, 0, 0);
    }
    if (torso) {
      // skinU also contains the source character's bare stomach/front panels.
      // Cover its central torso while leaving the separate hand pixels skin.
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = torso;
      META.anchors.forEach((anchor, i) => {
        const x = (i % COLS) * FRAME + anchor.head[0];
        const y = Math.floor(i / COLS) * FRAME + anchor.head[1];
        g.fillRect(x - U * 0.64, y + U * 0.58, U * 1.28, U * 1.85 - U * 0.58);
      });
    }
    tinted.set(key, c);
  }
  return c;
}

// ── Which sheets make up an outfit, in draw order ──────────────────────────
const ANIMAL_HEADS = new Set(["head-dog", "head-cow", "head-robot", "head-alien", "head-lion"]);
const NONE = new Set(["hat-none", "face-none", "held-none", "pet-none", "hair-bald", "extras-none", "brows-none"]);

/** Tops that carry a company logo on the chest. */
const TOP_LOGO: Record<string, string> = {
  "top-labcoat": "st-plasters",
  "top-hivis": "bodge",
  "top-tracksuit": "psyke",
};

export interface Layer {
  name: string;
  tint?: string;
  /** Clothing coverage on the combined torso/hand skin sheet. */
  torso?: string;
}

const has = (name: string) => META_LAYERS.has(name);
const pick = (...names: string[]) => names.find(has) ?? names[names.length - 1];

/**
 * The layers for an outfit, back to front. Bodies, heads, hair and clothes are
 * Kenney mini-character pieces (see game/core/looks.ts); hats, held items, pets
 * and animal heads are our own sheets on the same rig.
 */
export function layersFor(a: Avatar, showPet = true): { back: Layer[]; front: Layer[]; overHead: Layer[]; pet: Layer | null } {
  const { skin, hair, ...colours } = outfitColours(a);
  const variants = outfitVariants(a);
  const animal = ANIMAL_HEADS.has(a.head ?? "");
  const topV = variants.top;
  const botV = variants.bottom;
  const shoeV = variants.shoes;
  const hairLook = HAIR_LOOK[a.hair ?? ""] ?? HAIR_LOOK["hair-short"];
  const back: Layer[] = [];
  if (a.top === "top-cape") back.push({ name: "cape-back" });
  const bareLegs = a.bottom === "bottom-skirt" || a.bottom === "bottom-shorts";
  if (has(`kb-${botV}-skinL`)) back.push({ name: `kb-${botV}-skinL`, tint: bareLegs ? skin : colours.bottom });
  back.push({ name: pick(`kb-${botV}-bottom`, "kb-male-a-bottom"), tint: a.bottom === "bottom-skirt" ? skin : colours.bottom });
  back.push({ name: pick(`kb-${shoeV}-shoes`, "kb-male-a-shoes"), tint: colours.shoes });
  if (has(`kb-${topV}-skinU`)) back.push({ name: `kb-${topV}-skinU`, tint: skin, torso: colours.top });
  back.push({ name: pick(`kb-${topV}-top`, "kb-male-a-top"), tint: colours.top });
  if (has(`kb-${topV}-detail`)) back.push({ name: `kb-${topV}-detail`, tint: colours.top });
  const front: Layer[] = [animal ? { name: a.head! } : { name: `kh-${hairLook.head}-skin`, tint: skin }];
  const overHead: Layer[] = [];
  if (!animal && hairLook.hair) overHead.push({ name: hairLook.hair, tint: hair });
  if (a.hat && !NONE.has(a.hat)) overHead.push({ name: a.hat });
  if (a.held && !NONE.has(a.held)) overHead.push({ name: a.held });
  const pet = showPet && a.pet && !NONE.has(a.pet) ? { name: a.pet } : null;
  return { back, front, overHead, pet };
}

// ── 2D face ────────────────────────────────────────────────────────────────
interface FaceSpec {
  eyes: string;
  brows: string;
  mouth: string;
  extras: string;
  face: string;
  head: string;
  mood?: Mood;
}

function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
}

function arc(g: CanvasRenderingContext2D, x: number, y: number, r: number, from: number, to: number, w: number, colour = INK) {
  g.beginPath();
  g.arc(x, y, r, from, to);
  g.strokeStyle = colour;
  g.lineWidth = w;
  g.lineCap = "round";
  g.stroke();
}

function line(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number, colour = INK) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokeStyle = colour;
  g.lineWidth = w;
  g.lineCap = "round";
  g.stroke();
}

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke();
}

/** The face as a transparent image, for the front of the 3D head (same art as the 2D sprite). */
export function faceCanvas(a: Avatar, px = 256) {
  const c = document.createElement("canvas");
  c.width = px;
  c.height = px;
  const g = c.getContext("2d")!;
  g.scale(px / (1.2 * U), px / (1.2 * U));
  drawFace(
    g,
    { eyes: a.eyes ?? "eyes-round", brows: a.brows ?? "brows-soft", mouth: a.mouth ?? "mouth-smile", extras: a.extras ?? "extras-none", face: "face-none", head: "head-human" },
    0.6 * U,
    0.55 * U,
    0,
  );
  return c;
}

/** Draws the face at (fx, fy). side: 0 = facing us, 1 = facing right (profile). */
function drawFace(g: CanvasRenderingContext2D, f: FaceSpec, fx: number, fy: number, side: 0 | 1) {
  const u = U;
  const robot = f.head === "head-robot";
  const animalMuzzle = f.head === "head-dog" || f.head === "head-cow" || f.head === "head-lion";
  const eyeY = fy - 0.12 * u;
  const eyesX = side ? [fx - 0.16 * u] : [fx - 0.34 * u, fx + 0.34 * u];
  const mood = f.mood;
  const covered = f.face === "face-vr" || f.face === "face-shades";

  // Eyes
  if (!covered)
    eyesX.forEach((x, i) => {
      if (robot) {
        g.fillStyle = "#6bc6ff";
        g.fillRect(x - 0.1 * u, eyeY - 0.06 * u, 0.2 * u, 0.12 * u);
        return;
      }
      const kind = mood === "cool" ? "half" : mood === "wow" ? "wide" : f.eyes;
      if (kind === "eyes-sleepy" || kind === "half" || (kind === "eyes-wink" && i === 1 && !side)) {
        if (kind === "half") {
          ellipse(g, x, eyeY + 0.03 * u, 0.1 * u, 0.08 * u, INK);
          g.fillStyle = "rgba(0,0,0,0)";
          line(g, x - 0.13 * u, eyeY - 0.02 * u, x + 0.13 * u, eyeY - 0.02 * u, 2.2);
        } else arc(g, x, eyeY - 0.02 * u, 0.1 * u, 0.15 * Math.PI, 0.85 * Math.PI, 2.2);
        return;
      }
      const big = kind === "eyes-sparkle" || kind === "wide" ? 1.25 : kind === "eyes-dots" ? 0.6 : kind === "eyes-focused" ? 0.85 : 1;
      if (kind !== "eyes-dots") ellipse(g, x, eyeY, 0.105 * u * big, 0.13 * u * big, "#fffaf1");
      ellipse(g, x, eyeY + 0.006 * u, 0.078 * u * big, 0.108 * u * big, INK);
      if (kind !== "eyes-dots") {
        ellipse(g, x + 0.026 * u * big, eyeY - 0.035 * u * big, 0.025 * u * big, 0.025 * u * big, "#fff");
        if (kind === "eyes-sparkle") ellipse(g, x - 0.04 * u, eyeY + 0.05 * u, 0.02 * u, 0.02 * u, "#fff");
      }
      if (kind === "eyes-focused") line(g, x - 0.12 * u, eyeY - 0.12 * u, x + 0.12 * u, eyeY - 0.1 * u, 2);
    });

  // Brows
  const brows = mood === "cross" ? "brows-fierce" : mood === "wow" ? "brows-raised" : mood === "sad" ? "sad" : f.brows;
  if (!robot && brows !== "brows-none" && !covered)
    eyesX.forEach((x, i) => {
      const dir = side ? 1 : i === 0 ? -1 : 1; // outer side
      const y = eyeY - 0.27 * u - (brows === "brows-raised" ? 0.08 * u : 0);
      const w = brows === "brows-bold" ? 2.7 : 1.6;
      if (brows === "brows-fierce") line(g, x + dir * 0.13 * u, y - 0.05 * u, x - dir * 0.1 * u, y + 0.05 * u, 2.8);
      else if (brows === "sad") line(g, x + dir * 0.13 * u, y + 0.05 * u, x - dir * 0.1 * u, y - 0.04 * u, 2.4);
      else arc(g, x, y + 0.12 * u, 0.13 * u, 1.2 * Math.PI, 1.8 * Math.PI, w);
    });

  // A small nose contour reads at Locker scale without extra 3D geometry.
  if (!robot && !animalMuzzle && !side) {
    g.beginPath();
    g.moveTo(fx + 0.012 * u, fy + 0.025 * u);
    g.quadraticCurveTo(fx + 0.07 * u, fy + 0.11 * u, fx - 0.018 * u, fy + 0.11 * u);
    g.strokeStyle = "rgba(72,39,28,0.32)";
    g.lineWidth = 0.9;
    g.lineCap = "round";
    g.stroke();
  }

  // Mouth
  if (!robot) {
    const mx = side ? fx + 0.04 * u : fx;
    const my = fy + (animalMuzzle ? 0.42 : 0.3) * u;
    const m = mood === "sad" ? "sad" : mood === "wow" ? "wow" : mood === "cross" ? "flat" : mood === "cool" ? "mouth-smirk" : f.mouth;
    const w = side ? 0.12 * u : 0.17 * u;
    if (m === "sad") arc(g, mx, my + 0.12 * u, w * 0.9, 1.2 * Math.PI, 1.8 * Math.PI, 2.4);
    else if (m === "wow" || m === "mouth-small") ellipse(g, mx, my + 0.02 * u, m === "wow" ? 0.07 * u : 0.04 * u, m === "wow" ? 0.09 * u : 0.035 * u, INK);
    else if (m === "flat") line(g, mx - w * 0.6, my + 0.03 * u, mx + w * 0.6, my + 0.03 * u, 2.4);
    else if (m === "mouth-smirk") {
      g.beginPath();
      g.moveTo(mx - w * 0.7, my + 0.02 * u);
      g.quadraticCurveTo(mx + w * 0.2, my + 0.08 * u, mx + w * 0.8, my - 0.06 * u);
      g.strokeStyle = INK;
      g.lineWidth = 2.4;
      g.lineCap = "round";
      g.stroke();
    } else if (m === "mouth-grin" || m === "mouth-laugh") {
      g.beginPath();
      g.moveTo(mx - w, my - 0.02 * u);
      g.quadraticCurveTo(mx, my + (m === "mouth-laugh" ? 0.32 : 0.24) * u, mx + w, my - 0.02 * u);
      g.closePath();
      g.fillStyle = m === "mouth-laugh" ? "#5a1f2b" : "#fff";
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.stroke();
      if (m === "mouth-laugh") ellipse(g, mx, my + 0.13 * u, 0.06 * u, 0.04 * u, "#ff7a6b");
    } else {
      arc(g, mx, my - 0.06 * u, w * 0.85, 0.2 * Math.PI, 0.8 * Math.PI, 1.6);
      if (m === "mouth-cheeky") ellipse(g, mx + 0.04 * u, my + 0.1 * u, 0.045 * u, 0.04 * u, "#ff7a6b");
    }
  }

  // Extras on the cheeks
  const cheeks = side ? [fx - 0.05 * u] : [fx - 0.42 * u, fx + 0.42 * u];
  const cy = fy + 0.13 * u;
  if (f.extras === "extras-rosy") cheeks.forEach((x) => ellipse(g, x, cy, 0.1 * u, 0.06 * u, "rgba(255,120,150,0.45)"));
  if (f.extras === "extras-freckles")
    cheeks.forEach((x) => [-1, 0, 1].forEach((k) => ellipse(g, x + k * 0.07 * u, cy - Math.abs(k) * 0.03 * u, 0.018 * u, 0.018 * u, "rgba(110,60,30,0.7)")));
  if (f.extras === "extras-star") star(g, cheeks[cheeks.length - 1], cy, 0.09 * u, "#ffd166");
  if (f.extras === "extras-plaster") {
    g.save();
    g.translate(cheeks[cheeks.length - 1], cy);
    g.rotate(-0.4);
    g.fillStyle = "#f1c09a";
    g.fillRect(-0.13 * u, -0.045 * u, 0.26 * u, 0.09 * u);
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.strokeRect(-0.13 * u, -0.045 * u, 0.26 * u, 0.09 * u);
    g.restore();
  }
  if (f.extras === "extras-paint")
    cheeks.forEach((x) => {
      g.fillStyle = "#2b5fd9";
      g.fillRect(x - 0.1 * u, cy - 0.03 * u, 0.2 * u, 0.04 * u);
      g.fillStyle = "#f2d9a6";
      g.fillRect(x - 0.1 * u, cy + 0.03 * u, 0.2 * u, 0.04 * u);
    });

  // Glasses and visors
  if (f.face === "face-round" || f.face === "face-star" || f.face === "face-monocle")
    eyesX.forEach((x, i) => {
      if (f.face === "face-monocle" && i === 0 && !side) return;
      if (f.face === "face-star") return star(g, x, eyeY, 0.2 * u, "rgba(255,143,209,0.85)");
      arc(g, x, eyeY, 0.17 * u, 0, Math.PI * 2, 2.2, f.face === "face-monocle" ? "#e8b84a" : INK);
    });
  if (f.face === "face-round" && !side) line(g, eyesX[0] + 0.17 * u, eyeY, eyesX[1] - 0.17 * u, eyeY, 2);
  if (f.face === "face-monocle" && !side) line(g, eyesX[1], eyeY + 0.17 * u, eyesX[1] + 0.06 * u, eyeY + 0.6 * u, 1, "#e8b84a");
  if (covered) {
    const x0 = side ? fx - 0.36 * u : fx - 0.58 * u;
    const w = side ? 0.48 * u : 1.16 * u;
    g.beginPath();
    g.roundRect(x0, eyeY - 0.14 * u, w, 0.26 * u, 0.1 * u);
    g.fillStyle = f.face === "face-vr" ? "#6bc6ff" : INK;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 1.6;
    g.stroke();
    g.fillStyle = "rgba(255,255,255,0.6)";
    g.fillRect(x0 + 0.12 * u, eyeY - 0.08 * u, 0.12 * u, 0.04 * u);
  }
}

function drawLogo(g: CanvasRenderingContext2D, id: string, x: number, y: number, s: number) {
  const logo = logoFor(id);
  if (logo) {
    g.save();
    g.translate(x - s / 2, y - s / 2);
    g.scale(s / 64, s / 64);
    g.beginPath();
    g.roundRect(0, 0, 64, 64, 16);
    g.fillStyle = logo.bg;
    g.fill();
    g.lineWidth = 5;
    g.strokeStyle = INK;
    g.stroke();
    for (const sh of logo.shapes) {
      if (sh.fill === "none") continue;
      g.fillStyle = sh.fill;
      g.fill(new Path2D(sh.d));
    }
    g.restore();
    return;
  }
  // IlluminatED's own "i" badge.
  ellipse(g, x, y, s / 2, s / 2, INK);
  g.fillStyle = "#f2d9a6";
  g.font = `900 ${Math.round(s * 0.72)}px ui-sans-serif, system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("i", x, y + s * 0.04);
}

// ── Painter: draws one character frame onto any canvas ───────────────────
export interface Painter {
  /** Draws a frame. t is seconds into the clip (walk cycles use the stride phase). */
  draw(g: CanvasRenderingContext2D, facing: Facing, clip: Clip, t: number, heightPx: number): void;
  width(heightPx: number): number;
}

// Crop boxes in sheet pixels (x, y, w, h).
const CROP_FULL = [0, 2, 176, 172] as const;
const CROP_NOPET = [16, 2, 112, 172] as const;
const CROP_HEAD = [30, 12, 84, 84] as const;

export async function createPainter(
  avatar: Avatar,
  { mood, showPet = true, headOnly = false, logo }: { mood?: Mood; showPet?: boolean; headOnly?: boolean; logo?: string | null } = {},
): Promise<Painter> {
  const a = { ...DEFAULT_AVATAR, ...avatar };
  const plan = layersFor(a, showPet && !headOnly);
  const crop = headOnly ? CROP_HEAD : plan.pet ? CROP_FULL : CROP_NOPET;
  const chestLogo = logo ?? TOP_LOGO[a.top ?? ""] ?? (a.top === "top-tee" ? "illuminated" : undefined);
  const all = [...plan.back, ...plan.front, ...plan.overHead, ...(plan.pet ? [plan.pet] : [])];
  const imgs = await Promise.all(all.map((l) => load(l.name)));
  const byName = new Map(all.map((l, i) => [l.name, imgs[i]]));
  const face: FaceSpec = {
    eyes: a.eyes ?? "eyes-round",
    brows: a.brows ?? "brows-soft",
    mouth: a.mouth ?? "mouth-smile",
    extras: a.extras ?? "extras-none",
    face: a.face ?? "face-none",
    head: a.head ?? "head-human",
    mood,
  };
  const sheet = (l: Layer) => {
    const img = byName.get(l.name);
    if (!img) return null;
    return l.tint ? tint(img, l.name, l.tint, l.torso) : img;
  };
  return {
    width: (h) => Math.round((h * crop[2]) / crop[3]),
    draw(g, facing, clip, t, heightPx) {
      const mirror = facing === "W";
      const dir = facing === "W" ? "E" : facing;
      const k = CLIP_START.get(`${dir}:${clip === "wave" && dir !== "S" ? "idle" : clip}`) ?? CLIP_START.get("S:idle")!;
      const frame = Math.floor(t * FPS[clip]) % k.count;
      const idx = k.start + ((frame + k.count) % k.count);
      const sx = (idx % COLS) * FRAME;
      const sy = Math.floor(idx / COLS) * FRAME;
      const w = g.canvas.width;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, w, g.canvas.height);
      const scale = heightPx / crop[3];
      g.setTransform(mirror ? -scale : scale, 0, 0, scale, mirror ? w : 0, 0);
      g.translate(-crop[0], -crop[1]);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";
      const put = (l: Layer) => {
        const s = sheet(l);
        if (s) g.drawImage(s, sx, sy, FRAME, FRAME, 0, 0, FRAME, FRAME);
      };
      const an = META.anchors[idx];
      let skirtDrawn = false;
      const skirt = () => {
        if (skirtDrawn || a.bottom !== "bottom-skirt") return;
        skirtDrawn = true;
        const x = an.head[0], y = an.head[1] + U * 1.3;
        const side = dir === "E";
        const waist = U * (side ? 0.45 : 0.65), hem = U * (side ? 0.60 : 0.82);
        const length = U * 0.52;
        g.beginPath();
        g.moveTo(x - waist, y); g.lineTo(x + waist, y);
        g.lineTo(x + hem, y + length); g.lineTo(x - hem, y + length); g.closePath();
        g.fillStyle = outfitColours(a).bottom; g.fill();
        g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
        g.globalAlpha = 0.18;
        for (const fraction of [-0.5, 0, 0.5]) {
          g.beginPath(); g.moveTo(x + waist * fraction, y + 1); g.lineTo(x + hem * fraction, y + length - 1); g.stroke();
        }
        g.globalAlpha = 1;
      };
      for (const layer of plan.back) {
        if (layer.name.endsWith("-skinU") || layer.name.endsWith("-top")) skirt();
        put(layer);
      }
      skirt();
      // Uniform logos on the chest; in the world your company badge also shows on your back.
      if (chestLogo && (dir === "S" || (dir === "N" && logo))) drawLogo(g, chestLogo, an.chest[0], an.chest[1] - 1, 15);
      plan.front.forEach(put);
      if (dir !== "N") drawFace(g, face, an.face[0], an.face[1], dir === "E" ? 1 : 0);
      plan.overHead.forEach(put);
      if (plan.pet) put(plan.pet);
    },
  };
}

// ── The component ──────────────────────────────────────────────────────────
export interface CharacterProps {
  avatar?: Avatar;
  mood?: Mood;
  /** Rendered height in px. */
  size?: number;
  facing?: Facing;
  clip?: Clip;
  /** Pause on the first frame. */
  still?: boolean;
  showPet?: boolean;
  /** Crop to the head (for chips and speech bubbles). */
  headOnly?: boolean;
  /** Company logo to wear on the chest (bosses, uniforms). */
  logo?: string;
  title?: string;
  className?: string;
}

export function AvatarFigure({
  avatar = DEFAULT_AVATAR,
  mood,
  size = 200,
  facing = "S",
  clip = "idle",
  still = false,
  showPet = true,
  headOnly = false,
  logo,
  title,
  className,
}: CharacterProps) {
  const a = useMemo(() => ({ ...DEFAULT_AVATAR, ...avatar }), [avatar]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const hasPet = showPet && !headOnly && !!a.pet && !NONE.has(a.pet);
  const height = size;
  const width = Math.round((size * (headOnly ? 84 : hasPet ? 176 : 112)) / (headOnly ? 84 : 172));
  const key = JSON.stringify(a);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    void createPainter(JSON.parse(key) as Avatar, { mood, showPet, headOnly, logo }).then((p) => {
      const c = canvas.current;
      if (!alive || !c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
      const g = c.getContext("2d")!;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const start = performance.now();
      setReady(true);
      if (still || reduce) {
        p.draw(g, facing, clip, 0, height * dpr);
        return;
      }
      const tick = (now: number) => {
        p.draw(g, facing, clip, (now - start) / 1000, height * dpr);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [key, mood, showPet, headOnly, logo, facing, clip, still, width, height]);

  return (
    <canvas
      ref={canvas}
      role={title === "" ? undefined : "img"}
      aria-label={title === "" ? undefined : (title ?? "Character")}
      aria-hidden={title === "" ? true : undefined}
      className={className}
      style={{ width, height, opacity: ready ? 1 : 0, transition: "opacity 120ms" }}
    />
  );
}

// ── Worlds: one canvas per player, driven by the world's game loop ─────────
type PaintedCanvas = HTMLCanvasElement & { __painter?: Painter; __last?: string; __h?: number };

/** World sprite height in CSS px. */
export const WORLD_FIGURE_H = 40;

export function WorldFigure({ avatar, badge, ghost = false }: { avatar: Avatar; badge: string | null; ghost?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(avatar);
  const [w, setW] = useState(56);
  useEffect(() => {
    let alive = true;
    void createPainter(JSON.parse(key) as Avatar, { logo: badge }).then((p) => {
      const c = ref.current as PaintedCanvas | null;
      if (!alive || !c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = p.width(WORLD_FIGURE_H);
      setW(width);
      c.width = Math.round(width * dpr);
      c.height = Math.round(WORLD_FIGURE_H * dpr);
      c.__painter = p;
      c.__h = WORLD_FIGURE_H * dpr;
      c.__last = "";
      p.draw(c.getContext("2d")!, "S", "idle", 0, c.__h);
    });
    return () => {
      alive = false;
    };
  }, [key, badge]);
  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`td-char pointer-events-none absolute bottom-0 left-1/2 -translate-x-[38%] ${ghost ? "opacity-30" : ""}`}
      style={{ width: w, height: WORLD_FIGURE_H }}
    />
  );
}

/**
 * Called every frame by the world loop. ang: heading (0 = up/away, π = down),
 * phase: stride phase in radians, walk: 0..1 how much they're walking.
 */
export function poseWorldFigure(root: Element, ang: number, phase: number, walk: number, now: number) {
  const c = root.querySelector<HTMLCanvasElement>("canvas.td-char") as PaintedCanvas | null;
  if (!c?.__painter || !c.__h) return;
  const a = Math.atan2(Math.sin(ang), Math.cos(ang));
  const facing: Facing = Math.abs(a) < Math.PI / 4 ? "N" : Math.abs(a) > (3 * Math.PI) / 4 ? "S" : a > 0 ? "E" : "W";
  const walking = walk > 0.4;
  const clip: Clip = walking ? "walk" : "idle";
  // Walk frames follow the stride (8 frames per cycle); idle breathes on the clock.
  const t = walking ? (phase / (Math.PI * 2)) * (8 / FPS.walk) : now / 1000;
  const frame = Math.floor(t * FPS[clip]);
  const key = `${facing}${clip}${frame}`;
  if (key === c.__last) return;
  c.__last = key;
  c.__painter.draw(c.getContext("2d")!, facing, clip, t, c.__h);
}
