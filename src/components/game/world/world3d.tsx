"use client";

import { useEffect, useRef, useState } from "react";


import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { finishArchitecture } from "./architecture-finish3d";
import { BUS_ROUTE_CODES, NPC_SPOTS, PLAYER, PLAYER_VEHICLE, TRAFFIC_BOXES, cityRoadPaint, citySignalPosts } from "./art";
import { cinematicRenderer } from "./cinematic-renderer";
import { CityBroadcast, useCityNews } from "./city-broadcast";
import { coachModel } from "./coach3d";
import { ukPhase } from "./fx";
import { applyGroundStyle } from "./ground-style3d";
import { londonEye } from "./london-eye3d";
import { addStreetscape } from "./streetscape3d";
export { NPC_SPOTS } from "./art";
import { type Character3D, buildCharacter, npcLook } from "../char3d";
import type { TechEvent } from "../event-ads";
import { homeFurniture } from "./home-furniture";
import { makeNameplate } from "./nameplate";
import { TRAIN_CALL } from "./train-state";
import { riverGeometry, riverSurface } from "./water-style3d";

import type { WorldAffiliation } from "@/game/core/affiliation";
import { COACHES, COACH_LENGTH, COACH_WIDTH } from "@/game/core/coaches";
import { COMPANIES, type Company } from "@/game/core/companies";
import { look } from "@/game/core/cosmetics";
import type { Avatar } from "@/game/core/cosmetics";
import { frameBudget, graphicsBudget } from "@/game/core/frame-budget";
import { furnitureById, type HomeAction } from "@/game/core/homes";
import { PRISON_LOOK } from "@/game/core/law";
import { logoFor } from "@/game/core/logos";
import { buildLondon } from "@/game/core/london";
import { weatherAt } from "@/game/core/needs";
import { type Pursuit, prisonGuardPositions } from "@/game/core/pursuit";
import { buildHighlands } from "@/game/core/regions";
import { commuterPhase, residentPaths, residentPose } from "@/game/core/residents";
import { trafficAdvance } from "@/game/core/traffic-flow";
import { crossingPedestrianPoses, signalAt, trafficMoveDistance, type TrafficVehicle } from "@/game/core/traffic-rules";
import { trainFrame } from "@/game/core/train";
import { BUS_LENGTH, BUS_WIDTH, CAR_LENGTH, CAR_WIDTH, ROAD_LANE_OFFSET } from "@/game/core/vehicles";
import { frameMapCamera, followPlayerCamera } from "@/game/core/view-framing";
import { curvedVertexShader, immersiveMotion, physicalSurface, visualProfile, type VisualQuality } from "@/game/core/visual-quality";
import { STATION_PLATFORM_Y } from "@/game/core/world";
import { TILE, blocked, type Portal, type WorldMap } from "@/game/core/world";

/**
 * The live 3D world (three.js), viewed like Animal Crossing: a tilted camera that
 * follows you and a "rolling log" world that curves away towards the horizon.
 * Same layout and collisions as the 2D game (london.ts / regions.ts); 1 unit = 1 tile.
 * Models are Kenney CC0 kits (public/world3d); terraces, landmarks, buses and
 * mountains are built here from simple shapes.
 */

export interface Mover3D {
  badge?: string | null;
  username?: string;
  affiliation?: WorldAffiliation | null;
  id: string;
  x: number;
  y: number;
  walking: boolean;
  avatar: Avatar;
  car?: string | null;
  heading?: number;
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
    sh.vertexShader = curvedVertexShader(sh.vertexShader);
  };
  m.needsUpdate = true;
}
const CURVED_DEPTH = new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
bend(CURVED_DEPTH);
const bendAll = (o: THREE.Object3D) =>
  o.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = !(Array.isArray(mesh.material)?mesh.material:[mesh.material]).some(m=>m.transparent||m instanceof THREE.MeshBasicMaterial);
    mesh.customDepthMaterial = CURVED_DEPTH;
    mesh.receiveShadow = true;
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(bend);
  });

let speechTextures: THREE.CanvasTexture[] | null = null;
function speechMark() {
  if (!speechTextures) {
    speechTextures = [0, 1, 2].map(frame => {
      const canvas = document.createElement("canvas");
      canvas.width = 128; canvas.height = 88;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "rgba(12, 26, 45, .16)";
      ctx.beginPath(); ctx.roundRect(13, 7, 102, 61, 23); ctx.fill();
      ctx.fillStyle = "#fffdf7";
      ctx.beginPath(); ctx.roundRect(10, 4, 102, 61, 23); ctx.fill();
      ctx.beginPath(); ctx.moveTo(34, 59); ctx.lineTo(28, 77); ctx.lineTo(51, 63); ctx.closePath(); ctx.fill();
      for (let dot = 0; dot < 3; dot++) {
        const x = 38 + dot * 23, y = 35 + (frame === dot ? -2 : 0);
        ctx.fillStyle = frame === dot ? "#4389dc" : "#92a1b4";
        ctx.beginPath(); ctx.arc(x, y, frame === dot ? 6.5 : 5.5, 0, Math.PI * 2); ctx.fill();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    });
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: speechTextures[0], transparent: true, depthWrite: false, toneMapped: false }));
  sprite.scale.set(0.88, 0.6, 1);
  sprite.position.set(0, 1.85, 0);
  sprite.visible = false;
  return sprite;
}

// ── Shared materials (soft, matte, Animal Crossing-ish) ──
const MATS = new Map<string, THREE.MeshStandardMaterial>();
const mat = (c: string) => {
  let m = MATS.get(c);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: c, ...physicalSurface(c) });
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

// ── Signs: crisp canvas-text panels (station names, shop fronts, cartoon company badges) ──
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

/** The kit's compact cars need a shared real footprint, including their mirrors. */
async function placeCar(g: THREE.Group, model: string) {
  const gltf = await load(`/world3d/cars/${model}.glb`);
  const car = gltf.scene.clone(true);
  car.rotation.y = Math.PI / 2;
  const bounds = new THREE.Box3().setFromObject(car);
  const size = bounds.getSize(new THREE.Vector3());
  const fitted = new THREE.Group();
  fitted.add(car);
  fitted.scale.set(CAR_LENGTH / size.x, CAR_WIDTH / size.z, CAR_WIDTH / size.z);
  const fitBounds = new THREE.Box3().setFromObject(fitted);
  const centre = fitBounds.getCenter(new THREE.Vector3());
  fitted.position.set(-centre.x, -fitBounds.min.y, -centre.z);
  bendAll(fitted);
  g.add(fitted);
  return fitted;
}

const GROUND: Record<string, [string, number]> = {
  g: ["#8fd16f", 0.05],
  f: ["#88cc69", 0.05],
  T: ["#8fd16f", 0.05],
  "-": ["#e9e1d0", 0.12],
  _: ["#ecd8a4", 0.08],
  "=": ["#586171", 0],
  ":": ["#586171", 0],
  "|": ["#cbbfa8", 0.3],
  X: ["#e9e1d0", 0.12],
  L: ["#e9e1d0", 0.12],
  B: ["#ecd8a4", 0.08],
  k: ["#8fd16f", 0.05],
};

function groundMesh(tiles: string[], highland: boolean, holes = new Set<string>()) {
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
      if (ch === "w" || holes.has(`${x},${y}`)) return;
      const [hex0, h] = GROUND[ch] ?? (highland ? GROUND.g : ["#e9e1d0", 0.12]);
      let hex = hex0;
      // A soft checker on grass and paving, like hand-laid tiles.
      if ((x + y) % 2 && (ch === "-" || ch === "X" || ch === "L")) hex = "#e2d9c6";
      if ((x * 7 + y * 3) % 5 === 0 && (ch === "g" || ch === "T" || ch === "k")) hex = "#93d473";
      quad(x, y, x + 1, y + 1, h, hex);
      if (!highland && ["-", "X", "L"].includes(ch)) {
        // Staggered sandstone flags, baked into the existing ground mesh.
        const joint = "#c6bba7";
        quad(x, y + 0.49, x + 1, y + 0.51, h + 0.002, joint);
        const seam = x + (y % 2 ? 0.3 : 0.7);
        quad(seam, y, seam + 0.018, y + 0.49, h + 0.002, joint);
        quad(x + 0.49, y + 0.51, x + 0.51, y + 1, h + 0.002, joint);
      }
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

/** Current lane markings, zebras and stop lines use the same world positions
 * as the canvas fallback and traffic-rule collision checks. */
function roadMarkings(map: WorldMap) {
  const position: number[] = [], colour: number[] = [];
  const c = new THREE.Color();
  for (const paint of cityRoadPaint(map)) {
    const x = paint.x, z = paint.y, x1 = x + paint.w, z1 = z + paint.h;
    position.push(x, .018, z, x, .018, z1, x1, .018, z1, x, .018, z, x1, .018, z1, x1, .018, z);
    c.set(paint.colour);
    for (let i = 0; i < 6; i++) colour.push(c.r, c.g, c.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colour, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  bend(material);
  return new THREE.Mesh(geometry, material);
}

type Signal3D = { post: ReturnType<typeof citySignalPosts>[number]; lamps: THREE.MeshBasicMaterial[]; pedestrian: THREE.MeshBasicMaterial; phase: string };
function streetSignals(world: THREE.Group): Signal3D[] {
  const sphere = new THREE.SphereGeometry(.12, 12, 8);
  const materials = new Map<string, { lamps: THREE.MeshBasicMaterial[]; pedestrian: THREE.MeshBasicMaterial }>();
  return citySignalPosts().map(post => {
    const key = `${post.junction.id}-${post.axis}`;
    let lighting = materials.get(key);
    if (!lighting) {
      lighting = { lamps: ["#53272c", "#54472c", "#244736"].map(color => { const m = new THREE.MeshBasicMaterial({ color, toneMapped: false }); bend(m); return m; }), pedestrian: new THREE.MeshBasicMaterial({ color: "#ff4b52", toneMapped: false }) };
      bend(lighting.pedestrian); materials.set(key, lighting);
    }
    const g = new THREE.Group(); g.position.set(post.x, 0, post.y);
    // Each head faces the driver approaching its stop line. Opposite and
    // perpendicular signals show their housing backs/sides, not another lane's green.
    g.rotation.y = post.approach === "north" ? 0 : post.approach === "south" ? Math.PI : post.approach === "east" ? -Math.PI / 2 : Math.PI / 2;
    world.add(g);
    cyl(g, "#28353e", 0, 0, .12, 2.85, .055, 8);
    box(g, "#52616c", -.33, 1.88, -.15, .33, 3.06, .21);
    box(g, "#17232b", -.29, 1.92, -.17, .29, 3.02, .235);
    lighting.lamps.forEach((material, i) => { const light = new THREE.Mesh(sphere, material); light.position.set(0, 2.82 - i * .35, .25); g.add(light); });
    box(g, "#17232b", -.22, .95, -.13, .22, 1.54, .21);
    // Small pedestrian icon: head and body glow green only during all-red.
    const walker = new THREE.Mesh(new THREE.SphereGeometry(.065, 8, 6), lighting.pedestrian);
    walker.position.set(0, 1.4, .24); g.add(walker);
    const torso = new THREE.Mesh(BOX, lighting.pedestrian); torso.scale.set(.1, .21, .035); torso.position.set(0, 1.22, .24); g.add(torso);
    return { post, lamps: lighting.lamps, pedestrian: lighting.pedestrian, phase: "" };
  });
}
function updateStreetSignals(signals: Signal3D[], now: number) {
  const colours = ["#ff4b52", "#ffd04a", "#46f09c"], dark = ["#53272c", "#54472c", "#244736"];
  for (const signal of signals) {
    const state = signalAt(signal.post.junction, now), colour = state[signal.post.axis], phase = `${colour}-${state.pedestrian}`;
    if (signal.phase === phase) continue;
    signal.phase = phase;
    signal.lamps.forEach((lamp, i) => lamp.color.set(["red", "amber", "green"][i] === colour ? colours[i] : dark[i]));
    signal.pedestrian.color.set(state.pedestrian === "walk" ? "#46f09c" : "#ff4b52");
  }
}

// ── Buildings ──
const COMMERCIAL = "/world3d/commercial/";
const MIDRISE = "abcdefghijklmn".split("").map((c) => `${COMMERCIAL}building-${c}.glb`);
const TOWERS = "abcde".split("").map((c) => `${COMMERCIAL}building-skyscraper-${c}.glb`);

const ARCH = { stone: "#f6f2ea", ink: "#263950", glass: "#95cddd", brass: "#dfb968", slate: "#4c6078" };

// Three shared, small mural textures keep street art inexpensive to draw.
const MURALS = new Map<number, THREE.MeshBasicMaterial>();
function muralMaterial(variant: number) {
  const cached = MURALS.get(variant);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const ctx = canvas.getContext("2d")!;
  const palette = [["#143d3a", "#a5f0cb", "#ffbd82"], ["#30264c", "#d2b7ff", "#ff876c"], ["#18364e", "#83d8ec", "#f6d88e"]][variant];
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, 768, 384);
  // Brick seams, flowing spray strokes, and deterministic paint flecks.
  ctx.strokeStyle = "#ffffff12";
  ctx.lineWidth = 2;
  for (let y = 0; y < 384; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(768, y); ctx.stroke();
    for (let x = (y / 32 % 2) * 48; x < 768; x += 96) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke();
    }
  }
  ctx.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = i % 2 ? palette[1] : palette[2];
    ctx.globalAlpha = 0.24;
    ctx.lineWidth = 12 + i * 3;
    ctx.beginPath();
    ctx.moveTo(-30, 70 + i * 44);
    ctx.bezierCurveTo(220, -90 + i * 45, 480, 490 - i * 48, 800, 60 + i * 30);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = i % 2 ? palette[1] : palette[2];
    ctx.beginPath(); ctx.arc((i * 173 + variant * 37) % 768, (i * 97) % 384, 1 + i % 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(384, 207); ctx.rotate(-0.055);
  ctx.textAlign = "center";
  ctx.font = "italic 900 104px system-ui, sans-serif";
  ctx.lineJoin = "round";
  ctx.lineWidth = 17; ctx.strokeStyle = "#101c2b";
  const word = ["STAY CURIOUS", "CREATE MORE", "DREAM BIG"][variant];
  ctx.strokeText(word, 0, 0, 670);
  ctx.fillStyle = palette[1]; ctx.fillText(word, 0, 0, 670);
  ctx.font = "700 20px system-ui, sans-serif";
  ctx.fillStyle = "#fff4df";
  ctx.fillText("ILLUMINATED  /  THE CITY IS YOUR CANVAS", 0, 57);
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  bend(material);
  MURALS.set(variant, material);
  return material;
}

/** Flush art panels and bronze edging stay inside existing building footprints. */
function artFrontage(g: THREE.Group, x: number, z: number, width: number, variant: number) {
  const w = Math.min(3.5, width * 0.32);
  if (w < 1.2) return;
  const cx = x + width - w / 2 - 0.25;
  box(g, ARCH.ink, cx - w / 2 - 0.08, 0.38, z - 0.06, cx + w / 2 + 0.08, 2.28, z + 0.035);
  box(g, ARCH.brass, cx - w / 2 - 0.09, 0.34, z, cx + w / 2 + 0.09, 0.4, z + 0.07);
  const mural = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.75), muralMaterial(variant % 3));
  mural.position.set(cx, 1.32, z + 0.045);
  g.add(mural);
}

function architecturalPlanter(g: THREE.Group, x: number, z: number) {
  box(g, "#324b47", x - 0.35, 0.14, z - 0.22, x + 0.35, 0.55, z + 0.22);
  box(g, ARCH.brass, x - 0.36, 0.5, z - 0.23, x + 0.36, 0.56, z + 0.23);
  box(g, "#476f59", x - 0.28, 0.56, z - 0.17, x + 0.28, 0.86, z + 0.17);
  box(g, "#719579", x - 0.2, 0.86, z - 0.13, x + 0.2, 1.02, z + 0.13);
}

let telephoneHeader: THREE.Mesh | null = null;
const TELEPHONE_ROOF = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
/** Classic red street kiosk. Opaque glazing avoids costly transparent layers. */
function telephoneBox(g: THREE.Group, x: number, z: number) {
  const red = "#d52b32", trim = "#a71824", glass = "#344d51";
  const kiosk = new THREE.Group();
  kiosk.position.set(x, 0, z);
  g.add(kiosk);
  box(kiosk, "#676a65", 0.1, 0.02, 0.1, 0.9, 0.15, 0.9);
  box(kiosk, red, 0.14, 0.15, 0.14, 0.86, 0.43, 0.86);
  // Dark interior, with recessed window panes on the front and both sides.
  box(kiosk, glass, 0.17, 0.43, 0.17, 0.83, 1.94, 0.83);
  for (const side of [0.14, 0.8]) {
    box(kiosk, red, side, 0.15, 0.14, side + 0.06, 2.15, 0.2);
    box(kiosk, red, side, 0.15, 0.8, side + 0.06, 2.15, 0.86);
  }
  // Six rows and three columns of narrow red glazing bars.
  for (let row = 0; row <= 6; row++) {
    const y = 0.43 + row * 0.25;
    box(kiosk, red, 0.18, y, 0.835, 0.82, y + 0.025, 0.86);
    for (const side of [0.14, 0.835]) box(kiosk, red, side, y, 0.18, side + 0.025, y + 0.025, 0.82);
  }
  for (let column = 1; column < 3; column++) {
    const p = 0.18 + column * 0.64 / 3;
    box(kiosk, red, p, 0.43, 0.835, p + 0.022, 1.96, 0.86);
    for (const side of [0.14, 0.835]) box(kiosk, red, side, 0.43, p, side + 0.025, 1.96, p + 0.022);
  }
  box(kiosk, trim, 0.12, 1.98, 0.12, 0.88, 2.22, 0.88);
  box(kiosk, red, 0.1, 2.22, 0.1, 0.9, 2.28, 0.9);
  const roof = new THREE.Mesh(TELEPHONE_ROOF, mat(red));
  roof.position.set(0.5, 2.28, 0.5); roof.scale.set(0.4, 0.2, 0.4);
  kiosk.add(roof);
  telephoneHeader ??= sign("TELEPHONE", { bg: "#f5ead0", fg: "#332c29", w: 0.61, h: 0.14, font: "700 42px Georgia, serif" });
  for (const side of [0, -1, 1]) {
    const header = telephoneHeader.clone();
    header.position.set(side === 0 ? 0.5 : side < 0 ? 0.115 : 0.885, 2.11, side === 0 ? 0.885 : 0.5);
    header.rotation.y = side * Math.PI / 2;
    kiosk.add(header);
  }
  // Brass latch, little crest, and a visible phone silhouette behind the glass.
  box(kiosk, ARCH.brass, 0.74, 0.99, 0.867, 0.77, 1.16, 0.9);
  box(kiosk, ARCH.brass, 0.47, 2.3, 0.855, 0.53, 2.37, 0.88);
  box(kiosk, "#b7bab2", 0.28, 1.04, 0.84, 0.44, 1.4, 0.845);
  box(kiosk, "#172328", 0.3, 1.16, 0.846, 0.34, 1.37, 0.855);
}

