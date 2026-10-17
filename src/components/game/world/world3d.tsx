"use client";

import { useEffect, useRef } from "react";

import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { BUS_ROUTE_CODES, TRAFFIC_BOXES } from "./art";
import { type Character3D, buildCharacter, npcLook } from "../char3d";
import type { TechEvent } from "../event-ads";
import { ukPhase } from "./fx";

import { COMPANIES } from "@/game/core/companies";
import { look } from "@/game/core/cosmetics";
import type { Avatar } from "@/game/core/cosmetics";
import { furnitureById } from "@/game/core/homes";
import { logoFor } from "@/game/core/logos";
import { buildLondon } from "@/game/core/london";
import { buildHighlands } from "@/game/core/regions";
import { STATION_PLATFORM_Y } from "@/game/core/world";
import { TILE, type Portal, type WorldMap } from "@/game/core/world";

/**
 * The live 3D world (three.js), viewed like Animal Crossing: a tilted camera that
 * follows you and a "rolling log" world that curves away towards the horizon.
 * Same layout and collisions as the 2D game (london.ts / regions.ts); 1 unit = 1 tile.
 * Models are Kenney CC0 kits (public/world3d); terraces, landmarks, buses and
 * mountains are built here from simple shapes.
 */

/** Where the people on the street are (px), for "someone's near you" checks. */
export const NPC_SPOTS: { x: number; y: number }[] = [];

/** When the platform train's 16-second cycle started (ms, performance clock). */
export const TRAIN_CALL = { at: -1 };

export interface Mover3D {
  id: string;
  x: number;
  y: number;
  walking: boolean;
  avatar: Avatar;
  car?: string | null;
}

// ── Rolling-log curvature: every material bends the world down away from the camera focus ──
const FOCUS = { value: new THREE.Vector3() };
/** Curvature (z, x): strong outdoors, off indoors. */
const BEND = { value: new THREE.Vector2(0.0055, 0.0012) };
function bend(m: THREE.Material) {
  if (m.userData.bent) return;
  m.userData.bent = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFocus = FOCUS;
    sh.uniforms.uBend = BEND;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uFocus;\nuniform vec2 uBend;")
      .replace(
        "#include <project_vertex>",
        `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 bw = modelMatrix * mvPosition;
float bz = bw.z - uFocus.z;
float bx = bw.x - uFocus.x;
bw.y -= bz * bz * uBend.x + bx * bx * uBend.y;
mvPosition = viewMatrix * bw;
gl_Position = projectionMatrix * mvPosition;`,
      );
  };
  m.needsUpdate = true;
}
const bendAll = (o: THREE.Object3D) =>
  o.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(bend);
  });

// ── Shared materials (soft, matte, Animal Crossing-ish) ──
const MATS = new Map<string, THREE.MeshLambertMaterial>();
const mat = (c: string) => {
  let m = MATS.get(c);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: c });
    bend(m);
    MATS.set(c, m);
  }
  return m;
};
const BOX = new THREE.BoxGeometry(1, 1, 1);
function box(g: THREE.Group, colour: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  // x right, y up, z south (tile y). Coordinates are min/max corners.
  const m = new THREE.Mesh(BOX, mat(colour));
  m.scale.set(Math.max(0.001, x1 - x0), Math.max(0.001, y1 - y0), Math.max(0.001, z1 - z0));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
function cyl(g: THREE.Group, colour: string, x: number, z: number, y0: number, y1: number, r: number, seg = 16, r2?: number) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r, r, y1 - y0, seg), mat(colour));
  m.position.set(x, (y0 + y1) / 2, z);
  m.castShadow = true;
  g.add(m);
  return m;
}
function roof(g: THREE.Group, colour: string, x0: number, z0: number, x1: number, z1: number, y: number, h: number) {
  // A pitched roof, ridge along x.
  const shape = new THREE.Shape();
  const d = z1 - z0;
  shape.moveTo(0, 0);
  shape.lineTo(d, 0);
  shape.lineTo(d / 2, h);
  shape.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false });
  const m = new THREE.Mesh(geo, mat(colour));
  m.rotation.y = Math.PI / 2;
  m.position.set(x0, y, z1);
  m.castShadow = true;
  g.add(m);
}

