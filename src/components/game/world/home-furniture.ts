import * as THREE from "three";

import { furnitureById, type Placed } from "@/game/core/homes";

const cube = new THREE.BoxGeometry(1, 1, 1);
const ball = new THREE.SphereGeometry(1, 12, 8);
const materials = new Map<string, THREE.MeshLambertMaterial>();
const material = (colour: string) => {
  let m = materials.get(colour);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: colour }); materials.set(colour, m); }
  return m;
};

/** Original furniture built from shared lightweight shapes, in tile units. */
export function homeFurniture(p: Placed, style = 0) {
  const f = furnitureById(p.item)!;
  const type = f.design ?? f.id;
  const premium = !f.starter;
  const oak = style === 4 ? "#51463f" : "#b18b60", cream = "#f0e7d8", brass = "#c6a568", dark = "#253a3a";
  const fabric = premium ? "#43665c" : ["#68869b", "#c78f70", "#817391", "#7c9275", "#49616b"][style % 5];
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.y);
  const w = f.w, d = f.h;
  const box = (c: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const mesh = new THREE.Mesh(cube, material(c)); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); g.add(mesh); return mesh;
  };
  const soft = (c: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const mesh = new THREE.Mesh(ball, material(c)); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); g.add(mesh); return mesh;
  };
  const legs = (height = 0.7) => { for (const x of [0.2, w - 0.2]) for (const z of [0.2, d - 0.2]) box(brass, x, height / 2, z, 0.09, height, 0.09); };
  if (type === "bed") {
    legs(0.35); box(oak, w / 2, 0.42, d / 2, w - 0.18, 0.28, d - 0.16);
    box(cream, w / 2, 0.68, d / 2, w - 0.3, 0.3, d - 0.26);
    box(fabric, w / 2, 0.87, d * 0.64, w - 0.24, 0.13, d * 0.64);
    box(oak, w / 2, 0.88, 0.12, w - 0.08, 1.55, 0.16);
    for (const x of [w * 0.28, w * 0.72]) soft(cream, x, 0.91, 0.68, w * 0.19, 0.14, 0.36);
    if (premium) box(brass, w / 2, 1.5, 0.22, w - 0.3, 0.04, 0.03);
  } else if (type === "petbed" || type === "beanbag") {
    soft(fabric, w / 2, 0.25, d / 2, w * 0.43, type === "petbed" ? 0.2 : 0.5, d * 0.43);
    if (type === "petbed") soft(cream, w / 2, 0.4, d / 2, w * 0.32, 0.08, d * 0.32);
  } else if (["sofa", "armchair"].includes(type)) {
    legs(0.25); box(oak, w / 2, 0.3, d / 2, w - 0.12, 0.18, d - 0.12);
    box(fabric, w / 2, 0.57, d * 0.55, w - 0.32, 0.38, d * 0.65);
    box(fabric, w / 2, 1.0, 0.25, w - 0.12, 1.0, 0.35);
    for (const x of [0.16, w - 0.16]) box(fabric, x, 0.77, d / 2, 0.3, 0.7, d - 0.1);
    soft("#dcc6a6", w * 0.3, 0.95, d * 0.35, 0.3, 0.3, 0.14);
  } else if (["tv", "gaming", "arcade"].includes(type)) {
    box(oak, w / 2, 0.45, d / 2, w - 0.16, 0.75, d - 0.12);
    box(brass, w / 2, 0.84, d / 2, w - 0.18, 0.035, d - 0.1);
    box(dark, w / 2, 1.65, d * 0.4, w * 0.84, 1.35, 0.16);
    const screen = box("#609ca4", w / 2, 1.65, d * 0.4 + 0.09, w * 0.76, 1.15, 0.02);
    screen.userData.homeScreen = true;
    for (const x of [0.22, w - 0.22]) box(dark, x, 1.05, d * 0.4, 0.18, 0.4, 0.18);
  } else if (["shower", "bath", "toilet", "sink"].includes(type)) {
    box(cream, w / 2, 0.19, d / 2, w - 0.12, 0.3, d - 0.12);
    if (type === "shower") {
      box("#a6c3c5", w / 2, 1.25, 0.15, w - 0.12, 2.2, 0.12);
      box("#94b3b7", 0.12, 1.25, d / 2, 0.12, 2.2, d - 0.12);
      box(brass, w / 2, 1.4, 0.26, 0.05, 2, 0.07);
      box(brass, w / 2, 2.4, 0.56, 0.6, 0.07, 0.6);
      box(dark, w - 0.13, 1.3, d - 0.13, 0.04, 2.4, 0.04);
    } else if (type === "bath") {
      for (const x of [0.18, w - 0.18]) box(cream, x, 0.5, d / 2, 0.18, 0.7, d - 0.1);
      for (const z of [0.18, d - 0.18]) box(cream, w / 2, 0.5, z, w - 0.1, 0.7, 0.18);
      box("#a6d6db", w / 2, 0.55, d / 2, w - 0.5, 0.04, d - 0.5);
    } else if (type === "toilet") {
      box(cream, w / 2, 0.6, 0.3, w * 0.7, 1.05, 0.4);
      soft(cream, w / 2, 0.55, d * 0.62, w * 0.38, 0.22, d * 0.27);
      soft(dark, w / 2, 0.74, d * 0.62, w * 0.23, 0.02, d * 0.19);
    } else {
      box(oak, w / 2, 0.5, d / 2, w - 0.1, 0.9, d - 0.1);
      box(cream, w / 2, 1.02, d / 2, w - 0.15, 0.14, d - 0.12);
      box("#98bfc4", w / 2, 1.05, d / 2, w * 0.5, 0.1, d * 0.5);
      box(brass, w / 2, 1.25, 0.2, 0.06, 0.35, 0.07);
    }
  } else if (["plant", "sculpture", "lamp", "telescope", "fishtank"].includes(type)) {
    box(cream, w / 2, 0.3, d / 2, w * 0.55, 0.55, d * 0.55);
    if (type === "plant") for (let i = 0; i < 5; i++) soft(i % 2 ? "#6d8f61" : "#3c6854", w / 2 + Math.sin(i * 2) * 0.2, 0.9 + i * 0.12, d / 2 + Math.cos(i * 2) * 0.2, 0.24, 0.38, 0.17);
    else if (type === "lamp") { box(brass, w / 2, 0.95, d / 2, 0.05, 1.4, 0.05); soft("#f5db9c", w / 2, 1.7, d / 2, 0.3, 0.3, 0.3); }
    else if (type === "fishtank") { box("#5ea6b2", w / 2, 1.0, d / 2, w - 0.2, 0.85, d - 0.18); for (let i = 0; i < 4; i++) soft("#efb562", 0.4 + i * 0.6, 1 + i % 2 * 0.16, d * 0.95, 0.12, 0.07, 0.04); }
    else soft(brass, w / 2, 1.1, d / 2, 0.22, 0.5, 0.22);
  } else if (type === "rug") {
    box(fabric, w / 2, 0.04, d / 2, w - 0.1, 0.035, d - 0.1);
    box("#cbb99b", w / 2, 0.065, d / 2, w * 0.75, 0.015, d * 0.75);
  } else if (["wardrobe", "shelf", "trophies", "fridge"].includes(type)) {
    const height = type === "fridge" ? 2.1 : 2.5;
    box(type === "fridge" ? fabric : oak, w / 2, height / 2, d / 2, w - 0.16, height, d - 0.12);
    for (let i = 1; i < 4; i++) box(brass, w / 2, height * i / 4, d - 0.04, w - 0.22, 0.05, 0.08);
    if (type === "shelf" || type === "trophies") for (let i = 0; i < 9; i++) box(type === "trophies" ? brass : [fabric, cream, "#a26956"][i % 3], 0.35 + i % 3 * (w - 0.7) / 3, 0.65 + Math.floor(i / 3) * 0.6, d, 0.22, 0.35, 0.12);
    else box(brass, w * 0.8, 1.2, d, 0.06, 0.4, 0.06);
  } else {
    legs(); box(type === "table" && premium ? cream : oak, w / 2, 0.8, d / 2, w - 0.1, 0.15, d - 0.1);
    if (type === "desk") { box(dark, w / 2, 1.25, 0.4, 1, 0.65, 0.12); box(cream, w / 2, 0.91, d * 0.65, 0.6, 0.04, 0.4); }
    if (type === "kitchen") { box(fabric, w / 2, 0.4, d / 2, w - 0.2, 0.7, d - 0.2); for (const x of [w * 0.3, w * 0.7]) soft(dark, x, 0.91, d / 2, 0.25, 0.02, 0.25); }
    if (type === "piano") { box(dark, w / 2, 1.1, 0.35, w - 0.1, 0.7, 0.55); for (let i = 0; i < 12; i++) box(i % 3 ? cream : dark, 0.2 + i * (w - 0.4) / 12, 0.95, d * 0.7, (w - 0.5) / 12, 0.06, 0.4); }
  }
  return g;
}