/** Framed glazing reads clearly from the street without transparent materials. */
function facadeWindow(g: THREE.Group, x: number, y: number, z: number, w: number, h: number, side = false) {
  const pane = (colour: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
    side ? box(g, colour, z0, y0, x0, z1, y1, x1) : box(g, colour, x0, y0, z0, x1, y1, z1);
  pane(ARCH.stone, x - 0.055, y - 0.055, z, x + w + 0.055, y + h + 0.055, z + 0.055);
  pane(ARCH.glass, x, y, z + 0.056, x + w, y + h, z + 0.075);
  pane(ARCH.stone, x + w / 2 - 0.025, y, z + 0.076, x + w / 2 + 0.025, y + h, z + 0.09);
  pane(ARCH.ink, x - 0.08, y - 0.08, z - 0.03, x + w + 0.08, y - 0.02, z + 0.12);
}

function entrance(g: THREE.Group, cx: number, front: number, accent: string, width = 0.9) {
  box(g, ARCH.stone, cx - width / 2 - 0.1, 0.14, front - 0.04, cx + width / 2 + 0.1, 1.35, front + 0.06);
  box(g, ARCH.ink, cx - width / 2, 0.15, front + 0.065, cx + width / 2, 1.27, front + 0.09);
  box(g, "#b5dce2", cx - width / 2 + 0.06, 0.46, front + 0.095, cx + width / 2 - 0.06, 1.18, front + 0.11);
  box(g, ARCH.stone, cx - 0.025, 0.16, front + 0.115, cx + 0.025, 1.26, front + 0.13);
  box(g, ARCH.brass, cx + 0.09, 0.62, front + 0.14, cx + 0.13, 0.86, front + 0.17);
  box(g, accent, cx - width / 2 - 0.22, 1.34, front - 0.08, cx + width / 2 + 0.22, 1.44, front + 0.37);
}

/** Each employer has its own architecture, so a workplace is recognisable before its sign. */
function headquarters(g: THREE.Group, t: Extract<ReturnType<typeof buildLondon>["things"][number], { kind: "building" }>, co: Company) {
  const w = t.w - 0.16;
  const d = t.h - 0.16;
  const cx = w / 2;
  const a = co.accent;
  const f = d - 0.12;
  const b = new THREE.Group();
  b.position.set(t.x + 0.08, 0, t.y + 0.08);
  g.add(b);
  const body = (colour: string, top: number, inset = 0) => box(b, colour, inset, 0.14, 0.12 + inset, w - inset, top, f - inset);
  const cornice = (y: number, inset = 0, colour = ARCH.stone) => box(b, colour, inset - 0.04, y, 0.08 + inset, w - inset + 0.04, y + 0.12, f - inset + 0.06);
  const windows = (top: number, cols = 2, start = 2.15, inset = 0) => {
    const pitch = (w - inset * 2) / cols;
    for (let y = start; y + 0.56 < top; y += 1.0)
      for (let col = 0; col < cols; col++) facadeWindow(b, inset + col * pitch + pitch * 0.2, y, f - inset, pitch * 0.6, 0.56);
    for (let z = 0.7 + inset; z < f - 0.5; z += 1.25)
      for (let y = start; y + 0.56 < top; y += 1.0) facadeWindow(b, z, y, w - inset, 0.64, 0.56, true);
  };

  switch (co.building) {
    case "tower": {
      body(ARCH.ink, 2.1);
      box(b, "#92b9ce", 0.26, 2.1, 0.4, w - 0.26, 5.85, f - 0.26);
      for (const y of [2.2, 3.2, 4.2, 5.2, 5.85]) cornice(y, 0.23, ARCH.slate);
      for (const x of [0.42, cx, w - 0.42]) box(b, ARCH.stone, x - 0.04, 2.2, f - 0.25, x + 0.04, 5.85, f - 0.18);
      box(b, a, 0.58, 5.98, 1.0, w - 0.58, 6.3, f - 0.8);
      cyl(b, ARCH.brass, cx, d / 2, 6.3, 7.05, 0.035, 8);
      break;
    }
    case "dome":
    case "courthouse": {
      body("#ded2bc", 3.45);
      box(b, ARCH.ink, 0.16, 0.25, f - 0.22, w - 0.16, 2.8, f + 0.02);
      for (const x of [0.24, 0.78, w - 0.78, w - 0.24]) {
        cyl(b, ARCH.stone, x, f + 0.12, 0.3, 2.72, 0.1, 10);
        box(b, ARCH.stone, x - 0.16, 2.67, f - 0.03, x + 0.16, 2.81, f + 0.27);
        box(b, ARCH.stone, x - 0.16, 0.2, f - 0.03, x + 0.16, 0.34, f + 0.27);
      }
      box(b, ARCH.stone, -0.02, 2.81, f - 0.15, w + 0.02, 3.04, f + 0.32);
      roof(b, ARCH.slate, -0.04, f - 0.25, w + 0.04, f + 0.4, 3.04, 0.65);
      cornice(3.45);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(w * 0.37, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(co.building === "dome" ? "#7aa39a" : ARCH.slate));
      dome.position.set(cx, 3.62, d * 0.43);
      b.add(dome);
      cyl(b, ARCH.brass, cx, d * 0.43, 3.62 + w * 0.37, 4.92, 0.055, 8);
      break;
    }
    case "barn":
    case "nursery": {
      const nursery = co.building === "nursery";
      body(nursery ? "#f2dbb8" : "#c96657", 2.9);
      roof(b, nursery ? "#78988a" : ARCH.slate, -0.03, 0.06, w + 0.03, f + 0.05, 2.9, 1.05);
      cornice(2.82);
      windows(2.9, 2, 2.05);
      if (nursery) for (let i = 0; i < 5; i++) box(b, [a, "#ffd166", "#6bc6ff", "#5fd3a5", a][i], 0.18 + i * (w - 0.36) / 5, 0.2, f + 0.025, 0.18 + (i + 0.7) * (w - 0.36) / 5, 0.9, f + 0.06);
      else {
        box(b, ARCH.stone, cx - 0.44, 3.06, f * 0.54, cx + 0.44, 3.68, f * 0.54 + 0.04);
        box(b, a, cx - 0.37, 3.13, f * 0.54 + 0.045, cx + 0.37, 3.61, f * 0.54 + 0.065);
      }
      break;
    }
    case "hospital": {
      body(ARCH.stone, 4.5);
      box(b, "#dce7e9", 0.16, 4.5, 0.35, w - 0.16, 4.8, f - 0.3);
      windows(4.5);
      for (const x of [0.08, w - 0.22]) box(b, a, x, 0.2, f - 0.015, x + 0.14, 4.46, f + 0.05);
      box(b, a, cx - 0.46, 4.85, d * 0.48, cx + 0.46, 5.74, d * 0.48 + 0.14);
      box(b, ARCH.stone, cx - 0.08, 4.99, d * 0.48 + 0.15, cx + 0.08, 5.6, d * 0.48 + 0.18);
      box(b, ARCH.stone, cx - 0.3, 5.21, d * 0.48 + 0.15, cx + 0.3, 5.37, d * 0.48 + 0.18);
      break;
    }
    case "factory": {
      body(co.id === "tesler" ? "#e4e9e8" : "#a7c3c4", 3.05);
      for (let z = 0.15; z < f - 0.5; z += 1.4) {
        roof(b, ARCH.slate, 0, z, w, Math.min(z + 1.35, f), 3.05, 0.64);
        box(b, ARCH.glass, 0.15, 3.12, z + 1.28, w - 0.15, 3.45, z + 1.31);
      }
      windows(3.05);
      box(b, a, w - 0.5, 3.05, 0.5, w - 0.2, 4.65, 0.88);
      box(b, ARCH.slate, w - 0.56, 4.65, 0.45, w - 0.14, 4.8, 0.93);
      break;
    }
    case "cinema": {
      body("#655d80", 3.65);
      for (const x of [0.16, w - 0.38]) box(b, a, x, 0.2, f, x + 0.22, 4.25, f + 0.08);
      box(b, ARCH.stone, 0.35, 3.3, f - 0.04, w - 0.35, 3.84, f + 0.09);
      box(b, a, 0.55, 3.38, f + 0.1, w - 0.55, 3.76, f + 0.13);
      box(b, a, -0.05, 1.38, f - 0.15, w + 0.05, 1.99, f + 0.49);
      for (let x = 0.12; x < w; x += 0.32) box(b, "#fff0be", x, 2.02, f + 0.38, x + 0.09, 2.12, f + 0.48);
      break;
    }
    case "bakery": {
      body("#eac9a1", 3.08);
      roof(b, "#6a7d8f", -0.03, 0.06, w + 0.03, f + 0.04, 3.08, 0.82);
      windows(3.08);
      const stripes = 8;
      for (let i = 0; i < stripes; i++) box(b, i % 2 ? ARCH.stone : a, i * w / stripes, 1.26, f - 0.05, (i + 1) * w / stripes, 1.39, f + 0.45);
      break;
    }
    case "crane": {
      body("#c49a7c", 3.45);
      windows(3.45);
      for (const y of [2.0, 3.45]) cornice(y, 0, ARCH.slate);
      const mast = w - 0.33;
      box(b, a, mast - 0.1, 0.2, 0.45, mast + 0.1, 5.35, 0.65);
      box(b, a, 0.15, 5.2, 0.36, w + 0.03, 5.4, 0.72);
      for (let y = 0.7; y < 5.1; y += 0.55) box(b, ARCH.slate, mast - 0.13, y, 0.42, mast + 0.13, y + 0.055, 0.68);
      cyl(b, ARCH.ink, 0.45, 0.54, 3.9, 5.2, 0.022, 6);
      box(b, a, 0.3, 3.7, 0.39, 0.6, 3.95, 0.69);
      break;
    }
    case "stadium": {
      body("#d9e4dc", 2.35);
      box(b, "#5c927b", 0.22, 2.36, 0.42, w - 0.22, 2.42, f - 0.4);
      for (const x of [0.08, w - 0.25]) box(b, ARCH.stone, x, 2.35, 0.12, x + 0.17, 3.12, f);
      for (const z of [0.3, f - 0.3]) {
        box(b, ARCH.slate, 0.14, 2.45, z, w - 0.14, 2.73, z + 0.2);
        for (const x of [0.25, w - 0.25]) {
          cyl(b, ARCH.slate, x, z + 0.1, 2.7, 4.3, 0.035, 6);
          box(b, "#fff0be", x - 0.18, 4.25, z, x + 0.18, 4.43, z + 0.18);
        }
      }
      break;
    }
    case "globe": {
      body("#b6ccdd", 3.3);
      windows(3.3);
      cornice(3.3);
      cyl(b, ARCH.brass, cx, d * 0.48, 3.42, 3.8, 0.1, 10);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.77, 20, 12), mat(a));
      globe.position.set(cx, 4.45, d * 0.48);
      b.add(globe);
      for (const rotation of [0, Math.PI / 2]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.035, 5, 28), mat(ARCH.stone));
        ring.position.copy(globe.position);
        ring.rotation.y = rotation;
        b.add(ring);
      }
      break;
    }
  }
  // A shared street-level language: pale plinth, shaded double doors and a crisp fascia.
  box(b, ARCH.slate, 0, 0.14, f - 0.03, w, 0.27, f + 0.06);
  if (co.building !== "cinema") box(b, a, 0.02, 1.48, f - 0.03, w - 0.02, 1.98, f + 0.11);
  entrance(b, cx, f + 0.03, co.building === "bakery" ? ARCH.slate : a);
}

/** A glazed learning pavilion and a sawtooth-roof workshop anchor the Study Quarter. */
function studyQuarterBuilding(g: THREE.Group, t: Extract<ReturnType<typeof buildLondon>["things"][number], { kind: "building" }>) {
  const w = t.w - 0.16;
  const d = t.h - 0.16;
  const maker = t.id === "makerspace";
  const accent = maker ? "#2c7f86" : "#755ab5";
  const b = new THREE.Group();
  b.position.set(t.x + 0.08, 0, t.y + 0.08);
  g.add(b);
  box(b, maker ? "#c58365" : "#e2dbef", 0, 0.15, 0, w, 3.25, d - 0.12);
  box(b, ARCH.stone, -0.04, 0.15, -0.04, w + 0.04, 0.32, d);
  box(b, ARCH.stone, -0.04, 3.2, -0.04, w + 0.04, 3.38, d);
  // A tall transparent-looking study frontage, in warm pale frames.
  for (let x = 0.35; x < w - 1; x += 1.35) facadeWindow(b, x, 0.7, d - 0.1, 0.96, 1.65);
  for (let z = 0.5; z < d - 0.7; z += 1.3) facadeWindow(b, z, 0.8, w, 0.88, 1.5, true);
  box(b, accent, 0.12, 2.56, d - 0.04, w - 0.12, 3.08, d + 0.08);
  entrance(b, w / 2, d - 0.02, accent, 1.1);
  if (maker) {
    for (let z = 0.12; z < d - 1; z += 1.5) {
      roof(b, ARCH.slate, 0, z, w, z + 1.4, 3.38, 0.75);
      box(b, ARCH.glass, 0.2, 3.47, z + 1.32, w - 0.2, 3.83, z + 1.36);
    }
    for (const x of [0.25, w - 0.4]) box(b, accent, x, 0.3, d - 0.04, x + 0.15, 3.2, d + 0.04);
  } else {
    // Roof garden and timber pergola remain inside the existing building footprint.
    box(b, "#8fb794", 0.35, 3.38, 0.35, w - 0.35, 3.51, d - 0.35);
    for (const x of [0.45, w - 0.55]) for (const z of [0.45, d - 0.55]) box(b, "#b7946b", x, 3.5, z, x + 0.1, 4.2, z + 0.1);
    for (let x = 0.4; x < w - 0.3; x += 0.55) box(b, "#c9aa7e", x, 4.16, 0.4, x + 0.12, 4.28, d - 0.35);
    for (const x of [0.5, w - 1.4]) {
      box(b, ARCH.stone, x, 3.51, 0.6, x + 0.85, 3.77, 1.35);
      box(b, "#6eaa7d", x + 0.08, 3.77, 0.68, x + 0.77, 4.0, 1.27);
    }
  }
  const plaque = sign(maker ? "MAKERSPACE" : "STUDY QUARTER", { bg: accent, fg: "#ffffff", w: w - 0.8, h: 0.4 });
  plaque.position.set(w / 2, 2.82, d + 0.1);
  b.add(plaque);
}

/** Visual wayfinding follows the lobby's existing walkable interaction areas. */
function learningLobby(g: THREE.Group, map: WorldMap) {
  const welcome = sign(map.sign?.text ?? "Study Quarter · learn, work, grow", { bg: "#2b5fd9", fg: "#ffffff", w: 7, h: 0.65 });
  welcome.position.set(13, 2.2, 5.8);
  g.add(welcome);

  // The cabinet sits just behind the awards portal; the approach remains open.
  box(g, ARCH.ink, 3.85, 0.15, 4.05, 6.15, 0.65, 4.94);
  box(g, "#e6d2a5", 3.85, 0.65, 4.05, 6.15, 0.73, 4.94);
  box(g, "#46616c", 3.95, 0.73, 4.06, 6.05, 1.86, 4.14);
  for (const x of [3.85, 6.04]) box(g, ARCH.brass, x, 0.73, 4.05, x + 0.11, 1.92, 4.94);
  box(g, ARCH.ink, 3.8, 1.9, 4.01, 6.2, 2.03, 4.98);
  // A sculpted cup with handles, stem and a dark engraved plinth.
  box(g, ARCH.ink, 4.66, 0.74, 4.33, 5.34, 0.88, 4.8);
  cyl(g, ARCH.brass, 5, 4.56, 0.88, 1.1, 0.09, 12);
  cyl(g, "#e8c36d", 5, 4.56, 1.1, 1.59, 0.14, 16, 0.35);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 6, 20), mat("#ffe2a0"));
  rim.position.set(5, 1.59, 4.56);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  for (const x of [4.67, 5.33]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 6, 16), mat(ARCH.brass));
    handle.position.set(x, 1.35, 4.56);
    g.add(handle);
  }
  const awards = sign("YOUR AWARDS", { bg: ARCH.ink, fg: "#ffe2a0", w: 2.5, h: 0.38 });
  awards.position.set(5, 2.25, 4.96);
  g.add(awards);

  for (const desk of [
    { x: 2, cx: 4, accent: "#2b5fd9", rug: "#d8e5ee", title: "STUDY DESKS", subtitle: "Choose a subject · earn XP" },
    { x: 20, cx: 22, accent: "#247b69", rug: "#dce9de", title: "CAREERS DESK", subtitle: "Simulated work experience" },
  ]) {
    box(g, desk.rug, desk.x + 0.1, 0.03, 17.1, desk.x + 3.9, 0.045, 18.9);
    for (const x of [desk.x + 0.1, desk.x + 3.8]) box(g, "#b8a184", x, 0.15, 16.05, x + 0.1, 2.2, 16.15);
    box(g, desk.accent, desk.x + 0.1, 1.82, 16.03, desk.x + 3.9, 2.3, 16.19);
    const title = sign(desk.title, { bg: desk.accent, fg: "#ffffff", w: 3.5, h: 0.36 });
    title.position.set(desk.cx, 2.07, 16.21);
    g.add(title);
    const subtitle = sign(desk.subtitle, { bg: "#f6f2ea", fg: ARCH.ink, w: 3.5, h: 0.28 });
    subtitle.position.set(desk.cx, 1.65, 16.21);
    g.add(subtitle);
    // Small coloured books on the existing table connect each sign to its desk.
    for (let i = 0; i < 3; i++) box(g, [desk.accent, ARCH.brass, "#ce8b77"][i], desk.x + 0.3, 0.84 + i * 0.08, 16.28, desk.x + 0.86, 0.91 + i * 0.08, 16.65);
  }
}