// ── Signs: crisp canvas-text panels (station names, shop fronts, parody company logos) ──
function sign(text: string, o: { bg: string; fg: string; w: number; h: number; font?: string; logo?: string | null; badge?: boolean }) {
  const H = 128;
  const W = Math.round((o.w / o.h) * H);
  const c = document.createElement("canvas");
  c.width = W * 2;
  c.height = H * 2;
  const ctx = c.getContext("2d")!;
  ctx.scale(2, 2);
  ctx.fillStyle = o.bg;
  ctx.fillRect(0, 0, W, H);
  let x = H * 0.18;
  const logo = o.logo ? logoFor(o.logo) : null;
  if (logo) {
    const s = H * 0.76;
    ctx.save();
    ctx.translate(x, (H - s) / 2);
    ctx.scale(s / 64, s / 64);
    ctx.fillStyle = logo.bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, 64, 64, 14);
    ctx.fill();
    for (const sh of logo.shapes) {
      ctx.fillStyle = sh.fill;
      ctx.fill(new Path2D(sh.d));
    }
    ctx.restore();
    x += s + H * 0.14;
  }
  if (o.badge) {
    // Our own hexagon Underground badge (not the real roundel).
    const r2 = H * 0.36;
    const cx = x + r2;
    const cy = H / 2;
    ctx.fillStyle = "#2b5fd9";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      ctx[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - r2 * 1.1, cy - 8, r2 * 2.2, 16);
    x += r2 * 2 + H * 0.16;
  }
  ctx.fillStyle = o.fg;
  ctx.font = o.font ?? `800 ${Math.round(H * 0.46)}px system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  let size = Math.round(H * 0.46);
  while (ctx.measureText(text).width > W - x - H * 0.15 && size > 16) {
    size -= 4;
    ctx.font = o.font ? o.font.replace(/\d+px/, `${size}px`) : `800 ${size}px system-ui, sans-serif`;
  }
  ctx.fillText(text, logo || o.badge ? x : Math.max(x, (W - ctx.measureText(text).width) / 2), H / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  bend(m);
  return new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), m);
}

// ── Kenney models ──
const loader = new GLTFLoader();
const CACHE = new Map<string, Promise<GLTF>>();
const load = (url: string) => {
  let p = CACHE.get(url);
  if (!p) {
    p = loader.loadAsync(url);
    CACHE.set(url, p);
  }
  return p;
};
/** Places a model fitted into a footprint (x, z, w, d in tiles), standing on y. */
async function place(g: THREE.Group, url: string, x: number, z: number, w: number, d: number, y = 0, rot = 0) {
  const gltf = await load(url);
  const o = gltf.scene.clone(true);
  o.rotation.y = rot;
  const bb = new THREE.Box3().setFromObject(o);
  const size = bb.getSize(new THREE.Vector3());
  const s = Math.min(w / size.x, d / size.z);
  o.scale.setScalar(s);
  const bb2 = new THREE.Box3().setFromObject(o);
  const c = bb2.getCenter(new THREE.Vector3());
  o.position.set(x + w / 2 - c.x, y - bb2.min.y, z + d / 2 - c.z);
  bendAll(o);
  g.add(o);
  return o;
}

const GROUND: Record<string, [string, number]> = {
  g: ["#8fd16f", 0.05],
  f: ["#88cc69", 0.05],
  T: ["#8fd16f", 0.05],
  "-": ["#e9e1d0", 0.12],
  _: ["#ecd8a4", 0.08],
  "=": ["#6b6f7e", 0],
  ":": ["#6b6f7e", 0],
  "|": ["#cbbfa8", 0.3],
  X: ["#e9e1d0", 0.12],
  L: ["#e9e1d0", 0.12],
  B: ["#ecd8a4", 0.08],
  k: ["#8fd16f", 0.05],
};

function groundMesh(tiles: string[], highland: boolean) {
  const pos: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  const quad = (x0: number, z0: number, x1: number, z1: number, y: number, hex: string) => {
    c.set(hex);
    pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
    for (let i = 0; i < 6; i++) col.push(c.r, c.g, c.b);
  };
  const wall = (x0: number, z0: number, x1: number, z1: number, ya: number, yb: number, hex: string) => {
    c.set(hex);
    pos.push(x0, yb, z0, x0, ya, z0, x1, ya, z1, x0, yb, z0, x1, ya, z1, x1, yb, z1);
    for (let i = 0; i < 6; i++) col.push(c.r, c.g, c.b);
  };
  tiles.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === "w") return;
      const [hex0, h] = GROUND[ch] ?? (highland ? GROUND.g : ["#e9e1d0", 0.12]);
      let hex = hex0;
      // A soft checker on grass and paving, like hand-laid tiles.
      if ((x + y) % 2 && (ch === "-" || ch === "X" || ch === "L")) hex = "#e2d9c6";
      if ((x * 7 + y * 3) % 5 === 0 && (ch === "g" || ch === "T" || ch === "k")) hex = "#93d473";
      quad(x, y, x + 1, y + 1, h, hex);
      // Kerb on the south edge where paving meets road.
      const below = tiles[y + 1]?.[x];
      if (below && (GROUND[below]?.[1] ?? 0.12) < h) wall(x, y + 1, x + 1, y + 1, (GROUND[below]?.[1] ?? 0), h, "#c7bda8");
      if (row[x + 1] === "w" || row[x - 1] === "w" || tiles[y + 1]?.[x] === "w" || tiles[y - 1]?.[x] === "w") {
        if (tiles[y + 1]?.[x] === "w") wall(x, y + 1, x + 1, y + 1, -0.35, h, highland ? "#b9ad8f" : "#cfc6b6");
      }
    }),
  );
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  bend(m);
  const mesh = new THREE.Mesh(geo, m);
  mesh.receiveShadow = true;
  return mesh;
}

// ── Buildings ──
const COMMERCIAL = "/world3d/commercial/";
const MIDRISE = "abcdefghijklmn".split("").map((c) => `${COMMERCIAL}building-${c}.glb`);
const TOWERS = "abcde".split("").map((c) => `${COMMERCIAL}building-skyscraper-${c}.glb`);

function terrace(g: THREE.Group, t: { x: number; y: number; w: number; h: number; id: string }, highland: boolean) {
  const seed = t.x * 7 + t.y * 13;
  const x0 = t.x + 0.08;
  const z0 = t.y + 0.08;
  const w = t.w - 0.16;
  const d = t.h - 0.16;
  const wall = highland ? ["#f2ead8", "#e6dcc6", "#efe6d4"][seed % 3] : ["#b9634a", "#a65840", "#d8be92", "#ead9bd", "#c26b4f"][seed % 5];
  const roofC = highland || seed % 3 ? "#5d6070" : "#7a5446";
  const floors = highland ? 2 : 3;
  const top = 0.15 + floors * 0.95;
  box(g, wall, x0, 0, z0 + 0.25, x0 + w, top, z0 + d);
  box(g, "#f6f2ea", x0 - 0.04, top - 0.12, z0 + d - 0.06, x0 + w + 0.04, top, z0 + d + 0.04);
  roof(g, roofC, x0 - 0.05, z0 + 0.2, x0 + w + 0.05, z0 + d + 0.05, top, 0.9);
  const bays = Math.max(2, Math.round(w / 1.3));
  const bw = w / bays;
  const door = ["#1b3a6b", "#2d6a4f", "#2a2730", "#c8322d"][seed % 4];
  for (let b = 0; b < bays; b++) {
    if (b % 2 === 0) {
      const cx = x0 + b * bw + 0.15;
      box(g, highland ? "#c9bfaa" : "#8c4433", cx, top + 0.3, z0 + d * 0.45, cx + 0.35, top + 1.2, z0 + d * 0.45 + 0.3);
    }
    for (let f = 0; f < floors; f++) {
      const y0 = 0.15 + f * 0.95;
      const wx0 = x0 + b * bw + bw * 0.28;
      const wx1 = x0 + b * bw + bw * 0.72;
      const zf = z0 + d;
      if (f === 0 && b === Math.floor(bays / 2)) {
        box(g, door, wx0, y0, zf - 0.02, wx1, y0 + 0.72, zf + 0.03);
        box(g, "#f6f2ea", wx0 - 0.05, y0 + 0.72, zf - 0.02, wx1 + 0.05, y0 + 0.8, zf + 0.04);
        continue;
      }
      box(g, "#f6f2ea", wx0 - 0.05, y0 + 0.18, zf - 0.02, wx1 + 0.05, y0 + 0.78, zf + 0.02);
      box(g, "#3e4a60", wx0, y0 + 0.23, zf - 0.01, wx1, y0 + 0.73, zf + 0.03);
      box(g, "#f6f2ea", wx0, y0 + 0.47, zf - 0.01, wx1, y0 + 0.49, zf + 0.04);
    }
  }
}

async function building(g: THREE.Group, t: Extract<ReturnType<typeof buildLondon>["things"][number], { kind: "building" }>) {
  const x0 = t.x + 0.08;
  const z0 = t.y + 0.08;
  const w = t.w - 0.16;
  const d = t.h - 0.16;
  const seed = t.x * 7 + t.y * 13;
  box(g, "#e9e1d0", x0 - 0.05, 0, z0 - 0.05, x0 + w + 0.05, 0.13, z0 + d + 0.05);
  if (t.style === "terrace") return terrace(g, t, false);
  const jobs: Promise<unknown>[] = [];
  if (t.style === "office" || t.style === "stone" || t.style === "company" || t.style === "glass") {
    const lib = t.style === "glass" || t.style === "company" ? TOWERS : MIDRISE;
    const cols = Math.max(1, Math.round(w / 3.2));
    const rows = Math.max(1, Math.round(d / 3.6));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) jobs.push(place(g, lib[(seed + r * 3 + c) % lib.length], x0 + (c * w) / cols, z0 + (r * d) / rows, w / cols, d / rows, 0.13));
    if (t.style === "company") box(g, t.accent ?? "#c8322d", x0 + 0.1, 0.12, z0 + d - 0.12, x0 + w - 0.1, 0.9, z0 + d + 0.02);
  } else {
    const cols = Math.max(1, Math.round(w / 2.2));
    for (let c = 0; c < cols; c++) jobs.push(place(g, MIDRISE[(seed + c * 5) % MIDRISE.length], x0 + (c * w) / cols, z0, w / cols, d, 0.13));
    if (t.style === "shop") box(g, ["#2d6a4f", "#c8322d", "#1b3a6b", "#1f5f8b"][t.x % 4], x0 + 0.1, 1.05, z0 + d - 0.02, x0 + w - 0.1, 1.18, z0 + d + 0.55);
  }
  await Promise.all(jobs);
}

function landmark(g: THREE.Group, t: Extract<ReturnType<typeof buildLondon>["things"][number], { kind: "landmark" }>) {
  const { x, y: z, w, h: d, name } = t;
  const STONE = "#e8dcc0";
  const GOLDEN = "#d9b45a";
  const cx = x + w / 2;
  const cz = z + d / 2;
  switch (name) {
    case "big-ben": {
      // Elizabeth Tower: stone shaft with ribs, four clock faces, belfry, slate spire and gold pinnacles.
      const x0 = x + 0.25;
      const z0 = z + 0.25;
      const x1 = x + w - 0.25;
      const z1 = z + d - 0.25;
      box(g, GOLDEN, x0, 0, z0, x1, 6.4, z1);
      for (let i = 0; i <= 4; i++) {
        const t = x0 + ((x1 - x0) * i) / 4;
        box(g, "#c9a24a", t - 0.04, 0.3, z1 - 0.02, t + 0.04, 6.2, z1 + 0.04);
      }
      for (const yy of [1.6, 3.2, 4.8]) box(g, "#c9a24a", x0 - 0.04, yy, z0 - 0.04, x1 + 0.04, yy + 0.1, z1 + 0.04);
      box(g, "#e3c26a", x0 - 0.12, 6.4, z0 - 0.12, x1 + 0.12, 8.2, z1 + 0.12);
      // Clock faces on all four sides.
      const r = (x1 - x0) * 0.4;
      const face = (px: number, pz: number, ry: number) => {
        const f = new THREE.Group();
        f.position.set(px, 7.3, pz);
        f.rotation.y = ry;
        const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 32), mat("#f6f2ea"));
        f.add(disc);
        const rim = new THREE.Mesh(new THREE.RingGeometry(r, r * 1.12, 32), mat("#2f3644"));
        f.add(rim);
        const hand1 = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.08, r * 0.75), mat("#1b1622"));
        hand1.position.set(0, r * 0.32, 0.01);
        f.add(hand1);
        const hand2 = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.55, r * 0.08), mat("#1b1622"));
        hand2.position.set(r * 0.25, 0, 0.012);
        f.add(hand2);
        g.add(f);
      };
      face(cx, z1 + 0.13, 0);
      face(cx, z0 - 0.13, Math.PI);
      face(x1 + 0.13, cz, Math.PI / 2);
      face(x0 - 0.13, cz, -Math.PI / 2);
      box(g, "#d9b45a", x0 - 0.05, 8.2, z0 - 0.05, x1 + 0.05, 9.1, z1 + 0.05);
      for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) cyl(g, "#d9b45a", px, pz, 8.2, 10.2, 0.01, 6, 0.12);
      const sp = cyl(g, "#3e4a60", cx, cz, 9.1, 11.6, 0.01, 4, (x1 - x0) * 0.62);
      sp.rotation.y = Math.PI / 4;
      cyl(g, "#ffd166", cx, cz, 11.6, 12.1, 0.01, 6, 0.06);
      break;
    }
    case "parliament":
      box(g, GOLDEN, x, 0, z, x + w, 2.6, z + d);
      for (let i = 0; i <= w; i += 2) cyl(g, GOLDEN, x + i, z + d - 0.2, 2.6, 3.6, 0.01, 4, 0.18);
      box(g, GOLDEN, x + w - 2, 0, z, x + w, 5, z + d);
      break;
    case "eye": {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.12, 8, 64), mat("#f2f4f8"));
      wheel.position.set(cx, 5.2, cz);
      wheel.userData.spin = true;
      g.add(wheel);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const pod = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), mat("#ffffff"));
        pod.position.set(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 0);
        wheel.add(pod);
      }
      box(g, "#d8dde6", cx - 0.1, 0, cz - 0.1, cx + 0.1, 5.2, cz + 0.1);
      break;
    }
    case "st-pauls":
      box(g, STONE, x + 1, 0, z + 2, x + w - 1, 2.4, z + d - 1);
      cyl(g, STONE, cx, cz, 2.4, 3.8, 2.4, 24);
      {
        const dome = new THREE.Mesh(new THREE.SphereGeometry(2.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#7aa39a"));
        dome.position.set(cx, 3.8, cz);
        dome.castShadow = true;
        g.add(dome);
      }
      cyl(g, GOLDEN, cx, cz, 6.1, 7, 0.01, 8, 0.2);
      break;
    case "shard":
      cyl(g, "#9fc2dc", cx, cz, 0, 13, 0.15, 4, 2.2).rotation.y = Math.PI / 4;
      break;
    case "gherkin": {
      const gk = new THREE.Mesh(new THREE.SphereGeometry(1.6, 18, 16), mat("#5a8fb0"));
      gk.scale.set(1, 3.2, 1);
      gk.position.set(cx, 4.4, cz);
      gk.castShadow = true;
      g.add(gk);
      break;
    }
    case "tower-bridge":
      for (const zz of [z + 1, z + d - 1]) {
        box(g, STONE, cx - 1, 0, zz - 0.6, cx + 1, 5, zz + 0.6);
        for (const [dx, dz] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) cyl(g, "#2f5b4a", cx + dx, zz + dz, 5, 6, 0.01, 4, 0.3);
      }
      box(g, "#6aa3c9", cx - 0.6, 4.2, z + 1, cx + 0.6, 4.6, z + d - 1);
      break;
    case "tower":
      box(g, "#d9cfb8", x + 0.5, 0, z + 0.5, x + w - 0.5, 3, z + d - 0.5);
      for (const [dx, dz] of [[0.5, 0.5], [w - 0.5, 0.5], [0.5, d - 0.5], [w - 0.5, d - 0.5]]) cyl(g, "#d9cfb8", x + dx, z + dz, 0, 4, 0.5, 10);
      break;
    case "battersea":
      box(g, "#b0624a", x + 1, 0, z + 1, x + w - 1, 3.5, z + d - 1);
      for (const [dx, dz] of [[1, 1], [w - 1, 1], [1, d - 1], [w - 1, d - 1]]) cyl(g, "#f2ece0", x + dx, z + dz, 0, 7, 0.45, 14, 0.38);
      break;
    case "tate":
      box(g, "#8c4a3a", x, 0, z, x + w, 3, z + d);
      box(g, "#8c4a3a", cx - 0.4, 3, cz - 0.4, cx + 0.4, 7, cz + 0.4);
      break;
    case "palace":
      box(g, "#efe7d4", x + 0.5, 0, z + 1, x + w - 0.5, 2.6, z + d - 1);
      box(g, "#d9cfb8", x, 0, z + d - 1, x + w, 0.6, z + d);
      break;
    case "canary":
      for (let i = 0; i < 3; i++) {
        const xx = x + 1 + i * (w / 3);
        box(g, "#b8c6d6", xx, 0, z + 1, xx + w / 3 - 1, 7 + i * 2, z + d - 1);
        cyl(g, "#dfe6ee", xx + (w / 3 - 1) / 2, z + d / 2, 7 + i * 2, 8.5 + i * 2, 0.01, 4, 0.8);
      }
      break;
  }
}

/** A Lyme-style e-bike: white step-through frame, green fork, bars and basket, black rear cover. Faces +x. */
export function lymeBike(green = "#4cd137") {
  const g = new THREE.Group();
  const wheel = (x: number) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 8, 22), mat("#1b1622"));
    w.position.set(x, 0.24, 0);
    w.castShadow = true;
    g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), mat("#8d93a0"));
    hub.rotation.x = Math.PI / 2;
    hub.position.set(x, 0.24, 0);
    g.add(hub);
  };
  wheel(-0.42);
  wheel(0.42);
  // Frame: low step-through tube, seat post, rear cover.
  const tube = (x0: number, y0: number, x1: number, y1: number, c: string, r = 0.035) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat(c));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    m.rotation.z = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
    m.castShadow = true;
    g.add(m);
  };
  tube(-0.12, 0.24, 0.26, 0.26, "#f3f6fb", 0.05);
  tube(0.26, 0.26, 0.34, 0.66, "#f3f6fb", 0.045);
  tube(-0.12, 0.24, -0.2, 0.62, "#f3f6fb", 0.04);
  box(g, "#2a2733", -0.52, 0.2, -0.08, -0.06, 0.42, 0.08);
  box(g, "#1b1622", -0.3, 0.62, -0.07, -0.08, 0.68, 0.07);
  // Green fork, stem, handlebars and basket.
  tube(0.42, 0.24, 0.36, 0.76, green, 0.035);
  tube(0.36, 0.76, 0.36, 0.86, green, 0.03);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.46, 8), mat("#1b1622"));
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0.34, 0.88, 0);
  g.add(bar);
  box(g, green, 0.46, 0.5, -0.15, 0.72, 0.72, 0.15);
  box(g, "#3aa82b", 0.47, 0.71, -0.14, 0.71, 0.73, 0.14);
  return g;
}

function busModel(route: string) {
  const g = new THREE.Group();
  // Route number and destination on the front and both sides.
  const blind = sign(`${route}  London`, { bg: "#15151c", fg: "#ffb020", w: 0.9, h: 0.18, font: "bold 64px monospace" });
  blind.position.set(1.41, 1.2, 0);
  blind.rotation.y = Math.PI / 2;
  g.add(blind);
  for (const side of [-1, 1]) {
    const s = sign(route, { bg: "#15151c", fg: "#ffb020", w: 0.5, h: 0.2, font: "bold 80px monospace" });
    s.position.set(-0.9, 1.2, side * 0.49);
    s.rotation.y = side > 0 ? 0 : Math.PI;
    g.add(s);
  }
  box(g, "#d72a22", -1.35, 0.25, -0.48, 1.35, 2.05, 0.48);
  box(g, "#1c2430", -1.15, 1.4, -0.5, 1.2, 1.82, 0.5);
  box(g, "#1c2430", -0.9, 0.62, -0.5, 0.6, 1.0, 0.5);
  box(g, "#1c2430", 1.33, 0.5, -0.42, 1.37, 1.85, 0.42);
  box(g, "#15151c", 1.3, 0.2, -0.45, 1.38, 0.5, 0.45);
  box(g, "#15151c", 1.36, 1.1, -0.36, 1.4, 1.3, 0.36);
  box(g, "#b81f19", -1.3, 2.05, -0.44, 1.3, 2.12, 0.44);
  for (const xx of [-0.9, 0.9])
    for (const zz of [-0.48, 0.48]) {
      const wh = cyl(g, "#2a2730", xx, zz, 0, 0, 0.25, 14);
      wh.geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.14, 14);
      wh.rotation.x = Math.PI / 2;
      wh.position.y = 0.25;
    }
  return g;
}

// ── Indoors: rooms built from the tile map (walls, floors, furniture), cut away at the front ──
const FURNITURE_MODEL: Record<string, string[]> = {
  bed: ["bedDouble"],
  wardrobe: ["bookcaseClosedDoors"],
  shelf: ["bookcaseOpen"],
  desk: ["desk", "computerScreen"],
  tv: ["cabinetTelevision", "televisionModern"],
  sofa: ["loungeSofa"],
  table: ["tableCoffee"],
  petbed: ["rugRound"],
  plant: ["plantSmall1"],
  lamp: ["lampRoundFloor"],
  armchair: ["loungeChair"],
  beanbag: ["loungeChairRelax"],
  rug: ["rugRound"],
  fridge: ["kitchenFridge"],
  fishtank: ["tableGlass"],
  gaming: ["desk", "computerScreen"],
  telescope: ["lampSquareFloor"],
  trophies: ["bookcaseClosedWide"],
  piano: ["kitchenBar"],
  arcade: ["kitchenFridgeLarge"],
};
const TILE_MODEL: Record<string, string> = { d: "desk", c: "chairDesk", t: "table", o: "table", s: "loungeSofa", v: "kitchenFridgeLarge", k: "kitchenCabinet", F: "kitchenFridge", A: "desk", r: "kitchenBar", b: "bookcaseOpen", p: "plantSmall2", L: "lampSquareFloor" };
const FLOOR: Record<string, string> = { ".": "#ead9bb", m: "#dfe7f2", l: "#8e7ae0", ",": "#f2f1ee", e: "#b9ad96", X: "#ead9bb", "-": "#e9e1d0", _: "#ecd8a4" };

function interior(world: THREE.Group, map: WorldMap, jobs: Promise<unknown>[], station: boolean) {
  const g = new THREE.Group();
  world.add(g);
  const rows = map.tiles;
  const H = rows.length;
  const Wd = rows[0].length;
  const furn = "dctosvkFArbpL";
  const home = map.kind === "home";
  for (let y = 0; y < H; y++)
    for (let x = 0; x < Wd; x++) {
      const ch = rows[y][x];
      if (ch === "G" && map.kind === "prison") {
        // Cell bars.
        for (let k = 0; k < 4; k++) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 8), mat("#5d6070"));
          bar.position.set(x + 0.12 + k * 0.25, 1.2, y + 0.5);
          bar.castShadow = true;
          g.add(bar);
        }
        box(g, "#5d6070", x, 2.35, y + 0.42, x + 1, 2.45, y + 0.58);
        box(g, "#c9c4b8", x, -0.05, y, x + 1, 0.01, y + 1);
        continue;
      }
      if (ch === "#" || ch === "W" || ch === "G") {
        // Back and side walls full height; the front wall is cut low so you can see in.
        const front = y >= H - 1 || (y > H / 2 && rows[y - 1]?.[x] !== "#" && rows[y + 1]?.[x] === undefined);
        const h = front ? 0.35 : ch === "G" ? 2.4 : 3;
        box(g, ch === "G" ? "#bfe0ef" : home ? "#f3e7d3" : station ? "#f6f2e8" : "#eef0f4", x, 0, y, x + 1, h, y + 1);
        if (ch === "W") box(g, "#9fd2ef", x + 0.15, 1.1, y + 0.98, x + 0.85, 2.3, y + 1.02);
        if (!front) box(g, home ? "#d9c7a6" : "#c9ced8", x, 0, y + 0.98, x + 1, 0.25, y + 1.03);
        continue;
      }
      if (station && y >= STATION_PLATFORM_Y + 3 && ch === "X") continue; // track pit
      box(g, FLOOR[ch] ?? ((x + y) % 2 ? "#ead9bb" : "#e3d1b0"), x, -0.05, y, x + 1, (x + y) % 2 && !home ? 0.02 : 0.01, y + 1);
    }
  // Office / station furniture from tile runs.
  if (!home)
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < Wd) {
        const ch = rows[y][x];
        if (!furn.includes(ch)) {
          x++;
          continue;
        }
        let w = 1;
        while (rows[y][x + w] === ch) w++;
        if (map.kind === "hospital" && ch === "d") {
          jobs.push(place(g, "/world3d/furniture/bedSingle.glb", x + 0.1, y + 0.05, w - 0.2, 1.9));
        } else if (map.kind === "prison" && ch === "b") {
          jobs.push(place(g, "/world3d/furniture/bedBunk.glb", x - 0.3, y - 1.5, 1.6, 2.4));
        } else if (station && ch === "r") {
          for (let i = 0; i < w; i++) box(g, "#c9ced8", x + i, 0, y + 0.3, x + i + 1, 0.9, y + 0.7);
        } else if (station && ch === "v") {
          for (let i = 0; i < w; i++) {
            box(g, "#2b5fd9", x + i + 0.1, 0, y + 0.3, x + i + 0.9, 1.6, y + 0.9);
            box(g, "#bfe3ff", x + i + 0.2, 1.0, y + 0.9, x + i + 0.8, 1.4, y + 0.92);
          }
        } else if (station && ch === "s") {
          box(g, "#4a4fb8", x + 0.05, 0.35, y + 0.3, x + w - 0.05, 0.5, y + 0.8);
          box(g, "#4a4fb8", x + 0.05, 0.5, y + 0.7, x + w - 0.05, 1.0, y + 0.8);
        } else {
          const model = TILE_MODEL[ch];
          // Long runs (desk rows, counters) get one model per two tiles.
          const step = w > 2 ? 2 : w;
          for (let i = 0; i < w; i += step) jobs.push(place(g, `/world3d/furniture/${model}.glb`, x + i + 0.05, y + 0.05, Math.min(step, w - i) - 0.1, 0.9));
        }
        x += w;
      }
    }
  // Station gates: steel posts with red paddles.
  if (station)
    for (let x = 0; x < Wd; x++)
      if (rows[7]?.[x] === "e") {
        box(g, "#c9ced8", x, 0, 7.3, x + 0.18, 1, 7.7);
        box(g, "#d72a22", x + 0.18, 0.55, 7.45, x + 0.55, 0.75, 7.55);
      }
  // Your furniture at home, as real 3D pieces.
  if (home && map.layout)
    for (const p of map.layout) {
      const f = furnitureById(p.item);
      const models = f ? FURNITURE_MODEL[f.id] : null;
      if (!f || !models) continue;
      models.forEach((m, i) => {
        if (i === 0) jobs.push(place(g, `/world3d/furniture/${m}.glb`, p.x + 0.05, p.y + 0.05, f.w - 0.1, f.h - 0.1));
        else jobs.push(place(g, `/world3d/furniture/${m}.glb`, p.x + f.w * 0.3, p.y + 0.1, f.w * 0.4, Math.min(0.6, f.h * 0.4), m === "televisionModern" ? 0.55 : 0.78));
      });
    }
  return g;
}

/** A deep-level tube train: red cab ends, white and blue cars, red doors. */
function tubeTrain() {
  const g = new THREE.Group();
  for (let c = 0; c < 4; c++) {
    const x0 = c * 6.2;
    box(g, "#eef0f4", x0, 0.3, -0.75, x0 + 6, 2.4, 0.75);
    box(g, "#1f3fa8", x0, 0.45, -0.77, x0 + 6, 0.95, 0.77);
    for (let w = 0; w < 4; w++) box(g, "#2a3346", x0 + 0.5 + w * 1.4, 1.35, -0.78, x0 + 1.4 + w * 1.4, 2.0, 0.78);
    box(g, "#d72a22", x0 + 2.6, 0.45, -0.79, x0 + 3.4, 2.25, 0.79);
    box(g, "#2a2733", x0, 0.05, -0.6, x0 + 6, 0.3, 0.6);
  }
  box(g, "#d72a22", 24.2, 0.3, -0.75, 25.4, 2.4, 0.75);
  box(g, "#1c2430", 25.2, 1.2, -0.55, 25.42, 2.1, 0.55);
  return g;
}

export function World3D({
  map,
  getMe,
  getOthers,
  avatar,
  car,
  bike = null,
  ads = [],
  nearPortal,
  onGround,
}: {
  map: WorldMap;
  getMe: () => { x: number; y: number; walking: boolean };
  getOthers: () => Mover3D[];
  avatar: Avatar;
  car: string | null;
  /** Colour of the hire bike you're riding, if any. */
  bike?: string | null;
  /** Real hackathons and tech events for the billboards. */
  ads?: TechEvent[];
  nearPortal: () => Portal | null;
  onGround: (x: number, y: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const carRef = useRef(car);
  carRef.current = car;
  const bikeRef = useRef(bike);
  bikeRef.current = bike;
  const avatarKey = JSON.stringify(avatar);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const highland = map.art === "highlands";
    const london = map.art === "london";
    const indoors = !london && !highland && map.kind !== "campus";
    const station = map.kind === "station";
    BEND.value.set(indoors ? 0 : 0.0055, indoors ? 0 : 0.0012);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const sky = highland ? "#bfe3ff" : "#cfe6f7";
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.Fog(sky, 34, 70);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);

    // ?time=day|dusk|night previews the lighting; otherwise it follows UK time.
    const forced = new URLSearchParams(window.location.search).get("time");
    const phase = forced === "day" || forced === "dusk" || forced === "night" ? forced : ukPhase();
    const hemi = new THREE.HemisphereLight(phase === "night" ? "#8fa3e0" : "#ffffff", phase === "night" ? "#4a5278" : "#b7c99a", phase === "night" ? 1.5 : 1.7);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(phase === "night" ? "#9fb0ff" : phase === "dusk" ? "#ffc89a" : "#fff6e6", phase === "night" ? 0.55 : 1.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
    sun.shadow.bias = -0.0008;
    sun.shadow.radius = 4;
    scene.add(sun, sun.target);
    if (phase === "night" && !indoors) scene.background = new THREE.Color("#33407a");
    if (phase === "night" && !indoors) scene.fog = new THREE.Fog("#33407a", 32, 66);
    if (indoors) {
      scene.background = new THREE.Color("#1d1a2b");
      scene.fog = null;
      hemi.intensity = 1.9;
      sun.intensity = 1.2;
    }

    // ── Build the world ──
    const world = new THREE.Group();
    scene.add(world);
    const tiles = map.tiles;
    if (!indoors) world.add(groundMesh(tiles, highland));
    const water = new THREE.Mesh(new THREE.PlaneGeometry(map.cols, map.rows), new THREE.MeshLambertMaterial({ color: "#5fb8d9", transparent: true, opacity: 0.92 }));
    bend(water.material);
    water.rotation.x = -Math.PI / 2;
    water.position.set(map.cols / 2, -0.3, map.rows / 2);
    world.add(water);

    const spinners: THREE.Object3D[] = [];
    const lamps: THREE.Vector3[] = [];
    const jobs: Promise<unknown>[] = [];
    if (indoors) {
      interior(world, map, jobs, station);
      if (station) {
        const ty = STATION_PLATFORM_Y + 3;
        box(world, "#2a2733", 1, -0.45, ty, map.cols - 1, -0.05, map.rows - 1);
        box(world, "#b8bcc8", 1, -0.05, ty + 0.9, map.cols - 1, 0, ty + 1.0);
        box(world, "#b8bcc8", 1, -0.05, ty + 2.0, map.cols - 1, 0, ty + 2.1);
        box(world, "#ffd400", 1, 0.02, ty - 0.35, map.cols - 1, 0.04, ty - 0.2);
        const board = sign("1 Westbound   1 min", { bg: "#141418", fg: "#ffd400", w: 3, h: 0.4, font: "bold 64px monospace" });
        board.position.set(map.cols - 5, 3.4, 8.2);
        world.add(board);
        const name = sign(map.name.replace(/ station$/, ""), { bg: "#ffffff", fg: "#13203a", w: 5, h: 0.7, badge: true });
        name.position.set(map.cols / 2, 2.3, 1.02);
        world.add(name);
        // You've just stepped off: start with the train standing at the platform.
        if (TRAIN_CALL.at < 0 || performance.now() - TRAIN_CALL.at > 20_000) TRAIN_CALL.at = performance.now() - 5500;
        const train = tubeTrain();
        // The train only shows inside the station: it comes out of one tunnel and leaves by the other.
        const clip = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -1.6), new THREE.Plane(new THREE.Vector3(-1, 0, 0), map.cols - 1.6)];
        train.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.material = (m.material as THREE.Material).clone();
            (m.material as THREE.Material).clippingPlanes = clip;
          }
        });
        renderer.localClippingEnabled = true;
        // Tunnel mouths at both ends of the platform.
        for (const tx of [1, map.cols - 2.6]) {
          box(world, "#4a4552", tx, -0.45, ty - 0.1, tx + 1.6, 2.8, ty + 0.1);
          box(world, "#0b0a0f", tx + (tx < 5 ? 0 : 0.1), -0.45, ty + 0.1, tx + 1.5, 2.6, map.rows - 1);
          box(world, "#d9d2c3", tx - 0.1, 2.6, ty - 0.15, tx + 1.7, 2.9, ty + 0.15);
        }
        train.position.set(-30, -0.05, ty + 1.5);
        train.userData.train = true;
        world.add(train);
        spinners.push(train);
      }
    } else if (map.kind === "campus") {
      for (let y = 0; y < map.rows; y++)
        for (let x = 0; x < map.cols; x++) {
          const ch = map.tiles[y][x];
          const g = new THREE.Group();
          world.add(g);
          if (ch === "T") jobs.push(place(g, `/world3d/suburban/${(x + y) % 3 === 1 ? "tree-small" : "tree-large"}.glb`, x - 0.4, y - 0.4, 1.8, 1.8));
          else if (ch === "L") jobs.push(place(g, "/world3d/roads/light-square.glb", x, y, 1, 1, 0.12));
        }
      for (const st of map.structures) {
        const g = new THREE.Group();
        world.add(g);
        box(g, "#eef0f4", st.x, 0, st.y, st.x + st.w, 3.2, st.y + st.h);
        box(g, st.accent, st.x - 0.05, 2.6, st.y + st.h - 0.05, st.x + st.w + 0.05, 3.3, st.y + st.h + 0.05);
        for (let i = 0; i < st.w - 1; i += 1.5) box(g, "#3e4a60", st.x + 0.4 + i, 1.2, st.y + st.h - 0.02, st.x + 1.1 + i, 2.2, st.y + st.h + 0.02);
        const sg = sign(st.label, { bg: "#ffffff", fg: "#13203a", w: Math.min(st.w - 0.4, 5), h: 0.55, logo: st.companyId ?? null });
        sg.position.set(st.x + st.w / 2, 2.95, st.y + st.h + 0.07);
        g.add(sg);
      }
    } else if (highland) {
      const H = buildHighlands();
      for (const t of H.things) {
        const g = new THREE.Group();
        world.add(g);
        if (t.kind === "mountain") {
          const geo = new THREE.BoxGeometry(1, 1, 1);
          const cx = t.x + t.w / 2;
          const cz = t.y + t.h / 2;
          for (let yy = t.y; yy < t.y + t.h; yy++)
            for (let xx = t.x; xx < t.x + t.w; xx++) {
              const dd = Math.hypot((xx + 0.5 - cx) / (t.w / 2), (yy + 0.5 - cz) / (t.h / 2));
              if (dd > 1) continue;
              const n = Math.sin(xx * 0.9 + t.x) * 0.35 + Math.cos(yy * 1.3 + t.y) * 0.35;
              const hh = Math.max(0.4, Math.round((t.peak * (1 - dd ** 1.25) + n) * 2) / 2);
              const f = hh / t.peak;
              const m = new THREE.Mesh(geo, mat(f > 0.72 ? "#f4f6fa" : f > 0.42 ? "#a19fa9" : f > 0.3 ? "#8c8a93" : (xx + yy) % 3 ? "#86c062" : "#79b457"));
              m.scale.set(1, hh, 1);
              m.position.set(xx + 0.5, hh / 2, yy + 0.5);
              m.castShadow = m.receiveShadow = true;
              g.add(m);
            }
        } else if (t.kind === "pine") jobs.push(place(g, `/world3d/nature/${["tree_pineTallA", "tree_pineRoundB", "tree_pineDefaultA", "tree_pineTallC"][(t.x + t.y) % 4]}.glb`, t.x - 0.25, t.y - 0.25, 1.5, 1.5));
        else if (t.kind === "rock") jobs.push(place(g, `/world3d/nature/${(t.x + t.y) % 2 ? "rock_largeA" : "rock_largeC"}.glb`, t.x + 0.05, t.y + 0.05, 0.9, 0.9));
        else if (t.kind === "flower") jobs.push(place(g, `/world3d/nature/${["flower_redA", "flower_yellowB", "flower_purpleA"][(t.x + t.y) % 3]}.glb`, t.x + 0.3, t.y + 0.3, 0.4, 0.4));
        else if (t.kind === "tent") jobs.push(place(g, "/world3d/nature/tent_detailedOpen.glb", t.x + 0.1, t.y + 0.1, 1.8, 1.8));
        else if (t.kind === "campfire") jobs.push(place(g, "/world3d/nature/campfire_stones.glb", t.x + 0.1, t.y + 0.1, 0.8, 0.8));
        else if (t.kind === "building") {
          terrace(g, t, true);
          if (t.label) {
            const sg = sign(t.label, { bg: t.label.includes("Cafe") ? "#2d6a4f" : "#7a4f32", fg: "#ffffff", w: 2.6, h: 0.45 });
            sg.position.set(t.x + t.w / 2, 1.05, t.y + t.h + 0.04);
            g.add(sg);
          }
        }
        else if (t.kind === "station") {
          box(g, "#b5463a", t.x + 0.05, 0, t.y + 0.05, t.x + t.w - 0.05, 2.6, t.y + t.h - 0.05);
          box(g, "#2d1b69", t.x, 2, t.y + t.h - 0.1, t.x + t.w, 2.35, t.y + t.h);
          const nm = sign(t.name, { bg: "#ffffff", fg: "#13203a", w: t.w + 0.4, h: 0.5, badge: true });
          nm.position.set(t.x + t.w / 2, 2.18, t.y + t.h + 0.04);
          g.add(nm);
        } else if (t.kind === "lamp") {
          jobs.push(place(g, "/world3d/roads/light-square.glb", t.x, t.y, 1, 1, 0.1));
          lamps.push(new THREE.Vector3(t.x + 0.5, 2, t.y + 0.5));
        } else if (t.kind === "bench") box(g, "#8a5a36", t.x + 0.05, 0.35, t.y + 0.4, t.x + 0.95, 0.45, t.y + 0.7);
      }
    } else {
      const L = buildLondon();
      for (const t of L.things) {
        const g = new THREE.Group();
        world.add(g);
        if (t.kind === "building") {
          jobs.push(building(g, t));
          const co = t.companyId ? COMPANIES.find((c) => c.id === t.companyId) : null;
          if (co) {
            const sg = sign(co.name, { bg: "#ffffff", fg: "#13203a", w: Math.min(t.w - 0.4, 4), h: 0.62, logo: co.id });
            sg.position.set(t.x + t.w / 2, 1.35, t.y + t.h + 0.04);
            g.add(sg);
          }
        }
        else if (t.kind === "landmark") {
          landmark(g, t);
          g.traverse((c) => c.userData.spin && spinners.push(c));
        } else if (t.kind === "tree") jobs.push(place(g, `/world3d/suburban/${(t.x + t.y) % 3 === 1 ? "tree-small" : "tree-large"}.glb`, t.x - 0.4, t.y - 0.4, 1.8, 1.8));
        else if (t.kind === "lamp") {
          jobs.push(place(g, "/world3d/roads/light-square.glb", t.x, t.y, 1, 1, 0.12));
          lamps.push(new THREE.Vector3(t.x + 0.5, 2, t.y + 0.5));
        } else if (t.kind === "phonebox") {
          box(g, "#c8322d", t.x + 0.2, 0.1, t.y + 0.2, t.x + 0.8, 2, t.y + 0.8);
          box(g, "#cfe6ef", t.x + 0.28, 0.5, t.y + 0.79, t.x + 0.72, 1.7, t.y + 0.82);
        } else if (t.kind === "postbox") cyl(g, "#c8322d", t.x + 0.5, t.y + 0.5, 0.1, 1.15, 0.24, 14);
        else if (t.kind === "bench") {
          box(g, "#8a5a36", t.x + 0.05, 0.35, t.y + 0.4, t.x + 0.95, 0.43, t.y + 0.7);
          box(g, "#8a5a36", t.x + 0.05, 0.43, t.y + 0.35, t.x + 0.95, 0.75, t.y + 0.4);
        } else if (t.kind === "busstop") {
          box(g, "#c8322d", t.x - 0.1, 1.9, t.y + 0.25, t.x + 1.1, 2, t.y + 0.75);
          box(g, "#cfe6ef", t.x - 0.05, 0.4, t.y + 0.25, t.x + 1.05, 1.8, t.y + 0.3);
          box(g, "#2a2730", t.x - 0.1, 0.1, t.y + 0.25, t.x - 0.05, 1.9, t.y + 0.75);
          box(g, "#2a2730", t.x + 1.05, 0.1, t.y + 0.25, t.x + 1.1, 1.9, t.y + 0.75);
        } else if (t.kind === "station") {
          box(g, "#b5463a", t.x + 0.05, 0, t.y + 0.05, t.x + t.w - 0.05, 2.6, t.y + t.h - 0.05);
          box(g, "#2a2730", t.x + 0.6, 0.12, t.y + t.h - 0.08, t.x + t.w - 0.6, 1.7, t.y + t.h - 0.02);
          box(g, "#2d1b69", t.x - 0.02, 2, t.y + t.h - 0.1, t.x + t.w + 0.02, 2.35, t.y + t.h + 0.02);
          const st = L.stations.find((x) => x.id === t.id);
          const nm = sign(st?.name ?? t.name, { bg: "#ffffff", fg: "#13203a", w: t.w + 0.4, h: 0.5, badge: true });
          nm.position.set(t.x + t.w / 2, 2.18, t.y + t.h + 0.04);
          g.add(nm);
          const hex = cyl(g, "#2b5fd9", t.x + t.w + 0.35, t.y + t.h + 0.3, 2.6, 2.66, 0.42, 6);
          hex.rotation.x = Math.PI / 2;
          cyl(g, "#2a2730", t.x + t.w + 0.35, t.y + t.h + 0.3, 0.1, 2.6, 0.05, 8);
        }
      }
    }
    // Shop fronts with names over the door.
    if (!highland && map.art === "london")
      for (const p of map.portals) {
        const name = p.id === "pizzazz" ? "Pizzazz Pizza" : p.id === "dealer" ? "Motor Mile Cars" : null;
        if (!name) continue;
        const sg = sign(name, { bg: p.id === "pizzazz" ? "#c8322d" : "#13203a", fg: "#ffffff", w: 3, h: 0.5 });
        sg.position.set((p.rect.x + p.rect.w / 2) / TILE, 1.9, p.rect.y / TILE - 0.02);
        world.add(sg);
      }
    // Street lamps glow at night.
    if (phase !== "day")
      lamps.forEach((p, i) => {
        if (i % 2) return;
        const l = new THREE.PointLight("#ffcc88", phase === "night" ? 6 : 2, 7, 1.6);
        l.position.copy(p);
        scene.add(l);
      });

    // Portal markers: soft glowing rings on the ground.
    const rings: THREE.Mesh[] = [];
    const ringMat = new THREE.MeshBasicMaterial({ color: "#f2d9a6", transparent: true, opacity: 0.55 });
    bend(ringMat);
    for (const p of map.portals) {
      if (p.to.kind === "bus") continue;
      if (p.to.kind === "bike") {
        const b = lymeBike();
        b.position.set((p.rect.x + p.rect.w / 2) / TILE, 0.12, (p.rect.y + p.rect.h / 2) / TILE);
        b.rotation.y = ((p.rect.x / TILE) % 2) * 0.4 + Math.PI / 2;
        b.scale.setScalar(0.95);
        bendAll(b);
        world.add(b);
      }
      const r = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 28), ringMat);
      r.rotation.x = -Math.PI / 2;
      r.position.set((p.rect.x + p.rect.w / 2) / TILE, 0.2, (p.rect.y + p.rect.h / 2) / TILE);
      r.userData.portal = p.id;
      world.add(r);
      rings.push(r);
    }

    // ── Characters ──
    const mixers: THREE.AnimationMixer[] = [];
    interface Body {
      root: THREE.Group;
      char: Character3D | null;
      walking: boolean;
    }
    const makeBody = (a: Avatar): Body => {
      const root = new THREE.Group();
      const b: Body = { root, char: null, walking: false };
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.18 }));
      bend(shadow.material);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.14;
      root.add(shadow);
      void buildCharacter(a).then((c) => {
        if (disposed) return;
        bendAll(c.object);
        c.object.position.y = 0.12;
        root.add(c.object);
        b.char = c;
        mixers.push(c.mixer);
        c.play(b.walking ? "walk" : "idle");
      });
      return b;
    };
    const setWalking = (b: Body, on: boolean) => {
      if (b.walking === on) return;
      b.walking = on;
      b.char?.play(on ? "walk" : "idle");
    };

    let disposed = false;
    const me = makeBody(JSON.parse(avatarKey) as Avatar);
    scene.add(me.root);
    // People who work here: the judge in court, guards in prison, a doctor at the hospital.
    const staff: [Avatar, number, number, number][] =
      map.kind === "court"
        ? [[look({ top: "top-suit", topColor: "topcol-black", hair: "hair-short", hairColor: "haircol-silver", skin: "skin-3" }), 11, 1.9, 0]]
        : map.kind === "prison"
          ? [
              [look({ top: "top-suit", topColor: "topcol-navy", bottom: "bottom-smart", bottomColor: "botcol-navy", hat: "hat-cap", hair: "hair-buzz", skin: "skin-6" }), 8, 9.4, 0.3],
              [look({ top: "top-suit", topColor: "topcol-navy", bottom: "bottom-smart", bottomColor: "botcol-navy", hat: "hat-cap", hair: "hair-bob", skin: "skin-2" }), 16, 9.4, -0.3],
            ]
          : map.kind === "hospital"
            ? [[look({ top: "top-labcoat", hair: "hair-ponytail", skin: "skin-5" }), 13, 10.6, 0]]
            : [];
    for (const [a, x, z, ry] of staff) {
      const b = makeBody(a);
      b.root.position.set(x, 0, z);
      b.root.rotation.y = ry;
      scene.add(b.root);
    }
    // Your car (when driving): a Kenney model swapped in for your character.
    const carHolder = new THREE.Group();
    scene.add(carHolder);
    let carLoaded: string | null = null;
    let rideBike: THREE.Group | null = null;

    const others = new Map<string, Body & { x: number; z: number }>();

    // Traffic: buses and Kenney cars driving the road loops on the left.
    const L = london ? buildLondon() : null;
    const traffic: { obj: THREE.Group; route: number; at: number; speed: number }[] = [];
    if (L) {
      const kinds = ["bus", "sedan", "taxi", "van", "bus", "suv", "delivery", "taxi", "bus", "police", "sedan", "hatchback-sports", "bus", "ambulance", "van", "taxi"];
      kinds.forEach((k, i) => {
        const route = i % 3;
        const g = new THREE.Group();
        if (k === "bus") {
          const b = busModel(BUS_ROUTE_CODES[route]);
          g.add(b);
          g.userData.label = BUS_ROUTE_CODES[route];
        } else void place(g, `/world3d/cars/${k}.glb`, -0.85, -0.45, 1.7, 0.9, 0, Math.PI / 2);
        scene.add(g);
        traffic.push({ obj: g, route, at: (i * 0.173) % 1, speed: [2.6, 2.8, 2.5][route] });
      });
    }
    const paths = L ? L.routes : [];
    const lengths = paths.map((pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0));
    const pointAt = (pi: number, dist: number) => {
      const pts = paths[pi];
      let t = ((dist % lengths[pi]) + lengths[pi]) % lengths[pi];
      for (let i = 1; i < pts.length; i++) {
        const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (t <= seg) {
          const k = seg ? t / seg : 0;
          return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, z: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k, dx: pts[i][0] - pts[i - 1][0], dz: pts[i][1] - pts[i - 1][1] };
        }
        t -= seg;
      }
      return { x: pts[0][0], z: pts[0][1], dx: 1, dz: 0 };
    };

    // Pedestrians on the pavements.
    const npcs: { body: Body; route: number; at: number; side: number; speed: number; last: THREE.Vector3; knockedUntil: number }[] = [];
    if (L) {
      Array.from({ length: 12 }, (_, i) => i).forEach((i) => {
        const body = makeBody(npcLook(i));
        scene.add(body.root);
        npcs.push({ body, route: i % 3, at: (i * 0.137) % 1, side: i % 2 ? 1.3 : -1.3, speed: 1.1 + (i % 3) * 0.2, last: new THREE.Vector3(), knockedUntil: 0 });
      });
    }

    // ── Scuffles: you swing, the nearest person goes down ──
    let swingUntil = 0;
    const onFight = () => {
      const now = performance.now();
      swingUntil = now + 700;
      me.char?.play("attack-melee-right");
      const p = getMe();
      let best: (typeof npcs)[number] | null = null;
      let bd = 2.2;
      for (const n of npcs) {
        const d = Math.hypot(n.body.root.position.x - p.x / TILE, n.body.root.position.z - p.y / TILE);
        if (d < bd) [best, bd] = [n, d];
      }
      if (best) {
        best.knockedUntil = now + 2600;
        best.body.char?.play("die");
      }
    };
    window.addEventListener("illuminated:fight", onFight);

    // ── Clicks: walk to where you tap on the ground ──
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);
    const onClick = (e: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, hit)) onGround(hit.x * TILE, hit.z * TILE);
    };
    renderer.domElement.addEventListener("click", onClick);

    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    const focus = new THREE.Vector3();
    const lastMe = new THREE.Vector3();
    let first = true;
    let raf = 0;
    let last = performance.now();
    const start = last;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const secs = (now - start) / 1000;
      const p = getMe();
      const mx = p.x / TILE;
      const mz = p.y / TILE;
      // Face the way you're going.
      const dx = mx - lastMe.x;
      const dz = mz - lastMe.z;
      if (Math.hypot(dx, dz) > 0.002) {
        const ang = Math.atan2(dx, dz);
        me.root.rotation.y = ang;
        carHolder.rotation.y = ang - Math.PI / 2;
      }
      lastMe.set(mx, 0, mz);
      me.root.position.set(mx, 0, mz);
      carHolder.position.set(mx, 0.08, mz);
      if (performance.now() > swingUntil) {
        if (swingUntil) {
          swingUntil = 0;
          me.walking = !p.walking;
        }
        setWalking(me, p.walking);
      }
      // Swap your character for your car when driving.
      const want = carRef.current;
      if (want !== carLoaded) {
        carLoaded = want;
        carHolder.clear();
        if (want) void place(carHolder, `/world3d/cars/${want === "cab" ? "taxi" : want}.glb`, -0.9, -0.48, 1.8, 0.96, 0, Math.PI / 2);
      }
      me.root.visible = !want;
      // Riding a hire bike: the bike appears under you and you sit up on it.
      const riding = !want && bikeRef.current;
      if (riding && !rideBike) {
        rideBike = lymeBike(bikeRef.current ?? undefined);
        bendAll(rideBike);
        scene.add(rideBike);
      }
      if (!riding && rideBike) {
        scene.remove(rideBike);
        rideBike = null;
      }
      if (rideBike) {
        rideBike.position.set(mx, 0.12, mz);
        rideBike.rotation.y = me.root.rotation.y - Math.PI / 2;
        me.root.position.y = 0.42;
      }

      // Camera: follows you from the south, tilted down, with a little lag.
      if (first) {
        focus.set(mx, 0, mz);
        first = false;
      }
      focus.lerp(new THREE.Vector3(mx, 0, mz), 1 - Math.pow(0.0015, dt));
      FOCUS.value.copy(focus);
      if (indoors) camera.position.set(focus.x, focus.y + 12.5, focus.z + 11.5);
      else camera.position.set(focus.x, focus.y + 19, focus.z + 18);
      camera.lookAt(focus.x, focus.y + 0.6, focus.z);
      sun.position.set(focus.x - 10, 22, focus.z + 12);
      sun.target.position.copy(focus);

      // Other players.
      const seen = new Set<string>();
      for (const o of getOthers()) {
        seen.add(o.id);
        let b = others.get(o.id);
        if (!b) {
          b = Object.assign(makeBody(o.avatar), { x: o.x / TILE, z: o.y / TILE });
          others.set(o.id, b);
          scene.add(b.root);
        }
        const tx = o.x / TILE;
        const tz = o.y / TILE;
        const ddx = tx - b.x;
        const ddz = tz - b.z;
        if (Math.hypot(ddx, ddz) > 0.01) b.root.rotation.y = Math.atan2(ddx, ddz);
        b.x += ddx * Math.min(1, dt * 10);
        b.z += ddz * Math.min(1, dt * 10);
        b.root.position.set(b.x, 0, b.z);
        setWalking(b, o.walking || Math.hypot(ddx, ddz) > 0.05);
      }
      for (const [id, b] of others)
        if (!seen.has(id)) {
          scene.remove(b.root);
          others.delete(id);
        }

      // Traffic and pedestrians.
      let ti = 0;
      for (const v of traffic) {
        const q = pointAt(v.route, v.at * lengths[v.route] + (reduce ? 0 : secs * v.speed));
        const len = Math.hypot(q.dx, q.dz) || 1;
        // Drive on the left.
        v.obj.position.set(q.x + (q.dz / len) * 0.5, 0.02, q.z - (q.dx / len) * 0.5);
        v.obj.rotation.y = Math.atan2(-q.dz, q.dx);
        const horiz = Math.abs(q.dx) > Math.abs(q.dz);
        const long = (v.obj.userData.label ? 2.8 : 1.8) * TILE;
        TRAFFIC_BOXES[ti++] = { x: v.obj.position.x * TILE, y: v.obj.position.z * TILE, hw: (horiz ? long : TILE * 0.95) / 2, hh: (horiz ? TILE * 0.95 : long) / 2, dx: Math.sign(q.dx), dy: Math.sign(q.dz) };
      }
      NPC_SPOTS.length = 0;
      for (const n of npcs) {
        NPC_SPOTS.push({ x: n.body.root.position.x * TILE, y: n.body.root.position.z * TILE });
        // Knocked over in a scuffle: lie there a moment, then get up and carry on.
        if (n.knockedUntil > now) continue;
        if (n.knockedUntil) {
          n.knockedUntil = 0;
          n.body.walking = false;
        }
        const q = pointAt(n.route, n.at * lengths[n.route] + (reduce ? 0 : secs * n.speed));
        const len = Math.hypot(q.dx, q.dz) || 1;
        const x = q.x + (-q.dz / len) * n.side;
        const z = q.z + (q.dx / len) * n.side;
        n.body.root.position.set(x, 0, z);
        n.body.root.rotation.y = Math.atan2(q.dx, q.dz);
        setWalking(n.body, !reduce);
      }

      for (const s of spinners) {
        if (s.userData.train) {
          // Pull in, wait with the doors open, then leave (16 s loop). The cycle is anchored to
          // TRAIN_CALL: arriving by train you step off a train already at the platform; boarding,
          // the train pulls in for you before the ride starts.
          const t = ((now - TRAIN_CALL.at) / 1000) % 16;
          const stop = map.cols / 2 - 13;
          s.position.x = t < 5 ? -28 + (stop + 28) * (1 - Math.pow(1 - t / 5, 3)) : t < 11 ? stop : stop + Math.pow((t - 11) / 5, 2) * 70;
        } else s.rotation.z += dt * 0.05;
      }
      const near = nearPortal();
      for (const r of rings) {
        const on = near?.id === r.userData.portal;
        r.scale.setScalar(on ? 1.5 + Math.sin(secs * 6) * 0.08 : 1 + Math.sin(secs * 2 + r.position.x) * 0.06);
      }
      water.position.y = -0.3 + Math.sin(secs * 0.8) * 0.02;
      for (const m of mixers) m.update(dt);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // Once everything static has loaded, merge it into a few big meshes (one per material)
    // so the whole city draws in a handful of calls instead of thousands.
    void Promise.all(jobs).then(() => {
      world.updateMatrixWorld(true);
      const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
      const drop: THREE.Mesh[] = [];
      world.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || m === water || rings.includes(m) || (m as unknown as THREE.SkinnedMesh).isSkinnedMesh || Array.isArray(m.material)) return;
        let spin = false;
        for (let a: THREE.Object3D | null = m; a; a = a.parent) if (a.userData.spin || a.userData.train) spin = true;
        if (spin || m.geometry.attributes.color) return;
        const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()) as THREE.BufferGeometry;
        for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
        if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
        if (!g.attributes.normal) g.computeVertexNormals();
        g.applyMatrix4(m.matrixWorld);
        const list = groups.get(m.material) ?? [];
        list.push(g);
        groups.set(m.material, list);
        drop.push(m);
      });
      for (const m of drop) m.parent?.remove(m);
      for (const [material, geos] of groups) {
        const merged = mergeGeometries(geos, false);
        geos.forEach((g) => g.dispose());
        if (!merged) continue;
        const mesh = new THREE.Mesh(merged, material);
        mesh.castShadow = mesh.receiveShadow = true;
        scene.add(mesh);
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      disposed = true;
      TRAFFIC_BOXES.length = 0;
      ro.disconnect();
      renderer.domElement.removeEventListener("click", onClick);
      window.removeEventListener("illuminated:fight", onFight);
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.geometry !== BOX) m.geometry.dispose();
      });
      el.removeChild(renderer.domElement);
    };
    // getMe/getOthers/nearPortal/onGround are stable refs from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, avatarKey]);

  // Billboards: real upcoming hackathons and tech events on big boards around town.
  const adKey = ads.map((a) => a.id).join(",");
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !ads.length || (map.art !== "london" && map.art !== "highlands")) return;
    const g = new THREE.Group();
    const spots = map.art === "london" ? [[30, 18.6], [56, 18.6], [24, 62.4], [62, 62.4], [44, 36.6], [80, 36.6]] : [[30, 36.4], [50, 36.4]];
    spots.forEach(([x, z], i) => {
      const e = ads[i % ads.length];
      const when = new Date(e.start).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
      const board = new THREE.Group();
      box(board, "#2a2733", -0.06, 0, -0.06, 0.06, 2.2, 0.06);
      box(board, "#13203a", -1.7, 2.1, -0.08, 1.7, 3.6, 0.02);
      const top = sign(e.hackathon ? "HACKATHON" : "TECH EVENT", { bg: "#ffd166", fg: "#13203a", w: 3.2, h: 0.32 });
      top.position.set(0, 3.38, 0.03);
      board.add(top);
      const title = sign(e.name, { bg: "#13203a", fg: "#ffffff", w: 3.2, h: 0.6 });
      title.position.set(0, 2.9, 0.03);
      board.add(title);
      const sub = sign(`${when} · ${e.where} · ${e.source}`, { bg: "#13203a", fg: "#6bc6ff", w: 3.2, h: 0.3 });
      sub.position.set(0, 2.4, 0.03);
      board.add(sub);
      board.position.set(x, 0, z);
      bendAll(board);
      g.add(board);
    });
    scene.add(g);
    return () => {
      scene.remove(g);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adKey, map]);

  return <div ref={host} className="absolute inset-0" aria-label={`${map.name} in 3D`} role="img" />;
}
