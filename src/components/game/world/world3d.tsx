"use client";

import { useEffect, useRef } from "react";

import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

import { BUS_ROUTE_CODES } from "./art";
import { ukPhase } from "./fx";

import type { Avatar } from "@/game/core/cosmetics";
import { buildLondon } from "@/game/core/london";
import { HAIR_LOOK } from "@/game/core/looks";
import { buildHighlands } from "@/game/core/regions";
import { TILE, type Portal, type WorldMap } from "@/game/core/world";

/**
 * The live 3D world (three.js), viewed like Animal Crossing: a tilted camera that
 * follows you and a "rolling log" world that curves away towards the horizon.
 * Same layout and collisions as the 2D game (london.ts / regions.ts); 1 unit = 1 tile.
 * Models are Kenney CC0 kits (public/world3d); terraces, landmarks, buses and
 * mountains are built here from simple shapes.
 */

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
const BEND_Z = 0.0055;
const BEND_X = 0.0012;
function bend(m: THREE.Material) {
  if (m.userData.bent) return;
  m.userData.bent = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFocus = FOCUS;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uFocus;")
      .replace(
        "#include <project_vertex>",
        `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 bw = modelMatrix * mvPosition;
float bz = bw.z - uFocus.z;
float bx = bw.x - uFocus.x;
bw.y -= bz * bz * ${BEND_Z.toFixed(5)} + bx * bx * ${BEND_X.toFixed(5)};
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
      box(g, GOLDEN, x + 0.3, 0, z + 0.3, x + w - 0.3, 7, z + d - 0.3);
      cyl(g, "#f6f2ea", cx, z + d - 0.28, 5.6, 5.6 + 0.05, 0.55, 24).rotation.x = Math.PI / 2;
      const c = cyl(g, "#2f5b4a", cx, cz, 7, 9.4, 0.01, 4, 0.9);
      c.rotation.y = Math.PI / 4;
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

function busModel() {
  const g = new THREE.Group();
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

export function World3D({
  map,
  getMe,
  getOthers,
  avatar,
  car,
  nearPortal,
  onGround,
}: {
  map: WorldMap;
  getMe: () => { x: number; y: number; walking: boolean };
  getOthers: () => Mover3D[];
  avatar: Avatar;
  car: string | null;
  nearPortal: () => Portal | null;
  onGround: (x: number, y: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const carRef = useRef(car);
  carRef.current = car;
  const avatarKey = JSON.stringify(avatar);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const highland = map.art === "highlands";
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
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
    if (phase === "night") scene.background = new THREE.Color("#33407a");
    if (phase === "night") scene.fog = new THREE.Fog("#33407a", 32, 66);

    // ── Build the world ──
    const world = new THREE.Group();
    scene.add(world);
    const tiles = map.tiles;
    world.add(groundMesh(tiles, highland));
    const water = new THREE.Mesh(new THREE.PlaneGeometry(map.cols, map.rows), new THREE.MeshLambertMaterial({ color: "#5fb8d9", transparent: true, opacity: 0.92 }));
    bend(water.material);
    water.rotation.x = -Math.PI / 2;
    water.position.set(map.cols / 2, -0.3, map.rows / 2);
    world.add(water);

    const spinners: THREE.Object3D[] = [];
    const lamps: THREE.Vector3[] = [];
    const jobs: Promise<unknown>[] = [];
    if (highland) {
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
        else if (t.kind === "building") terrace(g, t, true);
        else if (t.kind === "station") {
          box(g, "#b5463a", t.x + 0.05, 0, t.y + 0.05, t.x + t.w - 0.05, 2.6, t.y + t.h - 0.05);
          box(g, "#2d1b69", t.x, 2, t.y + t.h - 0.1, t.x + t.w, 2.35, t.y + t.h);
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
        if (t.kind === "building") jobs.push(building(g, t));
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
          const hex = cyl(g, "#2b5fd9", t.x + t.w + 0.35, t.y + t.h + 0.3, 2.6, 2.66, 0.42, 6);
          hex.rotation.x = Math.PI / 2;
          cyl(g, "#2a2730", t.x + t.w + 0.35, t.y + t.h + 0.3, 0.1, 2.6, 0.05, 8);
        }
      }
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
      mixer: THREE.AnimationMixer | null;
      idle: THREE.AnimationAction | null;
      walk: THREE.AnimationAction | null;
      walking: boolean;
      key: string;
    }
    const charUrl = (a: Avatar) => `/world3d/chars/character-${HAIR_LOOK[a.hair]?.head ?? "male-a"}.glb`;
    const makeBody = (a: Avatar): Body => {
      const root = new THREE.Group();
      const b: Body = { root, mixer: null, idle: null, walk: null, walking: false, key: charUrl(a) };
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.18 }));
      bend(shadow.material);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.14;
      root.add(shadow);
      void load(b.key).then((gltf) => {
        const o = cloneSkinned(gltf.scene) as THREE.Group;
        const bb = new THREE.Box3().setFromObject(o);
        o.scale.setScalar(1.15 / (bb.max.y - bb.min.y));
        o.position.y = 0.12;
        bendAll(o);
        root.add(o);
        const mixer = new THREE.AnimationMixer(o);
        const clip = (n: string) => gltf.animations.find((c) => c.name === n);
        const idle = clip("idle");
        const walk = clip("walk");
        b.mixer = mixer;
        b.idle = idle ? mixer.clipAction(idle) : null;
        b.walk = walk ? mixer.clipAction(walk) : null;
        b.idle?.play();
        mixers.push(mixer);
      });
      return b;
    };
    const setWalking = (b: Body, on: boolean) => {
      if (b.walking === on || !b.idle || !b.walk) return;
      b.walking = on;
      const [from, to] = on ? [b.idle, b.walk] : [b.walk, b.idle];
      to.reset().play();
      from.crossFadeTo(to, 0.2, false);
    };

    const me = makeBody(JSON.parse(avatarKey) as Avatar);
    scene.add(me.root);
    // Your car (when driving): a Kenney model swapped in for your character.
    const carHolder = new THREE.Group();
    scene.add(carHolder);
    let carLoaded: string | null = null;

    const others = new Map<string, Body & { x: number; z: number }>();

    // Traffic: buses and Kenney cars driving the road loops on the left.
    const L = highland ? null : buildLondon();
    const traffic: { obj: THREE.Group; route: number; at: number; speed: number }[] = [];
    if (L) {
      const kinds = ["bus", "sedan", "taxi", "van", "bus", "suv", "delivery", "taxi", "bus", "police", "sedan", "hatchback-sports", "bus", "ambulance", "van", "taxi"];
      kinds.forEach((k, i) => {
        const route = i % 3;
        const g = new THREE.Group();
        if (k === "bus") {
          const b = busModel();
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
    const npcs: { body: Body; route: number; at: number; side: number; speed: number; last: THREE.Vector3 }[] = [];
    if (L) {
      const heads = ["female-a", "male-b", "female-c", "male-d", "female-e", "male-f", "female-b", "male-c", "female-d", "male-e"];
      heads.forEach((h, i) => {
        const hair = Object.entries(HAIR_LOOK).find(([, v]) => v.head === h)?.[0] ?? "hair-short";
        const body = makeBody({ ...(JSON.parse(avatarKey) as Avatar), hair });
        scene.add(body.root);
        npcs.push({ body, route: i % 3, at: (i * 0.137) % 1, side: i % 2 ? 1.3 : -1.3, speed: 1.1 + (i % 3) * 0.2, last: new THREE.Vector3() });
      });
    }

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
      setWalking(me, p.walking);
      // Swap your character for your car when driving.
      const want = carRef.current;
      if (want !== carLoaded) {
        carLoaded = want;
        carHolder.clear();
        if (want) void place(carHolder, `/world3d/cars/${want === "cab" ? "taxi" : want}.glb`, -0.9, -0.48, 1.8, 0.96, 0, Math.PI / 2);
      }
      me.root.visible = !want;

      // Camera: follows you from the south, tilted down, with a little lag.
      if (first) {
        focus.set(mx, 0, mz);
        first = false;
      }
      focus.lerp(new THREE.Vector3(mx, 0, mz), 1 - Math.pow(0.0015, dt));
      FOCUS.value.copy(focus);
      camera.position.set(focus.x, focus.y + 19, focus.z + 18);
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
      for (const v of traffic) {
        const q = pointAt(v.route, v.at * lengths[v.route] + (reduce ? 0 : secs * v.speed));
        const len = Math.hypot(q.dx, q.dz) || 1;
        // Drive on the left.
        v.obj.position.set(q.x + (q.dz / len) * 0.5, 0.02, q.z - (q.dx / len) * 0.5);
        v.obj.rotation.y = Math.atan2(-q.dz, q.dx);
      }
      for (const n of npcs) {
        const q = pointAt(n.route, n.at * lengths[n.route] + (reduce ? 0 : secs * n.speed));
        const len = Math.hypot(q.dx, q.dz) || 1;
        const x = q.x + (-q.dz / len) * n.side;
        const z = q.z + (q.dx / len) * n.side;
        n.body.root.position.set(x, 0, z);
        n.body.root.rotation.y = Math.atan2(q.dx, q.dz);
        setWalking(n.body, !reduce);
      }

      for (const s of spinners) s.rotation.z += dt * 0.05;
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
        for (let a: THREE.Object3D | null = m; a; a = a.parent) if (a.userData.spin) spin = true;
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
      ro.disconnect();
      renderer.domElement.removeEventListener("click", onClick);
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

  return <div ref={host} className="absolute inset-0" aria-label={`${map.name} in 3D`} role="img" />;
}