function terrace(g: THREE.Group, t: { x: number; y: number; w: number; h: number; id: string; height?: number }, highland: boolean) {
  const seed = t.x * 7 + t.y * 13;
  const x0 = t.x + 0.08;
  const z0 = t.y + 0.08;
  const w = t.w - 0.16;
  const d = t.h - 0.16;
  const wall = highland ? ["#f2ead8", "#e6dcc6", "#efe6d4"][seed % 3] : ["#b9634a", "#a65840", "#d8be92", "#ead9bd", "#c26b4f"][seed % 5];
  const roofC = highland || seed % 3 ? "#4d5862" : "#65534f";
  const floors = highland ? 2 : Math.max(2, Math.min(4, Math.round(t.height ?? 3)));
  const top = 0.15 + floors * 0.95;
  box(g, wall, x0, 0, z0 + 0.25, x0 + w, top, z0 + d);
  box(g, "#877e77", x0, 0.12, z0 + d - 0.03, x0 + w, 0.27, z0 + d + 0.04);
  box(g, "#f6f2ea", x0 - 0.04, top - 0.12, z0 + d - 0.06, x0 + w + 0.04, top, z0 + d + 0.04);
  if (!highland) {
    for (let floor = 1; floor < floors; floor++) box(g, "#e8d5ba", x0, 0.11 + floor * 0.95, z0 + d - 0.02, x0 + w, 0.18 + floor * 0.95, z0 + d + 0.04);
    for (const x of [x0, x0 + w - 0.12])
      for (let y = 0.28; y < top - 0.2; y += 0.35) box(g, "#e8d5ba", x, y, z0 + d - 0.015, x + 0.12, y + 0.2, z0 + d + 0.045);
  }
  roof(g, roofC, x0 - 0.05, z0 + 0.2, x0 + w + 0.05, z0 + d + 0.05, top, 0.48);
  // Clear definition from the close camera: each house in the row gets its own
  // facade colour, divided by pale pilasters, with a white fascia and a dark
  // gutter under the eaves and a dark plinth line at the base.
  {
    const units = Math.max(1, Math.round(w / 2.6));
    const uw = w / units;
    const palette = highland ? ["#f2ead8", "#e8dfcb", "#efe5d2"] : ["#b9634a", "#d8be92", "#ead9bd", "#c26b4f", "#9fb3a6", "#e3c6b0", "#a65840"];
    for (let u = 0; u < units; u++) {
      const ux = x0 + u * uw;
      box(g, palette[(seed + u * 3) % palette.length], ux + 0.02, 0.27, z0 + d - 0.005, ux + uw - 0.02, top - 0.12, z0 + d + 0.012);
      if (u > 0) box(g, "#efe4cf", ux - 0.05, 0.2, z0 + d - 0.01, ux + 0.05, top - 0.08, z0 + d + 0.06);
    }
    box(g, "#fbf8f2", x0 - 0.07, top - 0.06, z0 + d + 0.02, x0 + w + 0.07, top + 0.05, z0 + d + 0.11);
    box(g, "#2e3338", x0 - 0.07, top - 0.1, z0 + d + 0.09, x0 + w + 0.07, top - 0.04, z0 + d + 0.15);
    box(g, "#3d3530", x0, 0.24, z0 + d + 0.035, x0 + w, 0.29, z0 + d + 0.055);
    // Ridge capping along the roof top.
    box(g, "#2f3439", x0 - 0.05, top + 0.46, z0 + 0.2 + (d - 0.2) / 2 - 0.05, x0 + w + 0.05, top + 0.52, z0 + 0.2 + (d - 0.2) / 2 + 0.05);
  }
  // Slate courses break up the broad, flat roof surface from the game camera.
  for (let course=1;course<5;course++) {
    const z=z0+d/2+(d/2)*course/5;
    const height=top+0.48*(1-course/5);
    box(g,"#778087",x0,height,z,x0+w,height+0.018,z+0.025);
  }
  const bays = Math.max(2, Math.round(w / 1.3));
  const bw = w / bays;
  const door = ["#1b3a6b", "#2d6a4f", "#2a2730", "#c8322d"][seed % 4];
  for (let b = 0; b < bays; b++) {
    if (b % 2 === 0) {
      const cx = x0 + b * bw + 0.15;
      box(g, highland ? "#c9bfaa" : "#8c4433", cx, top + 0.3, z0 + d * 0.45, cx + 0.35, top + 1.2, z0 + d * 0.45 + 0.3);
      box(g, "#d8cbb6", cx - 0.035, top + 1.16, z0 + d * 0.45 - 0.035, cx + 0.385, top + 1.27, z0 + d * 0.45 + 0.335);
    }
    for (let f = 0; f < floors; f++) {
      const y0 = 0.15 + f * 0.95;
      const wx0 = x0 + b * bw + bw * 0.28;
      const wx1 = x0 + b * bw + bw * 0.72;
      const zf = z0 + d;
      if (f === 0 && b === Math.floor(bays / 2)) {
        box(g, door, wx0, y0, zf - 0.02, wx1, y0 + 0.72, zf + 0.03);
        box(g, "#f6f2ea", wx0 - 0.05, y0 + 0.72, zf - 0.02, wx1 + 0.05, y0 + 0.8, zf + 0.04);
        box(g, "#f6f2ea", wx0 - 0.05, y0, zf, wx0, y0 + 0.72, zf + 0.05);
        box(g, "#f6f2ea", wx1, y0, zf, wx1 + 0.05, y0 + 0.72, zf + 0.05);
        box(g, ARCH.brass, wx1 - 0.07, y0 + 0.31, zf + 0.035, wx1 - 0.035, y0 + 0.37, zf + 0.065);
        box(g, "#c9bba2", wx0 - 0.09, 0.12, zf, wx1 + 0.09, 0.18, zf + 0.19);
        continue;
      }
      // Bay windows on alternate ground floors; a dark reveal around every frame.
      if (!highland && f === 0 && seed % 2 === 0) {
        box(g, "#efe4cf", wx0 - 0.12, 0.2, zf, wx1 + 0.12, y0 + 0.86, zf + 0.26);
        box(g, "#3b4652", wx0 - 0.05, y0 + 0.22, zf + 0.25, wx1 + 0.05, y0 + 0.74, zf + 0.29);
        box(g, "#f6f2ea", (wx0 + wx1) / 2 - 0.02, y0 + 0.22, zf + 0.28, (wx0 + wx1) / 2 + 0.02, y0 + 0.74, zf + 0.31);
        box(g, roofC, wx0 - 0.15, y0 + 0.86, zf - 0.02, wx1 + 0.15, y0 + 0.93, zf + 0.32);
        continue;
      }
      box(g, "#2a2622", wx0 - 0.09, y0 + 0.14, zf - 0.025, wx1 + 0.09, y0 + 0.82, zf + 0.017);
      box(g, "#f6f2ea", wx0 - 0.05, y0 + 0.18, zf - 0.02, wx1 + 0.05, y0 + 0.78, zf + 0.02);
      box(g, (seed+b+f)%3===0?"#c4b284":"#465967", wx0, y0 + 0.23, zf - 0.01, wx1, y0 + 0.73, zf + 0.03);
      box(g, "#f6f2ea", wx0, y0 + 0.47, zf - 0.01, wx1, y0 + 0.49, zf + 0.04);
      box(g, "#f6f2ea", (wx0 + wx1) / 2 - 0.015, y0 + 0.23, zf + 0.025, (wx0 + wx1) / 2 + 0.015, y0 + 0.73, zf + 0.045);
      box(g, "#d4c5ac", wx0 - 0.08, y0 + 0.14, zf - 0.02, wx1 + 0.08, y0 + 0.2, zf + 0.12);
      if (!highland && f===1) {
        box(g,"#4b6254",wx0-0.04,y0+0.09,zf+0.04,wx1+0.04,y0+0.23,zf+0.2);
        box(g,"#79916a",wx0,y0+0.23,zf+0.06,wx1,y0+0.31,zf+0.17);
      }
    }
  }
}

/** Familiar high-street places get their own frontage rather than a generic office. */
function restaurantShop(g: THREE.Group, t: Extract<ReturnType<typeof buildLondon>["things"][number], { kind: "building" }>) {
  const identity = `${t.id} ${t.label ?? ""}`.toLowerCase();
  const coffee = identity.includes("starbucks"), chicken = identity.includes("kfc"), burgers = identity.includes("mcdonald");
  if (!coffee && !chicken && !burgers) return false;
  const x = t.x + 0.12, z = t.y + 0.12, w = t.w - 0.24, d = t.h - 0.24;
  const accent = coffee ? "#006241" : chicken ? "#b72025" : "#c92627";
  const trim = burgers ? "#ffc72c" : "#fff7e9";
  const name = coffee ? "STARBUCKS" : chicken ? "KFC" : "McDonald's";
  const h = coffee ? 2.55 : 2.8;
  box(g, coffee ? "#e7d8bc" : "#e9e2d8", x, 0.12, z, x + w, h, z + d);
  box(g, "#302e30", x - 0.06, h, z - 0.06, x + w + 0.06, h + 0.18, z + d + 0.06);
  // Deep glazing, solid mullions and a separate entrance give the frontage depth.
  for (let i = 0; i < 3; i++) {
    const x0 = x + 0.18 + i * w / 3;
    const x1 = Math.min(x + w - 0.18, x0 + w / 3 - 0.2);
    box(g, "#344e55", x0, 0.35, z + d - 0.06, x1, 1.85, z + d + 0.03);
    box(g, "#9ec6c9", x0 + 0.06, 0.42, z + d + 0.035, x1 - 0.06, 1.77, z + d + 0.045);
    box(g, "#edf3e8", x0, 1.02, z + d + 0.05, x1, 1.07, z + d + 0.08);
  }
  const doorX = x + w / 2;
  box(g, "#233e42", doorX - 0.32, 0.14, z + d + 0.05, doorX + 0.32, 1.88, z + d + 0.1);
  box(g, "#bbd9d6", doorX - 0.25, 0.27, z + d + 0.105, doorX + 0.25, 1.75, z + d + 0.12);
  box(g, "#f2e9ce", doorX + 0.13, 0.8, z + d + 0.12, doorX + 0.18, 1.1, z + d + 0.16);
  box(g, accent, x - 0.04, 1.96, z + d - 0.05, x + w + 0.04, 2.55, z + d + 0.18);
  const board = sign(name, { bg: accent, fg: trim, w: Math.max(1.8, w - 0.4), h: 0.43 });
  board.position.set(x + w / 2, 2.25, z + d + 0.19);
  g.add(board);
  box(g, accent, x - 0.05, 1.82, z + d + 0.06, x + w + 0.05, 1.94, z + d + 0.55);
  if (chicken) {
    // Red and cream awning stripes and a bold bucket-shaped roof sign.
    for (let i = 0; i < 8; i++) box(g, i % 2 ? "#fff7e9" : accent, x + i * w / 8, 1.83, z + d + 0.1, x + (i + 1) * w / 8, 1.96, z + d + 0.56);
    cyl(g, "#fff7e9", x + w * 0.75, z + d * 0.45, h + 0.18, h + 0.9, 0.46, 20, 0.6);
    const bucket = sign("KFC", { bg: accent, fg: "#ffffff", w: 0.76, h: 0.34 });
    bucket.position.set(x + w * 0.75, h + 0.58, z + d * 0.45 + 0.55);
    g.add(bucket);
  } else if (burgers) {
    // Raised golden arches read clearly even when the shop is behind the player.
    const arches = sign("M", { bg: accent, fg: "#ffc72c", w: 1.3, h: 1.05, font: "900 100px system-ui, sans-serif" });
    arches.position.set(x + w * 0.23, h + 0.72, z + d * 0.6);
    g.add(arches);
    box(g, "#ffc72c", x, 0.13, z + d + 0.08, x + w, 0.25, z + d + 0.22);
  } else {
    roof(g, "#344d3e", x - 0.04, z - 0.04, x + w + 0.04, z + d * 0.7, h + 0.18, 0.65);
    for (const xx of [x + 0.22, x + w - 0.22]) cyl(g, "#3c6e45", xx, z + d + 0.18, 0.1, 0.56, 0.19, 12);
  }
  return true;
}

async function building(g: THREE.Group, t: Extract<ReturnType<typeof buildLondon>["things"][number], { kind: "building" }>) {
  const x0 = t.x + 0.08;
  const z0 = t.y + 0.08;
  const w = t.w - 0.16;
  const d = t.h - 0.16;
  const seed = t.x * 7 + t.y * 13;
  box(g, "#e9e1d0", x0 - 0.05, 0, z0 - 0.05, x0 + w + 0.05, 0.13, z0 + d + 0.05);
  if (t.id.startsWith("hotel-")) {
    const front = z0 + d - 0.65;
    const accent = t.accent ?? "#315b50";
    const top = t.height;
    box(g, "#aa715a", x0, 0.15, z0, x0+w, top, front);
    for (const edge of [x0, x0+w-0.22]) box(g, "#dbc8a8", edge, 0.15, z0, edge+0.22, top, front+0.04);
    for (let level = 0; level < 4; level++) {
      const height = 0.65+level*1.25;
      box(g, "#dccbac", x0-0.04, height-0.25, front, x0+w+0.04, height-0.16, front+0.13);
      for (let bay = 0; bay < 4; bay++) {
        if (level===0 && (bay===1 || bay===2)) continue;
        facadeWindow(g,x0+0.38+bay*1.3,height,front+0.05,0.75,0.85);
      }
    }
    box(g, "#e3d3b7", x0-0.08, top, z0-0.04, x0+w+0.08, top+0.18, front+0.12);
    roof(g,"#46535b",x0-0.1,z0-0.1,x0+w+0.1,front+0.1,top+0.18,0.8);
    entrance(g,x0+w/2,front+0.07,accent,1.4);
    // Shallow, ascending stone treads sit within the reserved building plot.
    for(let step=0;step<4;step++) box(g,"#cfbba0",x0+w/2-1,0.03,front+0.13+step*0.12,x0+w/2+1,0.19-step*0.035,front+0.25+step*0.12);
    const board=sign(t.label ?? "Hotel",{bg:accent,fg:"#f8e6b4",w:w-0.6,h:0.55});
    board.position.set(x0+w/2,2.1,front+0.16);g.add(board);
    for(const edge of [x0+0.28,x0+w-0.28]) architecturalPlanter(g,edge,front+0.1);
    return;
  }
  if (restaurantShop(g, t)) return;
  if (t.style === "terrace") return terrace(g, t, false);
  const co = t.companyId ? COMPANIES.find((c) => c.id === t.companyId) : null;
  if (co) return headquarters(g, t, co);
  if (t.id === "makerspace" || t.id === "study-club") return studyQuarterBuilding(g, t);
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
  const GOLDEN = "#d9b45a";
  const cx = x + w / 2;
  const cz = z + d / 2;
  switch (name) {
    case "big-ben": {
      // Elizabeth Tower: stepped Portland-stone shaft, ornate clock stage,
      // open belfry, slate roof and gold corner pinnacles.
      const x0 = x + 0.25;
      const z0 = z + 0.25;
      const x1 = x + w - 0.25;
      const z1 = z + d - 0.25;
      const stone = "#c6b59a", paleStone = "#e0d2b7", shadow = "#958671", gilt = "#c6a460";
      const side = x1 - x0;
      box(g, shadow, x0 - 0.12, 0, z0 - 0.12, x1 + 0.12, 0.32, z1 + 0.12);
      box(g, paleStone, x0 - 0.06, 0.32, z0 - 0.06, x1 + 0.06, 0.48, z1 + 0.06);
      box(g, stone, x0, 0.48, z0, x1, 6.3, z1);
      // Vertical corner piers and narrow inset panels break up the plain shaft.
      for (const [px, pz] of [[x0, z0], [x1 - 0.14, z0], [x0, z1 - 0.14], [x1 - 0.14, z1 - 0.14]]) {
        box(g, paleStone, px, 0.52, pz, px + 0.14, 6.22, pz + 0.14);
        box(g, shadow, px + 0.045, 0.72, pz + 0.045, px + 0.095, 5.96, pz + 0.095);
      }
      for (const yy of [1.55, 3.08, 4.61, 6.18]) {
        box(g, paleStone, x0 - 0.06, yy, z0 - 0.06, x1 + 0.06, yy + 0.13, z1 + 0.06);
        box(g, shadow, x0 + 0.15, yy - 0.1, z1 + 0.015, x1 - 0.15, yy - 0.055, z1 + 0.045);
      }
      // Tall louvred windows repeat up the tower on each visible face.
      for (const yy of [0.9, 2.4, 3.93, 5.18]) {
        for (const [px, pz, ry] of [[cx, z1 + 0.03, 0], [cx, z0 - 0.03, Math.PI], [x1 + 0.03, cz, Math.PI / 2], [x0 - 0.03, cz, -Math.PI / 2]] as const) {
          const window = box(g, "#344653", px - 0.16, yy, pz - 0.015, px + 0.16, yy + 0.48, pz + 0.015);
          window.rotation.y = ry;
          const lintel = box(g, paleStone, px - 0.21, yy + 0.48, pz - 0.04, px + 0.21, yy + 0.55, pz + 0.04);
          lintel.rotation.y = ry;
        }
      }
      // Clock stage has a deep moulded surround and a readable ivory dial.
      box(g, shadow, x0 - 0.13, 6.32, z0 - 0.13, x1 + 0.13, 8.16, z1 + 0.13);
      box(g, paleStone, x0 - 0.07, 6.38, z0 - 0.07, x1 + 0.07, 8.1, z1 + 0.07);
      box(g, gilt, x0 - 0.035, 6.48, z0 - 0.035, x1 + 0.035, 8.02, z1 + 0.035);
      const r = Math.max(0.32, side * 0.34);
      const face = (px: number, pz: number, ry: number) => {
        const f = new THREE.Group();
        f.position.set(px, 7.3, pz);
        f.rotation.y = ry;
        const outer = new THREE.Mesh(new THREE.CircleGeometry(r * 1.12, 32), mat("#263b3f"));
        f.add(outer);
        const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.02, r * 1.12, 32), mat("#d7bd7d"));
        ring.position.z = 0.015;
        f.add(ring);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 32), mat("#f2e8cc"));
        disc.position.z = 0.025;
        f.add(disc);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const tick = box(f, "#27353b", Math.cos(a) * r * 0.82 - 0.025, Math.sin(a) * r * 0.82 - 0.04, 0.04, Math.cos(a) * r * 0.82 + 0.025, Math.sin(a) * r * 0.82 + 0.04, 0.055);
          tick.rotation.z = a;
        }
        const hand1 = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.08, r * 0.75), mat("#1b1622"));
        hand1.position.set(0, r * 0.32, 0.065);
        f.add(hand1);
        const hand2 = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.55, r * 0.08), mat("#1b1622"));
        hand2.position.set(r * 0.25, 0, 0.07);
        f.add(hand2);
        const pin = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), mat("#c6a460"));
        pin.position.z = 0.08;
        f.add(pin);
        g.add(f);
      };
      face(cx, z1 + 0.095, 0);
      face(cx, z0 - 0.095, Math.PI);
      face(x1 + 0.095, cz, Math.PI / 2);
      face(x0 - 0.095, cz, -Math.PI / 2);
      // Belfry: a pierced arcade, louvres, roof cornice and steep slate spire.
      box(g, paleStone, x0 - 0.1, 8.16, z0 - 0.1, x1 + 0.1, 8.35, z1 + 0.1);
      box(g, "#3d4542", x0 + 0.1, 8.42, z0 + 0.1, x1 - 0.1, 9.2, z1 - 0.1);
      for (const [px, pz, ry] of [[cx, z1 + 0.13, 0], [cx, z0 - 0.13, Math.PI], [x1 + 0.13, cz, Math.PI / 2], [x0 - 0.13, cz, -Math.PI / 2]] as const) {
        const face = new THREE.Group(); face.position.set(px, 8.48, pz); face.rotation.y = ry; g.add(face);
        box(face, "#b9aa8c", -0.32, 0, -0.035, -0.22, 0.56, 0.035);
        box(face, "#b9aa8c", 0.22, 0, -0.035, 0.32, 0.56, 0.035);
        box(face, "#b9aa8c", -0.32, 0.52, -0.035, 0.32, 0.62, 0.035);
        for (const px2 of [-0.24, -0.08, 0.08, 0.24]) box(face, "#d5c9ad", px2, 0.06, -0.04, px2 + 0.035, 0.48, 0.04);
      }
      box(g, gilt, x0 - 0.18, 9.2, z0 - 0.18, x1 + 0.18, 9.38, z1 + 0.18);
      const sp = cyl(g, "#3e4a60", cx, cz, 9.38, 12.05, 0.01, 4, side * 0.7);
      sp.rotation.y = Math.PI / 4;
      for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
        cyl(g, gilt, px, pz, 8.14, 9.72, 0.015, 6, 0.1);
        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), mat("#d9b45a"));
        finial.position.set(px, 9.78, pz); g.add(finial);
      }
      cyl(g, "#ffd166", cx, cz, 12.05, 12.55, 0.01, 8, 0.055);
      const weatherVane = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.4, 6), mat("#d9b45a"));
      weatherVane.position.set(cx, 12.72, cz); g.add(weatherVane);
      break;
    }
    case "parliament": {
      const stone = "#c8b99f", trim = "#e2d3b5", roofColor = "#46515a";
      box(g, stone, x, 0, z, x + w, 2.8, z + d);
      box(g, trim, x - 0.12, 2.75, z - 0.12, x + w + 0.12, 2.9, z + d + 0.12);
      for (let i = 0; i <= w; i += 1) {
        const px = x + i;
        box(g, trim, px - 0.035, 0.3, z + d - 0.08, px + 0.035, 2.78, z + d + 0.03);
        if (i % 2 === 1) {
          box(g, "#34434b", px - 0.25, 1.25, z + d + 0.02, px + 0.25, 2.38, z + d + 0.035);
          box(g, trim, px - 0.3, 2.37, z + d - 0.04, px + 0.3, 2.47, z + d + 0.05);
        }
      }
      // Repeated gables and slate roof give the riverfront a readable Gothic silhouette.
      for (let px = x + 0.5; px < x + w; px += 2.2) {
        const gable = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.05, 4), mat(trim));
        gable.position.set(px, 3.38, z + d - 0.02); gable.rotation.y = Math.PI / 4; g.add(gable);
      }
      roof(g, roofColor, x - 0.08, z - 0.08, x + w + 0.08, z + d + 0.08, 2.9, 0.65);
      for (const px of [x + 0.25, x + w - 0.65]) {
        box(g, stone, px, 0, z + 0.25, px + 0.65, 5.2, z + d - 0.25);
        for (let yy = 0.55; yy < 4.9; yy += 0.8) box(g, "#34434b", px + 0.2, yy, z + d + 0.025, px + 0.45, yy + 0.5, z + d + 0.04);
        box(g, trim, px - 0.12, 5.1, z + 0.12, px + 0.77, 5.3, z + d - 0.12);
        const pinnacle = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.1, 4), mat(roofColor));
        pinnacle.position.set(px + 0.32, 5.82, z + d / 2); pinnacle.rotation.y = Math.PI / 4; g.add(pinnacle);
      }
      break;
    }
    case "eye": {
      const eye = londonEye(x, z, w, d);
      bendAll(eye);
      g.add(eye);
      break;
    }
    case "st-pauls": {
      const limestone = "#d6c9b0", domeColor = "#617b76";
      box(g, limestone, x + 0.9, 0, z + 1.5, x + w - 0.9, 2.3, z + d - 1.4);
      box(g, "#eee4d0", x + 0.55, 0.15, z + d - 1.25, x + w - 0.55, 0.4, z + d - 0.85);
      // West portico with a full pediment and a proper colonnade.
      box(g, limestone, x + 1.6, 2.3, z + d - 1.5, x + w - 1.6, 3.1, z + d - 0.65);
      for (let px = x + 1.9; px <= x + w - 1.9; px += 0.72) cyl(g, "#e5dac5", px, z + d - 0.82, 0.4, 2.72, 0.18, 12);
      const pediment = new THREE.Mesh(new THREE.ConeGeometry(2.55, 1.1, 4), mat(limestone));
      pediment.position.set(cx, 3.62, z + d - 0.72); pediment.rotation.y = Math.PI / 4; pediment.scale.z = 0.32; g.add(pediment);
      // Broad lead-clad dome, segmented ribs and lantern drum.
      cyl(g, limestone, cx, cz, 2.3, 3.35, 2.45, 24);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.35, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat(domeColor));
      dome.position.set(cx, 3.35, cz); dome.castShadow = true; g.add(dome);
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6;
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 2.0, 6), mat("#aabbb0"));
        rib.position.set(cx + Math.cos(angle) * 1.65, 4.28, cz + Math.sin(angle) * 1.65);
        rib.rotation.z = -Math.cos(angle) * 0.48; rib.rotation.x = Math.sin(angle) * 0.48; g.add(rib);
      }
      cyl(g, limestone, cx, cz, 5.55, 6.45, 0.75, 16);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        box(g, "#34434b", cx + Math.cos(a) * 0.58 - 0.05, 5.72, cz + Math.sin(a) * 0.58 - 0.04, cx + Math.cos(a) * 0.58 + 0.05, 6.25, cz + Math.sin(a) * 0.58 + 0.04);
      }
      cyl(g, GOLDEN, cx, cz, 6.45, 6.75, 0.01, 8, 0.23);
      const cross = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.65, 6), mat(GOLDEN));
      cross.position.set(cx, 7.1, cz); g.add(cross);
      break;
    }
    case "shard": {
      // Faceted, tapering glass profile with a distinct crown and pale vertical mullions.
      const profile = new THREE.LatheGeometry([
        new THREE.Vector2(1.9, 0), new THREE.Vector2(1.65, 2.2), new THREE.Vector2(1.28, 5.1),
        new THREE.Vector2(0.92, 8.1), new THREE.Vector2(0.52, 10.8), new THREE.Vector2(0.14, 13.8), new THREE.Vector2(0.025, 15.2),
      ], 8);
      const glass = new THREE.Mesh(profile, mat("#78a8ba")); glass.position.set(cx, 0, cz); glass.rotation.y = Math.PI / 8; glass.castShadow = true; g.add(glass);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const mullion = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.09, 14.8, 5), mat("#c7d8d8"));
        mullion.position.set(cx + Math.cos(a) * 0.92, 7.4, cz + Math.sin(a) * 0.92);
        mullion.scale.set(0.55, 1, 0.55); g.add(mullion);
      }
      cyl(g, "#c8a869", cx, cz, 0, 0.5, 1.95, 8, 1.85);
      break;
    }
    case "gherkin": {
      const profile = new THREE.LatheGeometry([
        new THREE.Vector2(0.48, 0), new THREE.Vector2(0.9, 0.65), new THREE.Vector2(1.25, 1.7),
        new THREE.Vector2(1.5, 3.1), new THREE.Vector2(1.42, 4.25), new THREE.Vector2(1.05, 5.3), new THREE.Vector2(0.44, 6.1), new THREE.Vector2(0.08, 6.6),
      ], 24);
      const gk = new THREE.Mesh(profile, mat("#55839a")); gk.position.set(cx, 0, cz); gk.scale.set(1, 1, 0.86); gk.castShadow = true; g.add(gk);
      for (let level = 1; level < 8; level++) {
        const y = level * 0.73;
        const radius = Math.min(1.48, 0.6 + Math.sin((y / 6.6) * Math.PI) * 0.86);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 5, 32), mat("#b6c8c6"));
        ring.rotation.x = Math.PI / 2; ring.position.set(cx, y, cz); ring.scale.z = 0.86; g.add(ring);
      }
      for (let i = 0; i < 6; i++) {
        const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.035, 6.4, 5), mat("#bfd0cd"));
        const a = i * Math.PI / 3; fin.position.set(cx + Math.cos(a) * 0.72, 3.2, cz + Math.sin(a) * 0.62); g.add(fin);
      }
      break;
    }
    case "tower-bridge": {
      const stone = "#c9b99c", slate = "#52616b", waterBlue = "#7197a0";
      // Twin Gothic towers frame the road and keep the central span open.
      for (const zz of [z + 1, z + d - 1]) {
        box(g, stone, cx - 1.18, 0, zz - 0.58, cx + 1.18, 5.05, zz + 0.58);
        box(g, "#293a42", cx - 0.66, 0.1, zz + 0.59, cx + 0.66, 3.05, zz + 0.63);
        box(g, stone, cx - 0.82, 0, zz + 0.62, cx - 0.7, 3.2, zz + 0.69);
        box(g, stone, cx + 0.7, 0, zz + 0.62, cx + 0.82, 3.2, zz + 0.69);
        box(g, "#e0d3bc", cx - 1.3, 4.9, zz - 0.7, cx + 1.3, 5.15, zz + 0.7);
        box(g, slate, cx - 1.06, 5.15, zz - 0.62, cx + 1.06, 5.45, zz + 0.62);
        for (const px of [cx - 0.86, cx + 0.86]) {
          box(g, stone, px - 0.17, 5.35, zz - 0.16, px + 0.17, 6.2, zz + 0.16);
          const turret = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.62, 4), mat(slate));
          turret.position.set(px, 6.55, zz); turret.rotation.y = Math.PI / 4; g.add(turret);
        }
        for (const yy of [3.45, 4.05]) box(g, "#34434b", cx - 0.25, yy, zz + 0.62, cx + 0.25, yy + 0.38, zz + 0.68);
        box(g, "#e6d8bd", cx - 0.12, 0.5, zz + 0.65, cx + 0.12, 2.7, zz + 0.7);
      }
      box(g, slate, cx - 1.25, 4.52, z + 0.7, cx + 1.25, 4.86, z + d - 0.7);
      box(g, waterBlue, cx - 0.95, 4.22, z + 0.9, cx + 0.95, 4.42, z + d - 0.9);
      // Suspended approach beams and paired cables join the bridge towers.
      for (const side of [-1, 1]) {
        const rail = box(g, "#344d50", side < 0 ? x + 0.35 : x + w - 0.55, 3.4, z + 0.8, side < 0 ? x + 0.55 : x + w - 0.35, 3.55, z + d - 0.8);
        rail.rotation.x = 0;
        for (let zz = z + 1.2; zz < z + d - 0.8; zz += 0.7) box(g, "#687a78", side < 0 ? x + 0.4 : x + w - 0.5, 3.05, zz, side < 0 ? x + 0.48 : x + w - 0.42, 3.45, zz + 0.06);
      }
      break;
    }
    case "tower": {
      const stone = "#b49d7d", trim = "#ddc9a7";
      box(g, stone, x + 0.5, 0, z + 0.5, x + w - 0.5, 4.4, z + d - 0.5);
      for (const [dx, dz] of [[0.8, 0.8], [w - 0.8, 0.8], [0.8, d - 0.8], [w - 0.8, d - 0.8]]) {
        cyl(g, trim, x + dx, z + dz, 0, 4.75, 0.46, 12, 0.38);
        box(g, "#3a3431", x + dx - 0.14, 1.5, z + dz + 0.37, x + dx + 0.14, 2.55, z + dz + 0.42);
        box(g, "#3a3431", x + dx - 0.14, 3.1, z + dz + 0.37, x + dx + 0.14, 4.0, z + dz + 0.42);
      }
      for (const yy of [0.85, 2, 3.2, 4.45]) box(g, trim, x + 0.25, yy, z + 0.22, x + w - 0.25, yy + 0.12, z + d - 0.22);
      box(g, "#594d3d", x + 0.6, 4.55, z + 0.6, x + w - 0.6, 4.85, z + d - 0.6);
      for (let px = x + 0.65; px < x + w - 0.4; px += 0.55) box(g, trim, px, 4.8, z + 0.65, px + 0.16, 5.35, z + d - 0.65);
      break;
    }
    case "battersea": {
      box(g, "#a95e4b", x + 0.55, 0, z + 0.65, x + w - 0.55, 4.0, z + d - 0.65);
      box(g, "#d3b49b", x + 0.35, 0.25, z + 0.4, x + w - 0.35, 0.45, z + d - 0.4);
      for (const [dx, dz] of [[1, 1], [w - 1, 1], [1, d - 1], [w - 1, d - 1]]) {
        cyl(g, "#e6dfcf", x + dx, z + dz, 0, 7.2, 0.45, 16, 0.35);
        cyl(g, "#a95e4b", x + dx, z + dz, 6.75, 7.15, 0.48, 16, 0.38);
        cyl(g, "#69777a", x + dx, z + dz, 7.15, 7.45, 0.38, 12, 0.08);
        for (let yy = 1; yy < 4; yy += 0.8) box(g, "#34434b", x + dx - 0.16, yy, z + dz + 0.35, x + dx + 0.16, yy + 0.48, z + dz + 0.39);
      }
      for (const yy of [0.9, 2.1, 3.3]) box(g, "#d49b7e", x + 0.5, yy, z + d - 0.4, x + w - 0.5, yy + 0.09, z + d - 0.28);
      break;
    }
    case "tate": {
      box(g, "#8c4a3a", x, 0, z, x + w, 3.8, z + d);
      box(g, "#aa6652", x - 0.12, 3.75, z - 0.1, x + w + 0.12, 4.05, z + d + 0.1);
      for (let px = x + 0.5; px < x + w; px += 0.85) {
        box(g, "#34434b", px, 0.7, z + d + 0.015, px + 0.42, 1.6, z + d + 0.03);
        box(g, "#d6c7ae", px - 0.08, 1.62, z + d - 0.04, px + 0.5, 1.71, z + d + 0.05);
      }
      box(g, "#8c4a3a", cx - 0.65, 4.05, cz - 0.65, cx + 0.65, 8.2, cz + 0.65);
      box(g, "#34434b", cx - 0.25, 5, cz + 0.66, cx + 0.25, 6.2, cz + 0.7);
      box(g, "#aa6652", cx - 0.85, 8.1, cz - 0.85, cx + 0.85, 8.35, cz + 0.85);
      break;
    }
    case "palace": {
      const facade = "#e4d9c7", dark = "#34434b", trim = "#c5aa7d";
      box(g, facade, x + 0.5, 0, z + 0.7, x + w - 0.5, 3.3, z + d - 0.7);
      box(g, "#d3c5ae", x, 0, z + d - 0.75, x + w, 0.75, z + d);
      box(g, trim, x + 0.25, 0.52, z + d + 0.015, x + w - 0.25, 0.67, z + d + 0.05);
      for (let px = x + 0.65; px < x + w - 0.3; px += 0.8) {
        box(g, dark, px, 1.1, z + d + 0.025, px + 0.34, 2.25, z + d + 0.04);
        box(g, trim, px - 0.08, 2.23, z + d - 0.04, px + 0.42, 2.34, z + d + 0.05);
        box(g, "#e9e1d0", px + 0.15, 1.1, z + d + 0.045, px + 0.19, 2.25, z + d + 0.06);
      }
      box(g, "#b73236", cx - 0.35, 0.05, z + d + 0.035, cx + 0.35, 1.1, z + d + 0.05);
      box(g, trim, x + 0.25, 3.25, z + 0.45, x + w - 0.25, 3.45, z + d - 0.45);
      for (let px = x + 0.6; px < x + w - 0.4; px += 0.8) {
        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat(trim));
        finial.position.set(px, 3.67, cz); g.add(finial);
      }
      break;
    }
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
    w.userData.bikeWheel = true;
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

/** London double-decker, modelled in Blender (art/blender/bus.py); route blinds drawn here. */
let BUS_KIT: Promise<THREE.Object3D> | null = null;
function busModel(route: string) {
  const g = new THREE.Group();
  BUS_KIT ??= new GLTFLoader().loadAsync("/world3d/bus.glb").then((m) => m.scene);
  void BUS_KIT.then((kit) => {
    const body = kit.clone(true);
    bendAll(body);
    body.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    g.add(body);
  });
  // Model units: 2.8 long (front at +x), 0.66 wide, 1.14 tall.
  const blind = sign(`${route}  CITY`, { bg: "#101923", fg: "#ffd176", w: 0.36, h: 0.065, font: "bold 56px monospace" });
  blind.position.set(1.415, 0.63, 0); blind.rotation.y = Math.PI / 2; g.add(blind);
  const rear = sign(route, { bg: "#101923", fg: "#ffffff", w: 0.12, h: 0.07, font: "bold 64px sans-serif" });
  rear.position.set(-1.415, 0.66, -0.06); rear.rotation.y = -Math.PI / 2; g.add(rear);
  for (const side of [-1, 1]) {
    const s = sign(`${route}  LONDON`, { bg: "#101923", fg: "#ffd176", w: 0.42, h: 0.05, font: "bold 46px monospace" });
    s.position.set(0.7, 0.995, side * 0.337); s.rotation.y = side > 0 ? 0 : Math.PI; g.add(s);
  }
  g.scale.set(BUS_LENGTH / 2.8, 2.4, BUS_WIDTH / 0.66);
  return g;
}

// ── Indoors: rooms built from the tile map (walls, floors, furniture), cut away at the front ──
const TILE_MODEL: Record<string, string> = { d: "desk", c: "chairDesk", t: "table", o: "table", s: "loungeSofa", v: "kitchenFridgeLarge", k: "kitchenCabinet", F: "kitchenFridge", A: "desk", r: "kitchenBar", b: "bookcaseOpen", p: "plantSmall2", L: "lampSquareFloor" };
const FLOOR: Record<string, string> = { ".": "#ead9bb", m: "#dfe7f2", l: "#8e7ae0", ",": "#f2f1ee", e: "#b9ad96", X: "#ead9bb", "-": "#e9e1d0", _: "#ecd8a4" };

/** Compact office props share box geometry and are instanced with the scenery. */
function officeDesk(g: THREE.Group, x: number, z: number, width: number, accent: string) {
  box(g, "#eeeae0", x, 0.86, z, x + width, 0.98, z + 0.9);
  for (const leg of [x + 0.1, x + width - 0.18]) box(g, "#d2d7d8", leg, 0.08, z + 0.08, leg + 0.08, 0.86, z + 0.8);
  box(g, "#bdc6c7", x + 0.12, 0.1, z + 0.1, x + 0.65, 0.83, z + 0.77);
  for (const h of [0.35, 0.62]) box(g, "#687776", x + 0.3, h, z + 0.775, x + 0.48, h + 0.025, z + 0.795);
  const cx = x + width * 0.57;
  box(g, "#353e49", cx - 0.13, 0.98, z + 0.25, cx + 0.13, 1.02, z + 0.49);
  box(g, "#353e49", cx - 0.04, 1.02, z + 0.3, cx + 0.04, 1.25, z + 0.36);
  box(g, "#263441", cx - 0.38, 1.18, z + 0.27, cx + 0.38, 1.72, z + 0.35);
  box(g, "#8ac6d4", cx - 0.34, 1.22, z + 0.355, cx + 0.34, 1.68, z + 0.365);
  box(g, "#edf3ea", cx - 0.27, 1.28, z + 0.37, cx + 0.1, 1.58, z + 0.38);
  box(g, accent, cx - 0.27, 1.52, z + 0.385, cx + 0.1, 1.58, z + 0.39);
  box(g, "#35414b", cx - 0.3, 0.985, z + 0.58, cx + 0.3, 1.02, z + 0.77);
  box(g, "#35414b", x + width - 0.37, 0.98, z + 0.08, x + width - 0.13, 1.52, z + 0.51);
  // Notebook and a ceramic mug keep the desk recognisably lived in.
  box(g, accent, x + width * 0.25, 0.98, z + 0.55, x + width * 0.25 + 0.22, 1.025, z + 0.78);
  box(g, "#faf5e7", x + width * 0.25 + 0.01, 1.025, z + 0.56, x + width * 0.25 + 0.21, 1.035, z + 0.77);
  cyl(g, "#d6aa70", x + width - 0.18, z + 0.7, 0.98, 1.16, 0.075, 8);
}

function officeCabinet(g: THREE.Group, x: number, z: number) {
  box(g, "#99a9ad", x + 0.06, 0.08, z + 0.08, x + 0.94, 2.2, z + 0.86);
  box(g, "#becacc", x + 0.11, 0.18, z + 0.87, x + 0.89, 2.12, z + 0.91);
  for (const h of [1.68, 1.78, 1.88]) box(g, "#7b8d92", x + 0.24, h, z + 0.915, x + 0.76, h + 0.025, z + 0.925);
  box(g, "#e9e8d9", x + 0.4, 1.43, z + 0.915, x + 0.62, 1.55, z + 0.93);
  box(g, "#506369", x + 0.7, 0.9, z + 0.92, x + 0.74, 1.17, z + 0.96);
}

function heritageLamp(g: THREE.Group, x: number, z: number) {
  const iron = "#293d3c";
  box(g, iron, x + 0.34, 0.12, z + 0.34, x + 0.66, 0.38, z + 0.66);
  box(g, iron, x + 0.45, 0.38, z + 0.45, x + 0.55, 2.55, z + 0.55);
  box(g, iron, x + 0.27, 2.5, z + 0.27, x + 0.73, 2.58, z + 0.73);
  box(g, "#f3d99d", x + 0.32, 2.58, z + 0.32, x + 0.68, 3.05, z + 0.68);
  for (const dx of [0.28, 0.68]) for (const dz of [0.28, 0.68]) box(g, iron, x + dx, 2.57, z + dz, x + dx + 0.04, 3.08, z + dz + 0.04);
  box(g, iron, x + 0.23, 3.05, z + 0.23, x + 0.77, 3.15, z + 0.77);
  box(g, iron, x + 0.35, 3.15, z + 0.35, x + 0.65, 3.26, z + 0.65);
  box(g, iron, x + 0.47, 3.26, z + 0.47, x + 0.53, 3.42, z + 0.53);
}

function interior(world: THREE.Group, map: WorldMap, jobs: Promise<unknown>[], station: boolean) {
  const g = new THREE.Group();
  world.add(g);
  const rows = map.tiles;
  const H = rows.length;
  const Wd = rows[0].length;
  const furn = "dctosvkFArbpL";
  const home = map.kind === "home";
  const office = map.kind === "office";
  const hotel = map.id.startsWith("hotel-");
  const deskOffice = office && !["workplace-pizzazz", "workplace-tescow"].includes(map.id);
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
      if (map.id === "supermarket" && ch === "#" && x > 1 && x < Wd-2 && y > 1 && y < H-2) {
        box(g,"#e2e8ef",x,0,y,x+1,1.5,y+1);
        for(const shelf of [0.35,0.85,1.35]) {
          box(g,"#ffffff",x-0.02,shelf,y-0.03,x+1.02,shelf+0.06,y+1.03);
          for(let item=0;item<3;item++)box(g,["#e99a3b","#6ca962","#c94f58","#8e77bc"][(x+y+item)%4],x+0.08+item*0.3,shelf+0.07,y+0.06,x+0.29+item*0.3,shelf+0.3,y+0.32);
        }
        continue;
      }
      if (ch === "#" || ch === "W" || ch === "G") {
        // Back and side walls full height; the front wall is cut low so you can see in.
        const front = y >= H - 1 || (y > H / 2 && rows[y - 1]?.[x] !== "#" && rows[y + 1]?.[x] === undefined);
        const h = front ? 0.35 : ch === "G" ? 2.4 : 3;
        box(g, ch === "G" ? "#bfe0ef" : home ? "#f3e7d3" : station ? "#f6f2e8" : office ? "#e9e5dc" : "#eef0f4", x, 0, y, x + 1, h, y + 1);
        if (ch === "W") box(g, "#9fd2ef", x + 0.15, 1.1, y + 0.98, x + 0.85, 2.3, y + 1.02);
        if (!front) box(g, home ? "#d9c7a6" : "#c9ced8", x, 0, y + 0.98, x + 1, 0.25, y + 1.03);
        if (office && !front) {
          box(g, "#b4b2a9", x, 2.72, y + 0.98, x + 1, 2.8, y + 1.035);
          if (x % 3 === 0) box(g, "#c4c0b5", x + 0.04, 0.25, y + 0.99, x + 0.1, 2.72, y + 1.04);
        }
        continue;
      }
      if (station && y >= STATION_PLATFORM_Y + 3 && ch === "X") continue; // track pit
      const homeFloor = x < 5 && y >= 7 && y <= 10 ? ((x + y) % 2 ? "#a6b9b3" : "#c8d4ca") : x >= 14 && y < 6 ? "#d5d1c3" : x % 2 ? "#c5a37c" : "#b99772";
      box(g, home ? homeFloor : hotel ? (x>=8&&x<=12?"#95715b":(x+y)%2?"#d1c0a4":"#d9cbb5") : office ? ((x + y) % 2 ? "#555b60" : "#5c6267") : FLOOR[ch] ?? ((x + y) % 2 ? "#ead9bb" : "#e3d1b0"), x, -0.05, y, x + 1, (x + y) % 2 && !home ? 0.02 : 0.01, y + 1);
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
        if (hotel && map.id.endsWith("floor-1") && ch === "d" && x < 8) {
          jobs.push(place(g,"/world3d/furniture/bedDouble.glb",x+0.05,y+0.05,w-0.1,1.9));
        } else if (deskOffice && ch === "d") {
          for (let i = 0; i < w; i += 3) officeDesk(g, x + i + 0.05, y + 0.05, Math.min(3, w - i) - 0.1, map.accent ?? "#587e76");
        } else if (deskOffice && map.id.startsWith("workplace-") && ch === "v") {
          officeCabinet(g, x, y);
        } else if (deskOffice && ch === "F") {
          box(g, "#e5e5db", x + 0.15, 0.08, y + 0.12, x + 0.85, 1.4, y + 0.85);
          box(g, "#56626c", x + 0.29, 0.65, y + 0.855, x + 0.71, 1.13, y + 0.87);
          cyl(g, "#78b8d2", x + 0.5, y + 0.46, 1.4, 1.98, 0.25, 12);
          box(g, "#bc5954", x + 0.34, 1.1, y + 0.87, x + 0.42, 1.19, y + 0.94);
          box(g, "#598daf", x + 0.58, 1.1, y + 0.87, x + 0.66, 1.19, y + 0.94);
        } else if (deskOffice && ch === "k") {
          box(g, "#b8c3c3", x + 0.06, 0.1, y + 0.1, x + 0.94, 0.85, y + 0.88);
          box(g, "#eeeae0", x + 0.02, 0.85, y + 0.08, x + 0.98, 1.25, y + 0.92);
          box(g, "#35414a", x + 0.15, 1.08, y + 0.925, x + 0.85, 1.17, y + 0.94);
          box(g, "#59666e", x + 0.1, 1.25, y + 0.15, x + 0.9, 1.3, y + 0.8);
          box(g, "#faf8ee", x + 0.23, 1.3, y + 0.27, x + 0.77, 1.34, y + 0.7);
        } else if (deskOffice && ch === "c") {
          for (let i = 0; i < w; i++) {
            box(g, "#869394", x + i + 0.1, 0.55, y + 0.1, x + i + 0.9, 0.7, y + 0.86);
            box(g, "#647479", x + i + 0.1, 0.7, y + 0.72, x + i + 0.9, 1.48, y + 0.88);
            box(g, "#aab5b5", x + i + 0.45, 0.17, y + 0.42, x + i + 0.55, 0.55, y + 0.52);
            box(g, "#687779", x + i + 0.09, 0.13, y + 0.42, x + i + 0.91, 0.2, y + 0.52);
            box(g, "#687779", x + i + 0.45, 0.13, y + 0.08, x + i + 0.55, 0.2, y + 0.88);
            for (const edge of [0.06, 0.86]) box(g, "#536267", x + i + edge, 0.7, y + 0.25, x + i + edge + 0.08, 0.95, y + 0.7);
          }
        } else if (deskOffice && ch === "s") {
          box(g, "#40685f", x + 0.04, 0.3, y + 0.12, x + w - 0.04, 0.72, y + 0.86);
          box(g, "#32574f", x + 0.04, 0.65, y + 0.74, x + w - 0.04, 1.25, y + 0.94);
          for (const edge of [x + 0.04, x + w - 0.2]) box(g, "#32574f", edge, 0.6, y + 0.12, edge + 0.16, 1, y + 0.9);
          for (let i = 0; i < w; i++) box(g, "#6c9383", x + i + 0.22, 0.72, y + 0.19, x + i + 0.8, 0.78, y + 0.7);
        } else if (deskOffice && ch === "L") {
          box(g, "#6b746c", x + 0.25, 0.05, y + 0.25, x + 0.75, 0.12, y + 0.75);
          box(g, "#a28a63", x + 0.47, 0.12, y + 0.47, x + 0.53, 1.65, y + 0.53);
          box(g, "#e6d9ba", x + 0.2, 1.65, y + 0.2, x + 0.8, 2.08, y + 0.8);
        } else if (map.kind === "hospital" && ch === "d") {
          jobs.push(place(g, "/world3d/furniture/bedSingle.glb", x + 0.1, y + 0.05, w - 0.2, 1.9));
        } else if (map.kind === "prison" && ch === "b") {
          jobs.push(place(g, "/world3d/furniture/bedBunk.glb", x - 0.3, y - 1.5, 1.6, 2.4));
        } else if (deskOffice && ch === "b") {
          for (let i = 0; i < w; i++) {
            box(g, "#8a9b9e", x + i + 0.06, 0.08, y + 0.1, x + i + 0.94, 2.1, y + 0.83);
            for (const shelf of [0.55, 1.25]) {
              box(g, "#34474c", x + i + 0.13, shelf, y + 0.83, x + i + 0.87, shelf + 0.59, y + 0.84);
              for (let binder = 0; binder < 5; binder++) box(g, ["#749d91", "#d8bb7d", "#9699bb", "#c78572", "#c7cdb6"][binder], x + i + 0.17 + binder * 0.13, shelf + 0.04, y + 0.84, x + i + 0.27 + binder * 0.13, shelf + 0.52, y + 0.9);
            }
          }
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
      if (!f) continue;
      const furniture = homeFurniture(p, Number(map.art?.split("-")[1] ?? 0));
      bendAll(furniture);
      g.add(furniture);
    }
  if (hotel) {
    for (const portal of map.portals.filter(p=>p.id.startsWith("stairs-"))) {
      const x=portal.rect.x/TILE, z=portal.rect.y/TILE;
      for(let step=0;step<6;step++) box(g,"#c7b69a",x,0.03,z-2+step/3,x+2,1.05-step*0.15,z-2+(step+1)/3);
      for(const edge of [x,x+1.95]) {
        for(let step=0;step<6;step++) box(g,"#354b46",edge,0.1,z-2+step/3,edge+0.05,1.75-step*0.15,z-1.95+step/3);
      }
      const board=sign(portal.label,{bg:map.accent,fg:"#f6ead0",w:2.3,h:0.32});
      board.position.set(x+1,2.1,z-1.8);g.add(board);
    }
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
    // Split platform doors slide apart over a dark doorway, with inset glass.
    for (const side of [-1, 1]) {
      box(g, "#192536", x0 + 2.45, 0.4, side * 0.81 - 0.015, x0 + 3.55, 2.25, side * 0.81 + 0.015);
      for (const direction of [-1, 1]) {
        const door = new THREE.Group();
        door.position.x = x0 + 3 + direction * 0.26;
        door.userData = { slidingDoor: true, restX: door.position.x, direction };
        box(door, "#e63b38", -0.25, 0.45, side * 0.84 - 0.025, 0.25, 2.25, side * 0.84 + 0.025);
        box(door, "#8dc5d8", -0.17, 1.35, side * 0.88 - 0.01, 0.17, 2.02, side * 0.88 + 0.01);
        g.add(door);
      }
    }
    box(g, "#c8d3df", x0 + 0.12, 2.4, -0.7, x0 + 5.88, 2.56, 0.7);
    for (const axle of [1, 5]) for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.12, 12), new THREE.MeshStandardMaterial({color: "#293449", roughness: 0.65}));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x0 + axle, 0.2, side * 0.58);
      g.add(wheel);
    }
    box(g, "#2a2733", x0, 0.05, -0.6, x0 + 6, 0.3, 0.6);
  }
  box(g, "#d72a22", 24.2, 0.3, -0.75, 25.4, 2.4, 0.75);
  box(g, "#1c2430", 25.2, 1.2, -0.55, 25.42, 2.1, 0.55);
  for (const z of [-0.5, 0.5]) box(g, "#fff5c4", 25.4, 0.75, z - 0.1, 25.45, 0.95, z + 0.1);
  return g;
}

export function World3D({
  map,
  getMe,
  getOthers,
  avatar,
  badge = null,
  username = "player",
  affiliation = null,
  car,
  bike = null,
  ads = [],
  nearPortal,
  getPolice,
  onGround,
  onUnavailable,
  getHomeAction,
  overview = false,
  quality = "auto",
  immersive = false,
}: {
  map: WorldMap;
  getMe: () => { x: number; y: number; walking: boolean; heading?: number; speed?: number };
  getOthers: () => Mover3D[];
  avatar: Avatar;
  badge?: string | null;
  username?: string;
  affiliation?: WorldAffiliation | null;
  car: string | null;
  /** Colour of the hire bike you're riding, if any. */
  bike?: string | null;
  /** Real hackathons and tech events for the billboards. */
  ads?: TechEvent[];
  onUnavailable?:()=>void;
  getHomeAction?: () => HomeAction | null;
  overview?: boolean;
  quality?: VisualQuality;
  immersive?: boolean;
  getPolice?: () => Pursuit | null;
  nearPortal: () => Portal | null;
  onGround?: (x: number, y: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const news = useCityNews();
  const newsRef = useRef(news.headlines);
  newsRef.current = news.headlines;
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const sceneRef = useRef<THREE.Scene | null>(null);
  const carRef = useRef(car);
  carRef.current = car;
  const bikeRef = useRef(bike);
  bikeRef.current = bike;
  const avatarKey = JSON.stringify(avatar);
  const identityKey = JSON.stringify({ badge, username, affiliation });

  const immersiveRef = useRef(immersive);
  immersiveRef.current = immersive;
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const highland = map.art === "highlands";
    const london = map.art === "london";
    const indoors = !london && !highland && map.kind !== "campus";
    const station = map.kind === "station";
    BEND.value.set(indoors ? 0 : 0.0055, indoors ? 0 : 0.0012);
    let renderer: THREE.WebGLRenderer;
    try{renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });}catch{onUnavailable?.();return;}
    const contextLost=(e:Event)=>{e.preventDefault();onUnavailable?.();};
    renderer.domElement.addEventListener("webglcontextlost",contextLost);
    const mobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
    // Keep high-DPI Windows screens from multiplying the GPU workload by four.
    const budget = graphicsBudget(quality === "low", mobile);
    const visual = visualProfile(quality,mobile,window.devicePixelRatio||1);
    renderer.setPixelRatio(visual.pixelRatio);
    renderer.shadowMap.enabled = visual.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const sky = highland ? "#bfe3ff" : "#d6e4df";
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.Fog(sky, 34, 70);
    // Outdoor fog is fully opaque by 70 units; don't draw hidden city blocks
    // out to 200 units behind it. Interiors have no fog and retain more range.
    const camera = new THREE.PerspectiveCamera(30, 1, 0.5, indoors ? 120 : 80);

    // ?time=day|dusk|night previews the lighting; otherwise it follows UK time.
    const forced = new URLSearchParams(window.location.search).get("time");
    let phase = forced === "day" || forced === "dusk" || forced === "night" ? forced : ukPhase();
    const hemi = new THREE.HemisphereLight(phase === "night" ? "#b2c5e0" : phase === "dusk" ? "#f5d3b0" : "#fff4db", phase === "night" ? "#455a57" : "#8e9d7d", phase === "night" ? 1.45 : 1.7);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(phase === "night" ? "#a7b9d2" : phase === "dusk" ? "#ffc89a" : "#fff6e6", phase === "night" ? 0.45 : 1.25);
    sun.castShadow = visual.shadows;
    sun.shadow.mapSize.set(visual.shadowSize, visual.shadowSize);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
    sun.shadow.bias = -0.00035;
    sun.shadow.normalBias = .025;
    sun.shadow.radius = 4;
    scene.add(sun, sun.target);
    if (phase !== "day" && !indoors) {
      const atmosphere=phase==="night"?"#17293f":"#d6b1a0";
      scene.background = new THREE.Color(atmosphere);
      scene.fog = new THREE.Fog(atmosphere, 32, 66);
    }
    if (indoors) {
      scene.background = new THREE.Color(map.kind === "home" ? "#e7dfd0" : "#1d1a2b");
      scene.fog = null;
      // Electric indoor lighting stays warm and legible after sunset.
      hemi.color.set("#fff8ec");
      hemi.groundColor.set("#b8b5ab");
      sun.color.set("#fff5df");
      hemi.intensity = 1.9;
      sun.intensity = 1.2;
    }

    let presentation: ReturnType<typeof cinematicRenderer>;
    try { presentation=cinematicRenderer(renderer,scene,camera,visual); }
    catch { presentation={render:()=>renderer.render(scene,camera),resize:()=>{},dispose:()=>{}}; }

    // ── Build the world ──
    const world = new THREE.Group();
    scene.add(world);
    const tiles = map.tiles;
    let disposeGroundStyle=()=>{};
    let disposeArchitecture=()=>{};
    const stationHoles=new Set<string>();
    if(london) for(const thing of buildLondon().things) if(thing.kind==="station")
      for(let y=thing.y;y<thing.y+thing.h;y++) for(let x=thing.x;x<thing.x+thing.w;x++) stationHoles.add(`${x},${y}`);
    if (!indoors) {
      const ground=groundMesh(tiles, highland,stationHoles);
      const disposeTexture=london?applyGroundStyle(ground):()=>{};
      disposeGroundStyle=()=>{disposeTexture();ground.material.dispose();};
      world.add(ground);
    }
    const signals = london ? streetSignals(world) : [];
    if (!indoors) {
      // A landscaped apron keeps the following camera above scenery at the edge.
      box(world, "#63765b", -40, -0.7, -40, map.cols + 40, -0.35, map.rows + 40);
      // Align the low perimeter wall with the existing impassable world bounds.
      const edges = [[-0.18, -0.18, map.cols + 0.18, 0], [-0.18, map.rows, map.cols + 0.18, map.rows + 0.18], [-0.18, 0, 0, map.rows], [map.cols, 0, map.cols + 0.18, map.rows]];
      for (const [x0, z0, x1, z1] of edges) {
        box(world, "#776b60", x0, 0, z0, x1, 0.65, z1);
        box(world, "#c9bea5", x0 - 0.03, 0.65, z0 - 0.03, x1 + 0.03, 0.74, z1 + 0.03);
      }
    }
    if (london) world.add(roadMarkings(map));
    updateStreetSignals(signals, Date.now());
    const river=riverSurface(phase,map.cols,map.rows);
    const water = new THREE.Mesh(riverGeometry(tiles), river.material);
    bend(water.material);
    water.position.set(0, -0.3, 0);
    world.add(water);

    const spinners: THREE.Object3D[] = [];
    const lamps: THREE.Vector3[] = [];
    const jobs: Promise<unknown>[] = [];
    if (indoors) {
      interior(world, map, jobs, station);
      if (map.kind === "home") {
        const style = Number(map.art?.split("-")[1] ?? 0);
        const wall = ["#e5dac9", "#b7c8bb", "#b49c8a", "#a9bda4", "#4c6063"][style % 5];
        box(world, wall, 1, 0.25, 1.92, 19, 3.1, 2.0);
        box(world, "#d9c5a1", 1, 2.96, 1.96, 19, 3.08, 2.06);
        for (const x of [3, 10, 16]) {
          box(world, "#29444a", x, 1.2, 2.03, x + 2, 2.65, 2.1);
          box(world, "#a9cfce", x + 0.08, 1.28, 2.1, x + 1.92, 2.57, 2.12);
          box(world, "#f2e6d0", x + 0.97, 1.2, 2.13, x + 1.03, 2.65, 2.17);
          box(world, "#f2e6d0", x, 1.88, 2.13, x + 2, 1.94, 2.17);
        }
      }
      if (station) {
        const ty = STATION_PLATFORM_Y + 3;
        box(world, "#2a2733", 1, -0.45, ty, map.cols - 1, -0.05, map.rows - 1);
        box(world, "#b8bcc8", 1, -0.05, ty + 0.9, map.cols - 1, 0, ty + 1.0);
        box(world, "#b8bcc8", 1, -0.05, ty + 2.0, map.cols - 1, 0, ty + 2.1);
        box(world, "#ffd400", 1, 0.02, ty - 0.35, map.cols - 1, 0.04, ty - 0.2);
        const board = sign("1 Revision line", { bg: "#141418", fg: "#ffd400", w: 3, h: 0.4, font: "bold 64px monospace" });
        board.position.set(map.cols - 5, 3.4, 8.2);
        world.add(board);
        const name = sign(map.name.replace(/ station$/, ""), { bg: "#ffffff", fg: "#13203a", w: 5, h: 0.7, badge: true });
        name.position.set(map.cols / 2, 2.3, 1.02);
        world.add(name);
        // You've just stepped off: start with the train standing at the platform.
        if (TRAIN_CALL.at < 0) TRAIN_CALL.at = performance.now() - 6500;
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
      for (const [index, st] of map.structures.entries()) {
        const g = new THREE.Group();
        world.add(g);
        const front = st.y + st.h;
        const stone = ["#e8dfcc", "#d4ddd7", "#ddd5c9"][index % 3];
        box(g, stone, st.x, 0, st.y, st.x + st.w, 3.2, front);
        box(g, ARCH.ink, st.x, 0.12, front - 0.05, st.x + st.w, 0.38, front + 0.03);
        box(g, "#253e3c", st.x - 0.05, 2.6, front - 0.05, st.x + st.w + 0.05, 3.3, front + 0.05);
        box(g, ARCH.brass, st.x - 0.06, 2.55, front, st.x + st.w + 0.06, 2.62, front + 0.08);
        box(g, ARCH.stone, st.x - 0.08, 3.3, st.y - 0.08, st.x + st.w + 0.08, 3.46, front + 0.08);
        box(g, st.accent, st.x + 0.3, 3.47, front - 0.18, st.x + 2.1, 3.55, front + 0.04);
        for (let i = 0; i < st.w - 1; i += 1.5) facadeWindow(g, st.x + 0.4 + i, 1.2, front, 0.7, 1.0);
        entrance(g, st.x + st.w / 2, front + 0.04, "#253e3c", 1.3);
        architecturalPlanter(g, st.x + 0.55, front - 0.25);
        if (index % 2 === 0) artFrontage(g, st.x, front + 0.09, st.w, index % 3);
        const sg = sign(st.label, { bg: "#253e3c", fg: "#fff3d8", w: Math.min(st.w - 0.4, 5), h: 0.55, logo: st.companyId ?? null });
        sg.position.set(st.x + st.w / 2, 2.95, st.y + st.h + 0.07);
        g.add(sg);
      }
      if(map.id === "universities") {
        for(const st of map.structures)for(let i=0;i<4;i++) {
          const column=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.2,2.3,12),mat("#f7f1e6"));
          column.position.set(st.x+1.4+i*2.8,1.15,st.y+st.h-0.3);world.add(column);
        }
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
          if (!t.companyId && !t.id.startsWith("hotel-") && t.style !== "terrace" && t.w >= 5 && (t.x + t.y) % 3 === 0) {
            artFrontage(g, t.x, t.y + t.h + 0.1, t.w, Math.floor((t.x + t.y) / 3) % 3);
          }
          const co = t.companyId ? COMPANIES.find((c) => c.id === t.companyId) : null;
          if (co) {
            const sg = sign(co.name, { bg: co.accent, fg: "#13203a", w: Math.min(t.w - 0.4, 4), h: 0.4, logo: co.id });
            sg.position.set(t.x + t.w / 2, 1.73, t.y + t.h + (co.building === "cinema" ? 0.3 : 0.04));
            g.add(sg);
          }
        }
        else if (t.kind === "landmark") {
          landmark(g, t);
          g.traverse((c) => c.userData.spin && spinners.push(c));
        } else if (t.kind === "tree") {
          // Rounded planted trees are supplied in one shared scenery batch below.
        }
        else if (t.kind === "lamp") {
          heritageLamp(g, t.x, t.y);
          lamps.push(new THREE.Vector3(t.x + 0.5, 2, t.y + 0.5));
        } else if (t.kind === "phonebox") {
          telephoneBox(g, t.x, t.y);
        } else if (t.kind === "postbox") cyl(g, "#c8322d", t.x + 0.5, t.y + 0.5, 0.1, 1.15, 0.24, 14);
        else if (t.kind === "bench") {
          for (let slat = 0; slat < 3; slat++) box(g, "#b18b60", t.x + 0.05, 0.35, t.y + 0.4 + slat * 0.1, t.x + 0.95, 0.43, t.y + 0.48 + slat * 0.1);
          box(g, "#b18b60", t.x + 0.05, 0.43, t.y + 0.35, t.x + 0.95, 0.75, t.y + 0.4);
          for (const leg of [0.15, 0.8]) box(g, "#263e3b", t.x + leg, 0.1, t.y + 0.36, t.x + leg + 0.06, 0.6, t.y + 0.7);
          for (const edge of [0.07, 0.87]) {
            box(g, "#263e3b", t.x + edge, 0.4, t.y + 0.45, t.x + edge + 0.05, 0.69, t.y + 0.51);
            box(g, "#263e3b", t.x + edge, 0.65, t.y + 0.38, t.x + edge + 0.05, 0.71, t.y + 0.73);
          }
        } else if (t.kind === "busstop") {
          box(g, "#263e3b", t.x - 0.1, 1.9, t.y + 0.25, t.x + 1.1, 2, t.y + 0.75);
          box(g, ARCH.brass, t.x - 0.1, 1.86, t.y + 0.73, t.x + 1.1, 1.91, t.y + 0.77);
          box(g, "#cfe6ef", t.x - 0.05, 0.4, t.y + 0.25, t.x + 1.05, 1.8, t.y + 0.3);
          box(g, "#2a2730", t.x - 0.1, 0.1, t.y + 0.25, t.x - 0.05, 1.9, t.y + 0.75);
          box(g, "#2a2730", t.x + 1.05, 0.1, t.y + 0.25, t.x + 1.1, 1.9, t.y + 0.75);
        } else if (t.kind === "station") {
          box(g,"#273735",t.x+0.12,-1.4,t.y+0.12,t.x+t.w-0.12,-1.2,t.y+t.h);
          for(let tread=0;tread<8;tread++) {
            const z=t.y+0.18+tread*(t.h-0.18)/8;
            const top=-1.1+tread*0.17;
            box(g,tread%2?"#c8bca5":"#d4c7af",t.x+0.35,-1.35,z,t.x+t.w-0.35,top,z+(t.h-0.18)/8);
            box(g,"#e6d9bf",t.x+0.35,top-0.035,z+(t.h-0.18)/8-0.035,t.x+t.w-0.35,top,z+(t.h-0.18)/8);
          }
          for(const side of [t.x+0.05,t.x+t.w-0.25]) box(g,"#b6a68a",side,-1.4,t.y,side+0.2,0.2,t.y+t.h);
          box(g,"#b6a68a",t.x,-1.4,t.y,t.x+t.w,0.2,t.y+0.2);
          const st = L.stations.find((x) => x.id === t.id);
          const nm = sign(st?.name ?? t.name, { bg: "#ffffff", fg: "#13203a", w: t.w + 0.4, h: 0.5, badge: true });
          nm.position.set(t.x + t.w / 2, 1.15, t.y + 0.22);
          g.add(nm);
          const hex = cyl(g, "#2b5fd9", t.x + t.w + 0.35, t.y + t.h + 0.3, 2.6, 2.66, 0.42, 6);
          hex.rotation.x = Math.PI / 2;
          cyl(g, "#2a2730", t.x + t.w + 0.35, t.y + t.h + 0.3, 0.1, 2.6, 0.05, 8);
          // Stone piers and iron railings frame the existing walk-in entrance.
          // Everything stays inside the station footprint, away from the portal.
          for (const edge of [t.x + 0.15, t.x + t.w - 0.35]) {
            box(g, "#d6c9af", edge - 0.09, 0.1, t.y + 0.3, edge + 0.29, 0.32, t.y + t.h - 0.08);
            for (let dz = 0.5; dz < t.h - 0.1; dz += 0.4) box(g, "#293d3c", edge + 0.06, 0.3, t.y + dz, edge + 0.12, 1.12, t.y + dz + 0.06);
            box(g, "#293d3c", edge + 0.03, 1.08, t.y + 0.3, edge + 0.15, 1.17, t.y + t.h - 0.08);
          }
        }
      }
    }
    const newsroom = london ? buildLondon().things.find(t => t.kind === "building" && !t.companyId && t.w >= 6 && t.height >= 3) : null;
    const broadcastCanvas = document.createElement("canvas");
    broadcastCanvas.width = 768; broadcastCanvas.height = 384;
    const broadcastTexture = new THREE.CanvasTexture(broadcastCanvas);
    broadcastTexture.colorSpace = THREE.SRGBColorSpace;
    const broadcastMaterial = new THREE.MeshBasicMaterial({ map: broadcastTexture, toneMapped: false });
    if (newsroom && newsroom.kind === "building") {
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(6, newsroom.w - 0.4), 3), broadcastMaterial);
      screen.position.set(newsroom.x + newsroom.w / 2, 3.2, newsroom.y + newsroom.h + 0.12);
      bend(broadcastMaterial); world.add(screen);
    }
    let nextBroadcast = 0;
    let nextWeather = 0;
    const precipitationGeometry = new THREE.BufferGeometry();
    const precipitationPositions = new Float32Array(180 * 3);
    precipitationGeometry.setAttribute("position", new THREE.BufferAttribute(precipitationPositions, 3));
    const precipitationMaterial = new THREE.PointsMaterial({ color: "#dce9ee", size: 0.055, transparent: true, opacity: 0.65, depthWrite: false });
    const precipitation = new THREE.Points(precipitationGeometry, precipitationMaterial);
    precipitation.frustumCulled = false; precipitation.visible = false;
    scene.add(precipitation);
    let weatherKind = "Sunny";
    const streetscape=london?addStreetscape(world,map,phase):null;
    if(streetscape) {
      bendAll(streetscape);
      streetscape.traverse(object=>{if((object as THREE.Mesh).isMesh){object.castShadow=false;object.receiveShadow=false;}});
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
    // A fixed pool lights nearby lamps without adding a shader light for every
    // street in the city. The visible lamp models remain in the scenery.
    const lampLights = lamps.slice(0, budget.lights).map(() => {
      const light = new THREE.PointLight("#ffcc88", phase === "night" ? 6 : 2, 7, 1.6);
      scene.add(light);
      return light;
    });
    let nextLampUpdate = 0;

    if (map.id === "study-lobby") learningLobby(world, map);

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
    let ambientBuilds: Promise<void> = Promise.resolve();
    const bodies = new Set<Body>();
    interface Body {
      root: THREE.Group;
      char: Character3D | null;
      walking: boolean;
      dispose: () => void;
    }
    const makeBody = (a: Avatar, logo: string | null = null, ambient = false): Body => {
      const root = new THREE.Group();
      let removed = false;
      const b: Body = { root, char: null, walking: false, dispose: () => {
        if (removed) return;
        removed = true;
        bodies.delete(b);
        root.removeFromParent();
        if (b.char) { b.char.dispose(); b.char = null; }
        shadow.geometry.dispose(); shadow.material.dispose(); root.clear();
      } };
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.18 }));
      bend(shadow.material);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.14;
      root.add(shadow);
      bodies.add(b);
      const loadBody = async () => {
        if (disposed || removed) return;
        const c = await buildCharacter(a, 1.15, logo);
        if (disposed || removed) { c.dispose(); return; }
        bendAll(c.object);
        c.object.position.y = 0.12;
        root.add(c.object);
        b.char = c;
        c.play(b.walking ? "walk" : "idle");
      };
      // Player/remote models load immediately. Decorative residents build one
      // at a time between input/paint opportunities instead of freezing one frame.
      if (ambient) ambientBuilds = ambientBuilds.then(() => new Promise<void>(resolve => setTimeout(resolve, 8))).then(loadBody).catch(() => {});
      else void loadBody().catch(() => { /* Keep the shadow if an asset fails. */ });
      return b;
    };
    const setWalking = (b: Body, on: boolean) => {
      if (b.walking === on) return;
      b.walking = on;
      b.char?.play(on ? "walk" : "idle");
    };

    let disposed = false;
    const me = makeBody(JSON.parse(avatarKey) as Avatar, badge);
    // Keep your character recognisable in crowds and behind tall buildings.
    const playerRing = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.47, 32), new THREE.MeshBasicMaterial({ color: "#62e5ff", transparent: true, opacity: 0.85, depthTest: false, depthWrite: false }));
    playerRing.rotation.x = -Math.PI / 2;
    playerRing.renderOrder = 1000;
    const playerLabel = makeNameplate(username, affiliation, true);
    el.appendChild(playerLabel);
    scene.add(playerRing);
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

    const others = new Map<string, Body & { x: number; z: number; lookKey: string; label: HTMLDivElement }>();
    const homeScreens: THREE.Mesh[] = [];
    world.traverse(object => { if (object.userData.homeScreen) homeScreens.push(object as THREE.Mesh); });
    const homeProps = new THREE.Group();
    scene.add(homeProps);
    const held = box(homeProps, "#e2c598", -0.12, 0.75, 0.3, 0.12, 0.86, 0.54);
    const droplets = Array.from({ length: 12 }, () => {
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), mat("#93d1e0"));
      homeProps.add(drop); return drop;
    });
    homeProps.visible = false;
    const otherCars = new Map<string, { model: string; root: THREE.Group }>();

    // Traffic: buses and Kenney cars driving the road loops on the left.
    const L = london ? buildLondon() : null;
    const traffic: { obj: THREE.Group; route: number; at: number; distance: number; speed: number; velocity?: number; commuter?: { body: Body; offset: number } }[] = [];
    if (L) {
      const kinds = ["bus", "taxi", "sedan", "bus", "van", "delivery"];
      kinds.forEach((k, i) => {
        const route = i % 3;
        const g = new THREE.Group();
        if (k === "bus") {
          const b = busModel(BUS_ROUTE_CODES[route]);
          g.add(b);
          g.userData.label = BUS_ROUTE_CODES[route];
        } else void placeCar(g, k);
        scene.add(g);
        traffic.push({ obj: g, route, at: (i * 0.173) % 1, distance: 0, speed: [2.6, 2.8, 2.5][route] });
      });
      for (const coach of COACHES.slice(0, 1)) {
        const obj=coachModel(coach.id);bendAll(obj);scene.add(obj);
        traffic.push({obj,route:coach.route,at:coach.at,distance:0,speed:2.4});
      }
    }
    const paths = L ? L.routes.map(route => { const first = route[0], last = route[route.length - 1]; return first[0] === last[0] && first[1] === last[1] ? route : [...route, first]; }) : [];
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

    // Local ambient residents: not connected players. Keep the city lively, not crowded.
    const residentLimit = map.kind === "home" ? 0 : Math.min(budget.residents, london || highland || map.kind === "station" || map.id === "study-lobby" ? 14 : 10);
    const npcs = residentPaths(map, residentLimit).filter(path=>map.kind !== "prison" || path.x0<25&&path.x1<25).map((path, i) => {
      const body = makeBody(map.kind === "prison" ? {...npcLook(i),...PRISON_LOOK} : npcLook(i), null, true);
      const speech = speechMark(); body.root.add(speech);
      scene.add(body.root);
      return {
        body,
        speech,
        path,
        offset: i * 3.71,
        knockedUntil: 0,
        greetUntil: 0,
        nextGreeting: 10_000 + ((i * 7919) % 24_000),
        greetingPoint: new THREE.Vector3(),
        greeting: false,
        talkUntil: 0,
        nextConversation: 8_000 + ((i * 6073) % 18_000),
        talkPoint: new THREE.Vector3(),
        talkTarget: new THREE.Vector3(),
        talkingAnimation: false,
      };
    });
    const crossingNpcs = london ? crossingPedestrianPoses(Date.now()).map((pose, i) => {
      const body = makeBody(npcLook(90 + i)); scene.add(body.root);
      return { id: pose.id, body };
    }) : [];
    const cyclists = L ? Array.from({ length: budget.cyclists }, (_, i) => {
      const body = makeBody(npcLook(i + 30), null, true);
      const bike = lymeBike(["#4cd137", "#2b5fd9", "#a65cdb", "#ed8b3b"][i % 4]);
      bendAll(bike);
      scene.add(body.root, bike);
      return { body, bike, route: i % paths.length, at: i * 0.217, distance: 0, moving: false };
    }) : [];
    if (L) for (let i = 0; i < 2; i++) {
      const obj = new THREE.Group();
      void placeCar(obj, ["sedan", "suv", "taxi"][i]);
      const body = makeBody(npcLook(40 + i), null, true);
      scene.add(obj, body.root);
      traffic.push({ obj, route: i, at: 0.12 + i * 0.19, distance: 0, speed: 2.1, commuter: { body, offset: i * 13 } });
    }

    const trafficPose = (v: typeof traffic[number]) => {
      const q = pointAt(v.route, v.distance), length = Math.hypot(q.dx, q.dz) || 1;
      return { ...q, x: q.x + q.dz / length * ROAD_LANE_OFFSET, z: q.z - q.dx / length * ROAD_LANE_OFFSET };
    };
    const cyclistPose = (c: typeof cyclists[number]) => {
      const q = pointAt(c.route, c.distance), length = Math.hypot(q.dx, q.dz) || 1;
      return { ...q, x: q.x + q.dz / length * ROAD_LANE_OFFSET, z: q.z - q.dx / length * ROAD_LANE_OFFSET };
    };
    const bicycleLength = 1.7, bicycleWidth = .65;
    const parked: TrafficVehicle[] = [];
    traffic.forEach((v, i) => {
      v.distance = v.at * lengths[v.route];
      for (let attempt = 0; attempt < 100; attempt++) {
        const q = trafficPose(v), length = v.obj.userData.coach ? COACH_LENGTH : v.obj.userData.label ? BUS_LENGTH : CAR_LENGTH;
        if (!parked.some(other => Math.hypot(other.x - q.x, other.y - q.z) < (length + (other.length ?? CAR_LENGTH)) / 2 + .8)) {
          parked.push({ id: `ambient-${i}`, x: q.x, y: q.z, heading: Math.atan2(q.dz, q.dx), length }); break;
        }
        v.distance += .9;
      }
    });

    cyclists.forEach((c, i) => {
      c.distance = c.at * lengths[c.route];
      for (let attempt = 0; attempt < 100; attempt++) {
        const q = cyclistPose(c);
        if (!parked.some(other => Math.hypot(other.x - q.x, other.y - q.z) < (bicycleLength + (other.length ?? CAR_LENGTH)) / 2 + .8)) {
          parked.push({ id: `cyclist-${i}`, x: q.x, y: q.z, heading: Math.atan2(q.dz, q.dx), length: bicycleLength, width: bicycleWidth }); break;
        }
        c.distance += .9;
      }
    });

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
        if (!n.body.root.visible) continue;
        const d = Math.hypot(n.body.root.position.x - p.x / TILE, n.body.root.position.z - p.y / TILE);
        if (d < bd) [best, bd] = [n, d];
      }
      if (best) {
        best.knockedUntil = now + 2600;
        best.body.char?.play("die");
      }
    };
    window.addEventListener("illuminated:fight", onFight);

    // A responding car and its officers are tied to the actual pursuit simulation.
    const responseCar = new THREE.Group();
    let wasTased = false;
    const responders = london || highland ? [makeBody({...npcLook(51),top:"top-suit",topColor:"topcol-navy",hat:"hat-cap"}),makeBody({...npcLook(52),top:"top-suit",topColor:"topcol-navy",hat:"hat-cap"})] : [];
    if (london || highland) {
      void placeCar(responseCar, "police");
      box(responseCar,"#2b5fd9",-0.4,1.4,-0.42,0.05,1.56,0.42);
      box(responseCar,"#e04a3f",0.05,1.4,-0.42,0.5,1.56,0.42);
      scene.add(responseCar,...responders.map(b=>b.root));
    }
    const carLast = new THREE.Vector3();
    const guardBodies = map.kind === "prison" ? [makeBody({...npcLook(53),top:"top-suit",topColor:"topcol-navy",hat:"hat-cap"}),makeBody({...npcLook(54),top:"top-suit",topColor:"topcol-navy",hat:"hat-cap"})] : [];
    guardBodies.forEach(b=>scene.add(b.root));
    if(map.kind === "prison") for(const portal of map.portals.filter(p=>p.to.kind === "prison"&&p.to.action === "talk")) {
      const person=makeBody({...npcLook(portal.id === "inmate-sam"?57:58),...PRISON_LOOK});
      person.root.position.set(portal.rect.x/TILE+0.5,0,portal.rect.y/TILE+0.5);
      scene.add(person.root);
    }

    for(const [i,portal] of map.portals.filter(p=>p.to.kind === "university").entries()) {
      const body=makeBody(npcLook(60+i));
      const x=(portal.rect.x+portal.rect.w/2)/TILE,z=portal.rect.y/TILE-0.5;
      body.root.position.set(x,0,z);scene.add(body.root);
      const caption=sign(["Subject guide","Events ambassador","Networking mentor"][i%3],{bg:"#ffffff",fg:"#13203a",w:2.5,h:0.35});
      caption.position.set(x,1.9,z);world.add(caption);
      box(world,["#b7d8f1","#d8c7f2","#bce0bd"][i%3],x-1,0,z-1.3,x+1,0.65,z-0.7);
    }
    let guideIndex = 0;
    for (const portal of map.portals) {
      if (portal.to.kind !== "guide" && portal.to.kind !== "bank") continue;
      const role = portal.to.kind === "bank" ? "Bank adviser" : portal.to.guide === "careers" ? "Careers adviser" : portal.to.guide === "study" ? "Study mentor" : "Station staff";
      const body = makeBody(npcLook(72 + guideIndex), null, true);
      const x = (portal.rect.x + portal.rect.w / 2) / TILE;
      const z = portal.rect.y / TILE - 0.65;
      body.root.position.set(x, 0, z);
      body.char?.play("wave");
      scene.add(body.root);
      const caption = sign(role, { bg: "#f8f2e5", fg: "#17233a", w: 2.25, h: 0.34 });
      caption.position.set(x, 1.95, z);
      world.add(caption);
      guideIndex++;
    }
    if(map.id === "city") {
      const gate=map.portals.find(p=>p.id === "universities");
      if(gate){const x=gate.rect.x/TILE,z=gate.rect.y/TILE;for(const dx of [-0.3,2.3])box(world,"#d6c8b3",x+dx,0,z-0.5,x+dx+0.2,2.6,z);
      const board=sign("University Quarter",{bg:"#7153b9",fg:"#ffffff",w:3.1,h:0.45});board.position.set(x+1.1,2.5,z);world.add(board);}
    }
    // Ground selection belongs only to the furniture editor overview.
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);
    const onClick = (e: MouseEvent) => {
      if (!overview || !onGround) return;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, hit) && hit.x >= 0 && hit.z >= 0 && hit.x <= map.cols && hit.z <= map.rows) onGround(hit.x * TILE, hit.z * TILE);
    };
    renderer.domElement.addEventListener("click", onClick);
    const onWheel = (event:WheelEvent) => {
      if(overview) return;
      // Chrome sends trackpad pinch gestures as Ctrl+wheel. Keep browser-page
      // zoom from shrinking the HUD; pinch and wheel both zoom only the scene.
      event.preventDefault();
      setZoom(value=>Math.max(0.75,Math.min(1.65,value*Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*0.0018))));
    };
    renderer.domElement.addEventListener("wheel",onWheel,{passive:false});

    let viewportWidth = el.clientWidth, viewportHeight = el.clientHeight;
    const fit = () => {
      const w = viewportWidth = el.clientWidth;
      const h = viewportHeight = el.clientHeight;
      renderer.setSize(w, h, false);
      presentation.resize(w,h);
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
    const projectedPoint = new THREE.Vector3();
    const lightingColour = new THREE.Color();
    let first = true;
    let cameraZoom = zoomRef.current;
    let raf = 0;
    let last = performance.now();
    const start = last;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = motionPreference.matches;
    const motionChanged = () => {reduce=motionPreference.matches;};
    motionPreference.addEventListener("change",motionChanged);
    const renderDue = frameBudget(60);
    const frame = (now: number) => {
      if (document.hidden) {
        last = now;
        raf = requestAnimationFrame(frame);
        return;
      }
      if (!renderDue(now)) { raf = requestAnimationFrame(frame); return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const secs = (now - start) / 1000;
      if (newsroom && now >= nextBroadcast) {
        nextBroadcast = now + (reduce ? 8_000 : 250);
        const ctx = broadcastCanvas.getContext("2d")!;
        ctx.fillStyle = "#11283a"; ctx.fillRect(0, 0, 768, 384);
        ctx.fillStyle = "#be343e"; ctx.fillRect(0, 0, 768, 68);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 30px sans-serif";
        ctx.fillText("ILLUMINATED CITY · NEWSROOM", 24, 45);
        const headlines = newsRef.current;
        const headline = headlines[Math.floor(now / 12_000) % Math.max(1, headlines.length)];
        ctx.font = "bold 29px sans-serif";
        const words = (headline?.title ?? "Welcome to IlluminatED City. Explore offices, learn skills and meet other players.").split(" ");
        let line = "", y = 125;
        for (const word of words) {
          if (ctx.measureText(`${line} ${word}`).width > 710) { ctx.fillText(line, 24, y); y += 42; line = word; } else line += `${line ? " " : ""}${word}`;
        }
        ctx.fillText(line, 24, y);
        ctx.fillStyle = "#f2d9a6"; ctx.font = "22px sans-serif";
        ctx.fillText(headline ? "Source: GOV.UK · Open city broadcast for full story" : "CITY ANNOUNCEMENT", 24, 330);
        ctx.fillStyle = "#55c3a2";
        ctx.fillRect(0, 372, reduce ? 768 : (now % 12_000) / 12_000 * 768, 12);
        broadcastTexture.needsUpdate = true;
      }
      const p = getMe();
      const mx = p.x / TILE;
      const mz = p.y / TILE;
      if (!indoors) {
        phase = forced === "day" || forced === "dusk" || forced === "night" ? forced : ukPhase();
        const blend = 1 - Math.exp(-dt * 1.5);
        const night = phase === "night", dusk = phase === "dusk";
        const atmosphere = night ? "#17293f" : dusk ? "#d6b1a0" : sky;
        (scene.background as THREE.Color).lerp(lightingColour.set(atmosphere), blend);
        if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(scene.background as THREE.Color);
        hemi.color.lerp(lightingColour.set(night ? "#b2c5e0" : dusk ? "#f5d3b0" : "#fff4db"), blend);
        hemi.groundColor.lerp(lightingColour.set(night ? "#455a57" : "#8e9d7d"), blend);
        sun.color.lerp(lightingColour.set(night ? "#a7b9d2" : dusk ? "#ffc89a" : "#fff6e6"), blend);
        const strength = night ? 0.45 : dusk ? 0.8 : ["Sunny", "Bright"].includes(weatherKind) ? 1.25 : 0.75;
        sun.intensity += (strength - sun.intensity) * blend;
        lampLights.forEach(light => { light.intensity += ((night ? 6 : dusk ? 2 : 0) - light.intensity) * blend; });
        river.material.color.lerp(lightingColour.set(night ? "#63848b" : "#a3c7bf"), blend);
      }
      if (!indoors && now >= nextWeather) {
        nextWeather = now + 10_000;
        weatherKind = weatherAt(new Date()).kind;
        precipitation.visible = !reduce && ["Light rain", "Drizzle", "Snow"].includes(weatherKind);
        precipitationMaterial.size = weatherKind === "Snow" ? 0.09 : 0.045;
        sun.intensity = phase === "night" ? 0.45 : ["Sunny", "Bright"].includes(weatherKind) ? 1.25 : 0.75;
        if (scene.fog instanceof THREE.Fog) { scene.fog.near = weatherKind === "Fog" ? 18 : 34; scene.fog.far = weatherKind === "Fog" ? 46 : 70; }
      }
      if (precipitation.visible) {
        const speed = weatherKind === "Snow" ? 1.2 : 8;
        // Keep every drop well below and in front of the close camera: a drop
        // next to the lens renders as a huge pale square that washes out the view.
        const top = Math.max(2.5, Math.min(12, camera.position.y - 3));
        for (let i = 0; i < 180; i++) {
          precipitationPositions[i * 3] = mx + ((i * 7.13 + secs * 0.4) % 24) - 12;
          precipitationPositions[i * 3 + 1] = top - ((secs * speed + i * 0.37) % top);
          precipitationPositions[i * 3 + 2] = mz + ((i * 3.71) % 18) - 13;
        }
        precipitationGeometry.attributes.position.needsUpdate = true;
      }
      if (lampLights.length && now >= nextLampUpdate) {
        nextLampUpdate = now + 500;
        const nearest = [...lamps].sort((a, b) =>
          (a.x - mx) ** 2 + (a.z - mz) ** 2 - ((b.x - mx) ** 2 + (b.z - mz) ** 2));
        lampLights.forEach((light, i) => light.position.copy(nearest[i]));
      }
      // Face the way you're going.
      const dx = mx - lastMe.x;
      const dz = mz - lastMe.z;
      if (Math.hypot(dx, dz) > 0.002) {
        const ang = Math.atan2(dx, dz);
        const difference = Math.atan2(Math.sin(ang - me.root.rotation.y), Math.cos(ang - me.root.rotation.y));
        me.root.rotation.y += difference * (1 - Math.exp(-dt * 18));
      }
      // Heading belongs to the car, so reversing never makes its body flip around.
      if (p.heading !== undefined) carHolder.rotation.y = -p.heading;
      else if (Math.hypot(dx, dz) > 0.002) carHolder.rotation.y = Math.atan2(-dz, dx);
      lastMe.set(mx, 0, mz);
      me.root.position.set(mx, 0, mz);
      me.root.rotation.x = 0;
      carHolder.position.set(mx, 0.08, mz);
      if (performance.now() > swingUntil) {
        if (swingUntil) {
          swingUntil = 0;
          me.walking = !p.walking;
        }
        setWalking(me, p.walking && !bikeRef.current);
      }
      // Swap your character for your car when driving.
      const want = carRef.current;
      if (want !== carLoaded) {
        carLoaded = want;
        carHolder.clear();
        if (want) {
          const model = new THREE.Group();
          carHolder.add(model);
          void placeCar(model, want === "cab" ? "taxi" : want);
        }
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

      // Keep outdoor gameplay centred on the player, including at map edges.
      if (first) {
        focus.set(mx, 0, mz);
        first = false;
      }
      const followed = followPlayerCamera(focus, { x: mx, z: mz }, dt);
      focus.set(followed.x, 0, followed.z);
      cameraZoom += (zoomRef.current-cameraZoom)*(1-Math.exp(-dt*10));
      const framing = frameMapCamera(focus.x, focus.z, map.cols, map.rows, camera.aspect, indoors, { x: mx, z: mz }, cameraZoom, true);
      FOCUS.value.set(framing.x, 0, framing.z);
      camera.position.set(framing.x, framing.height, framing.z + framing.distance);
      camera.lookAt(framing.x, framing.target, framing.z);
      const motion=immersiveMotion(secs,p.walking,p.speed??0,immersiveRef.current&&!overview,reduce);
      camera.position.y+=motion.rise;camera.rotation.z+=motion.bank;
      if (overview) {
        const fit = Math.max(1, 1.25 / camera.aspect);
        camera.fov = 35;
        camera.updateProjectionMatrix();
        camera.position.set(map.cols / 2 + 8 * fit, 22 * fit, map.rows / 2 + 20 * fit);
        camera.lookAt(map.cols / 2, 0, map.rows / 2);
        me.root.visible = !!getHomeAction?.();
        playerRing.visible = false;
        rings.forEach(ring => { ring.visible = false; });
      }
      playerRing.position.set(mx, 0.18, mz);
      playerRing.scale.setScalar(want ? 2.6 : 1);
      camera.updateMatrixWorld();
      const screen = projectedPoint.set(mx, want ? 2.3 : 1.5, mz).project(camera);
      const sx = (screen.x + 1) * viewportWidth / 2;
      const sy = (1 - screen.y) * viewportHeight / 2;
      playerLabel.style.left = `${Math.max(42, Math.min(viewportWidth - 42, sx))}px`;
      playerLabel.style.top = `${Math.max(120, Math.min(viewportHeight - 170, sy))}px`;
      playerLabel.style.transform = "translate(-50%, -100%)";
      playerLabel.style.visibility = overview || getHomeAction?.() ? "hidden" : "visible";
      sun.position.set(focus.x - 10, 22, focus.z + 12);
      sun.target.position.copy(focus);

      // Other players.
      const seen = new Set<string>();
      for (const o of getOthers()) {
        seen.add(o.id);
        let b = others.get(o.id);
        const lookKey = JSON.stringify([o.avatar,o.badge,o.username,o.affiliation]);
        if (b && b.lookKey !== lookKey) { b.dispose(); b.label.remove(); others.delete(o.id); b = undefined; }
        if (!b) {
          const label = makeNameplate(o.username ?? "player", o.affiliation);
          el.appendChild(label);
          b = Object.assign(makeBody(o.avatar, o.badge ?? null), { x: o.x / TILE, z: o.y / TILE, lookKey, label });
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
        b.root.visible = !o.car;
        const labelPoint = projectedPoint.set(b.x, 1.5, b.z).project(camera);
        const labelX = (labelPoint.x + 1) * viewportWidth / 2;
        const labelY = (1 - labelPoint.y) * viewportHeight / 2;
        b.label.style.left = `${labelX}px`; b.label.style.top = `${labelY}px`;
        b.label.style.visibility = labelPoint.z < 1 && labelX > 0 && labelX < viewportWidth && labelY > 0 && labelY < viewportHeight && !overview && !getHomeAction?.() ? "visible" : "hidden";
        let vehicle = otherCars.get(o.id);
        if (vehicle && vehicle.model !== o.car) {
          scene.remove(vehicle.root);
          otherCars.delete(o.id);
          vehicle = undefined;
        }
        if (o.car && !vehicle) {
          const root = new THREE.Group();
          vehicle = { model: o.car, root };
          otherCars.set(o.id, vehicle);
          scene.add(root);
          void placeCar(root, o.car === "cab" ? "taxi" : o.car).catch(() => {});
        }
        if (vehicle) {
          vehicle.root.position.set(b.x, 0.08, b.z);
          vehicle.root.rotation.y = -(o.heading ?? 0);
        }
        setWalking(b, o.walking || Math.hypot(ddx, ddz) > 0.05);
      }
      for (const [id, b] of others)
        if (!seen.has(id)) {
          b.dispose();
          b.label.remove();
          const vehicle = otherCars.get(id);
          if (vehicle) scene.remove(vehicle.root);
          otherCars.delete(id);
          others.delete(id);
        }

      const pursuit = getPolice?.();
      const tased = pursuit?.stage === "tased";
      if (tased && !wasTased) me.char?.play("die");
      if (!tased && wasTased) me.char?.play("idle");
      wasTased = Boolean(tased);
      responseCar.visible = !!pursuit && (london || highland);
      if (pursuit && (london || highland)) {
        const cx=pursuit.car.x/TILE, cz=pursuit.car.y/TILE;
        if(Math.hypot(cx-carLast.x,cz-carLast.z)>0.01)responseCar.rotation.y=Math.atan2(-(cz-carLast.z),cx-carLast.x);
        responseCar.position.set(cx,0.05,cz); carLast.set(cx,0,cz);
      }
      responders.forEach((body,i)=>{
        const officer=pursuit?.officers[i];
        body.root.visible=!!officer;
        if(officer){
          const ox=officer.x/TILE,oz=officer.y/TILE;
          body.root.rotation.y=Math.atan2(mx-ox,mz-oz);
          body.root.position.set(ox,0,oz);
          setWalking(body,pursuit?.stage === "chasing");
        }
      });
      const patrols=prisonGuardPositions(Date.now()/1000);
      guardBodies.forEach((body,i)=>{const p=patrols[i];body.root.position.set(p.x/TILE,0,p.y/TILE);body.root.rotation.y=p.angle;setWalking(body,!reduce);});

      // Traffic obeys the visible signal phase and queues behind cars and
      // crossing pedestrians. Accumulated distance prevents post-red jumps.
      const roadTime = Date.now();
      updateStreetSignals(signals, roadTime);
      const crossingWalkers = london ? crossingPedestrianPoses(roadTime) : [];
      const currentTraffic: TrafficVehicle[] = traffic.map((v, i) => {
        const q = trafficPose(v);
        return { id: `ambient-${i}`, x: q.x, y: q.z, heading: Math.atan2(q.dz, q.dx), length: v.obj.userData.coach ? COACH_LENGTH : v.obj.userData.label ? BUS_LENGTH : CAR_LENGTH, width: v.obj.userData.coach ? COACH_WIDTH : v.obj.userData.label ? BUS_WIDTH : CAR_WIDTH };
      });
      cyclists.forEach((c, i) => {
        const q = cyclistPose(c);
        currentTraffic.push({ id: `cyclist-${i}`, x: q.x, y: q.z, heading: Math.atan2(q.dz, q.dx), length: bicycleLength, width: bicycleWidth });
      });
      if (PLAYER_VEHICLE.active) currentTraffic.push({ id: "player", x: PLAYER_VEHICLE.x / TILE, y: PLAYER_VEHICLE.y / TILE, heading: PLAYER_VEHICLE.heading, speed: PLAYER_VEHICLE.speed / TILE });
      const pedestrians = [...NPC_SPOTS.map(p => ({ x: p.x / TILE, y: p.y / TILE })), ...crossingWalkers.map(p => ({ x: p.x, y: p.y }))];
      if (!PLAYER_VEHICLE.active) pedestrians.push({ x: PLAYER.x / TILE, y: PLAYER.y / TILE });
      let ti = 0;
      for (const [i, v] of traffic.entries()) {
        const commuter = v.commuter ? commuterPhase(reduce ? 0 : secs, v.commuter.offset) : null;
        const own = currentTraffic[i];
        const step = reduce || commuter?.out ? 0 : trafficMoveDistance(own, dt * v.speed, roadTime, currentTraffic, pedestrians);
        const advance=trafficAdvance(v.velocity??0,v.speed,dt,step);
        v.velocity=advance.speed;
        v.distance += advance.distance;
        const q = trafficPose(v), len = Math.hypot(q.dx, q.dz) || 1;
        v.obj.position.set(q.x, .02, q.z);
        own.x = q.x; own.y = q.z; own.heading = Math.atan2(q.dz, q.dx);
        if (v.commuter && commuter) {
          const driver = v.commuter.body;
          const kerb = .65 + commuter.stroll * .65;
          const x = q.x + q.dz / len * kerb, z = q.z - q.dx / len * kerb;
          driver.root.visible = commuter.out && !blocked(map, x * TILE, z * TILE);
          driver.root.position.set(x, .12, z);
          driver.root.rotation.y = Math.atan2(q.dz, -q.dx) + (commuter.stroll > 0 && !commuter.walking ? Math.PI / 2 : 0);
          setWalking(driver, commuter.walking && !reduce);
        }
        v.obj.rotation.y = Math.atan2(-q.dz, q.dx);
        const horiz = Math.abs(q.dx) > Math.abs(q.dz);
        const long = (v.obj.userData.coach ? COACH_LENGTH : v.obj.userData.label ? BUS_LENGTH : CAR_LENGTH) * TILE;
        const wide = (v.obj.userData.coach ? COACH_WIDTH : v.obj.userData.label ? BUS_WIDTH : CAR_WIDTH) * TILE;
        TRAFFIC_BOXES[ti++] = { x: q.x * TILE, y: q.z * TILE, hw: (horiz ? long : wide) / 2, hh: (horiz ? wide : long) / 2, dx: Math.sign(q.dx), dy: Math.sign(q.dz), speed: dt ? step * TILE / dt : 0 };
      }
      NPC_SPOTS.length = 0;
      const onlineCount = seen.size;
      npcs.forEach((n, i) => {
        if (n.body.root.visible) NPC_SPOTS.push({ x: n.body.root.position.x * TILE, y: n.body.root.position.z * TILE });
        if (n.knockedUntil > now) { n.speech.visible = false; return; }
        if (n.knockedUntil) { n.knockedUntil = 0; n.body.walking = false; }
        const pose = residentPose(n.path, reduce ? 0 : secs, n.offset);
        n.body.root.visible = i < Math.max(4, residentLimit - onlineCount);
        if (!n.body.root.visible) { n.speech.visible = false; return; }

        // Local crowd AI: greet a nearby player at a natural pause, face them,
        // and then return to the resident's route. It is deterministic and runs
        // in the existing frame loop, so it adds no network or model latency.
        if (n.greetUntil > now) {
          n.body.root.position.copy(n.greetingPoint);
          let target = me.root.position;
          let closest = n.body.root.position.distanceToSquared(target);
          for (const player of others.values()) {
            const distance = n.body.root.position.distanceToSquared(player.root.position);
            if (distance < closest) { closest = distance; target = player.root.position; }
          }
          n.body.root.rotation.y = Math.atan2(target.x - n.greetingPoint.x, target.z - n.greetingPoint.z);
          n.speech.visible = true;
          const frame = Math.floor(now / 300) % 3;
          n.speech.material.map = speechTextures?.[frame] ?? null;
          n.speech.position.y = 1.85 + Math.sin(secs * 5 + i) * 0.035;
          setWalking(n.body, false);
          if (!n.greeting) { n.greeting = true; n.body.char?.play("emote-yes"); }
          return;
        }
        if (n.greeting) {
          n.greeting = false;
          n.body.char?.play("idle");
        }
        n.speech.visible = false;
        n.body.root.position.set(pose.x, 0, pose.z);
        n.body.root.rotation.y = pose.angle;
        setWalking(n.body, pose.walking && !reduce);
        if (n.talkUntil > now) {
          n.body.root.position.copy(n.talkPoint);
          n.body.root.rotation.y = Math.atan2(n.talkTarget.x - n.talkPoint.x, n.talkTarget.z - n.talkPoint.z);
          n.speech.visible = true;
          const frame = Math.floor(now / 300) % 3;
          n.speech.material.map = speechTextures?.[frame] ?? null;
          n.speech.position.y = 1.85 + Math.sin(secs * 5 + i) * 0.035;
          setWalking(n.body, false);
          const gesture = Math.floor(now / 1150 + i) % 3 === 0;
          if (gesture !== n.talkingAnimation) {
            n.talkingAnimation = gesture;
            n.body.char?.play(gesture ? "emote-yes" : "idle");
          }
          return;
        } else if (n.talkingAnimation) {
          n.talkingAnimation = false;
          n.body.char?.play("idle");
        }
        if (!pose.walking && now >= n.nextConversation) {
          const partnerIndex = npcs.findIndex((other, otherIndex) => otherIndex > i && other.body.root.visible && other.talkUntil <= now && other.greetUntil <= now && other.body.root.position.distanceToSquared(n.body.root.position) < 5.2 * 5.2);
          if (partnerIndex >= 0) {
            const partner = npcs[partnerIndex];
            const duration = 3_200 + ((i * 337 + partnerIndex * 131) % 2_600);
            n.talkPoint.copy(n.body.root.position); n.talkTarget.copy(partner.body.root.position);
            partner.talkPoint.copy(partner.body.root.position); partner.talkTarget.copy(n.body.root.position);
            n.talkUntil = partner.talkUntil = now + duration;
            n.nextConversation = partner.nextConversation = now + 18_000 + ((i * 941 + partnerIndex * 283) % 16_000);
            n.body.root.position.copy(n.talkPoint); partner.body.root.position.copy(partner.talkPoint);
          } else n.nextConversation = now + 3_000 + ((i * 271) % 3_500);
        }
        if (!pose.walking && now >= n.nextGreeting) {
          let target = me.root.position;
          let closest = n.body.root.position.distanceToSquared(target);
          for (const player of others.values()) {
            const distance = n.body.root.position.distanceToSquared(player.root.position);
            if (distance < closest) { closest = distance; target = player.root.position; }
          }
          if (closest < 3.8 * 3.8) {
            n.greetingPoint.copy(n.body.root.position);
            n.greetUntil = now + 1_700;
            n.nextGreeting = now + 18_000 + ((i * 421) % 12_000);
            n.greeting = false;
          } else {
            n.nextGreeting = now + 4_000;
          }
        }
      });
      crossingNpcs.forEach((n, i) => {
        const pose = crossingWalkers[i];
        n.body.root.position.set(pose.x, .12, pose.y);
        n.body.root.rotation.y = Math.PI / 2 - pose.heading;
        setWalking(n.body, pose.walking && !reduce);
        NPC_SPOTS.push({ x: pose.x * TILE, y: pose.y * TILE });
      });
      for (const [i, c] of cyclists.entries()) {
        const own = currentTraffic[traffic.length + i];
        const step = reduce ? 0 : trafficMoveDistance(own, dt * 1.8, roadTime, currentTraffic, pedestrians);
        c.distance += step;
        c.moving = step > .0001;
        const q = cyclistPose(c);
        own.x = q.x; own.y = q.z; own.heading = Math.atan2(q.dz, q.dx);
        c.bike.position.set(q.x, .12, q.z);
        c.bike.rotation.y = Math.atan2(-q.dz, q.dx);
        c.body.root.position.set(q.x, .42, q.z);
        c.body.root.rotation.y = Math.atan2(q.dx, q.dz);
        const horizontal = Math.abs(q.dx) > Math.abs(q.dz);
        TRAFFIC_BOXES[ti++] = { x: q.x * TILE, y: q.z * TILE, hw: (horizontal ? bicycleLength : bicycleWidth) * TILE / 2, hh: (horizontal ? bicycleWidth : bicycleLength) * TILE / 2, dx: Math.sign(q.dx), dy: Math.sign(q.dz), speed: dt ? step * TILE / dt : 0 };
      }
      TRAFFIC_BOXES.length = ti;

      for (const s of spinners) {
        if (s.userData.train) {
          const train = trainFrame(now - TRAIN_CALL.at, map.cols);
          s.position.x = train.x;
          s.visible = train.visible;
          for (const door of s.children.filter(child => child.userData.slidingDoor)) {
            door.position.x = door.userData.restX + door.userData.direction * train.doorOpen * 0.48;
          }
        } else if (typeof s.userData.update === "function") s.userData.update(reduce ? 0 : secs);
        else s.rotation.z += dt * 0.05;
      }
      const near = nearPortal();
      for (const r of rings) {
        const on = near?.id === r.userData.portal;
        r.scale.setScalar(on ? 1.5 + Math.sin(secs * 6) * 0.08 : 1 + Math.sin(secs * 2 + r.position.x) * 0.06);
      }
      water.position.y = -0.3 + Math.sin(secs * 0.8) * 0.02;
      if(!reduce) river.texture.offset.x=secs*0.002;
      // Animate nearby visible bodies only; distant residents still follow their routes.
      for (const body of bodies) if (body.char && body.root.visible && (body === me || body.root.position.distanceToSquared(me.root.position) < 28 * 28)) body.char.update(dt, reduce);
      const seatRider = (body: Body, cycle: THREE.Group, heading: number, moving: boolean, phase: number) => {
        if (!body.char) return;
        body.char.play("drive");
        // Apply a gentle pedal motion over the seated driving pose after animation updates.
        for (const [name, side] of [["leg-left", 1], ["leg-right", -1]] as const) {
          const leg = body.char.object.getObjectByName(name);
          if (leg && moving) leg.rotateX(Math.sin(phase) * 0.22 * side);
        }
        body.root.rotation.y = heading;
        body.root.position.set(cycle.position.x - Math.sin(heading) * 0.19, 0, cycle.position.z - Math.cos(heading) * 0.19);
        body.root.updateMatrixWorld(true);
        const hip = body.char.object.getObjectByName("torso");
        if (hip) body.root.position.y += cycle.position.y + 0.66 - hip.getWorldPosition(new THREE.Vector3()).y;
        cycle.traverse(o => { if (o.userData.bikeWheel) o.rotation.z = moving ? -phase : o.rotation.z; });
      };
      if (rideBike && riding) seatRider(me, rideBike, me.root.rotation.y, p.walking, secs * 8);
      else if (me.char && now > swingUntil && !getHomeAction?.()) me.char.play(p.walking ? "walk" : "idle");
      const homeAction = getHomeAction?.();
      playerRing.visible = !overview && !homeAction;
      for (const screen of homeScreens) {
        const watching = homeAction?.animation === "watch" || homeAction?.animation === "play";
        (screen.material as THREE.MeshLambertMaterial).color.set(watching ? ["#5d9ca9", "#92b870", "#bb9169", "#997ab7"][Math.floor(now / 1200) % 4] : "#609ca4");
      }
      homeProps.visible = !!homeAction;
      if (homeAction) {
        const a = homeAction;
        const time = reduce ? 0 : (now - a.started) / 1000;
        const seated = ["sit", "watch", "read", "play", "eat"].includes(a.animation);
        const sleeping = a.animation === "sleep";
        const washing = a.animation === "shower" || a.animation === "wash";
        const seat = a.seat;
        me.char?.play(seated ? "drive" : "idle");
        me.root.position.set(a.x + a.w / 2, sleeping ? 1.0 : seated ? 0.3 : 0, a.y + (sleeping ? a.h * 0.45 : washing ? a.h * 0.55 : a.h + 0.25));
        if (a.animation === "sit" || seat) {
          const s = seat ?? a;
          me.root.position.set(s.x + s.w / 2, 0.45, s.y + s.h * 0.65);
        }
        me.root.rotation.set(sleeping ? -Math.PI / 2 : 0, sleeping ? Math.PI / 2 : Math.PI, 0);
        homeProps.position.copy(me.root.position);
        homeProps.rotation.y = Math.PI;
        held.visible = ["eat", "read", "play", "water"].includes(a.animation);
        held.position.y = 0.9 + Math.sin(time * 4) * 0.12;
        for (const [i, drop] of droplets.entries()) {
          drop.visible = washing || sleeping || a.animation === "water";
          drop.position.set(Math.sin(i * 2.4) * 0.4, washing ? 2.1 - (time * 1.5 + i * 0.13) % 1.8 : 0.5 + (time * 0.3 + i * 0.1) % 0.8, Math.cos(i * 2.4) * 0.35);
        }
        if (me.char && ["eat", "wash", "water", "play", "read"].includes(a.animation)) {
          for (const name of ["arm-left", "arm-right"]) {
            const arm = me.char.object.getObjectByName(name);
            if (arm) arm.rotation.x = -0.7 + Math.sin(time * 4) * 0.3;
          }
        }
      }
      for (const c of cyclists) seatRider(c.body, c.bike, c.body.root.rotation.y, c.moving, secs * 8 + c.at * 10);
      presentation.render();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // Share repeated geometry instead of expanding every copy into vertex buffers.
    // Spatial batches retain useful frustum culling across the city.
    void Promise.allSettled(jobs).then(async () => {
      if (disposed) return;
      if(london) disposeArchitecture=finishArchitecture(world,phase);
      world.updateMatrixWorld(true);
      const groups = new Map<string, THREE.Mesh[]>();
      world.traverse((o) => {
        const m = o as THREE.Mesh;
        if(m.isMesh&&m.castShadow)m.customDepthMaterial=CURVED_DEPTH;
        if (!m.isMesh || m === water || m.userData.homeScreen || rings.includes(m) || (m as unknown as THREE.SkinnedMesh).isSkinnedMesh || Array.isArray(m.material)) return;
        let spin = false;
        for (let a: THREE.Object3D | null = m; a; a = a.parent) if (a.userData.spin || a.userData.train) spin = true;
        if (spin || m.geometry.attributes.color) return;
        // These scenery meshes never move. Keep their baked world transforms
        // instead of rebuilding thousands of matrices on every render.
        m.updateMatrixWorld(true);
        m.matrixAutoUpdate = false;
        m.matrixWorldAutoUpdate = false;
        const position = new THREE.Vector3().setFromMatrixPosition(m.matrixWorld);
        const key = `${m.geometry.uuid}:${m.material.uuid}:${Math.floor(position.x / 16)}:${Math.floor(position.z / 16)}`;
        const list = groups.get(key) ?? [];
        list.push(m);
        groups.set(key, list);
      });
      let batchStart = performance.now();
      for (const meshes of groups.values()) {
        if (disposed) return;
        if (meshes.length > 1) {
          const mesh = new THREE.InstancedMesh(meshes[0].geometry, meshes[0].material, meshes.length);
          meshes.forEach((source, i) => {
            mesh.setMatrixAt(i, source.matrixWorld);
            source.parent?.remove(source);
          });
          mesh.castShadow=meshes[0].castShadow;mesh.receiveShadow=meshes[0].receiveShadow;mesh.customDepthMaterial=CURVED_DEPTH;
          mesh.computeBoundingSphere();
          mesh.matrixAutoUpdate = false;
          mesh.matrixWorldAutoUpdate = false;
          scene.add(mesh);
        }
        if (performance.now() - batchStart > 4) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          batchStart = performance.now();
        }
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      disposed = true;
      for (const body of bodies) body.dispose();
      for (const vehicle of traffic) if (vehicle.obj.userData.coach) vehicle.obj.userData.dispose();
      TRAFFIC_BOXES.length = 0;
      NPC_SPOTS.length = 0;
      ro.disconnect();
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("wheel",onWheel);
      window.removeEventListener("illuminated:fight", onFight);
      renderer.domElement.removeEventListener("webglcontextlost",contextLost);
      presentation.dispose();
      motionPreference.removeEventListener("change",motionChanged);
      sun.shadow.map?.dispose();
      renderer.dispose();
      broadcastTexture.dispose(); broadcastMaterial.dispose();
      precipitationGeometry.dispose(); precipitationMaterial.dispose();
      river.dispose();
      disposeGroundStyle();
      disposeArchitecture();
      streetscape?.userData.dispose?.();
      for (const spinner of spinners) spinner.userData.dispose?.();
      renderer.forceContextLoss();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (o instanceof THREE.InstancedMesh) o.dispose();
        if (m.isMesh && m.geometry !== BOX) m.geometry.dispose();
      });
      playerLabel.remove();
      for (const other of others.values()) { other.label.remove(); other.dispose(); }
      el.removeChild(renderer.domElement);
    };
    // getMe/getOthers/getPolice/nearPortal/onGround are stable refs from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, avatarKey, overview, identityKey, quality]);

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

  return <><div ref={host} className="absolute inset-0" aria-label={`${map.name} in 3D`} role="img" />{!overview&&<div className="absolute right-3 top-20 z-[100002] flex items-center gap-1 rounded-full border border-white/20 bg-[#102434]/95 p-1 text-xs font-bold text-white shadow-lg" aria-label="Camera zoom">
    <button type="button" aria-label="Zoom camera out" disabled={zoom<=0.75} onClick={()=>setZoom(v=>Math.max(.75,v-.15))} className="size-9 rounded-full hover:bg-white/15 disabled:opacity-30">−</button>
    <button type="button" aria-label="Reset camera zoom" onClick={()=>setZoom(1)} className="min-w-12 py-2">{Math.round(zoom*100)}%</button>
    <button type="button" aria-label="Zoom camera in" disabled={zoom>=1.65} onClick={()=>setZoom(v=>Math.min(1.65,v+.15))} className="size-9 rounded-full hover:bg-white/15 disabled:opacity-30">+</button>
  </div>}{!overview && map.art === "london" && <CityBroadcast {...news} />}</>;
}
