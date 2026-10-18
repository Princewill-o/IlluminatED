"use client";

import * as THREE from "three";

/**
 * Hats, eyewear, things you carry and pets, built as small 3D shapes so they sit
 * on your 3D character. Sizes are in "head units": 1 = the head's height.
 */
const M = new Map<string, THREE.MeshLambertMaterial>();
const mat = (c: string, emissive = false) => {
  const k = c + (emissive ? "e" : "");
  let m = M.get(k);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: c, emissive: emissive ? c : "#000000", emissiveIntensity: emissive ? 0.6 : 0 });
    m.userData.sharedAccessory = true;
    M.set(k, m);
  }
  return m;
};
const add = (g: THREE.Group, geo: THREE.BufferGeometry, c: string, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, emissive = false) => {
  const m = new THREE.Mesh(geo, mat(c, emissive));
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  g.add(m);
  return m;
};
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (r: number, h: number, r2 = r, seg = 20) => new THREE.CylinderGeometry(r2, r, h, seg);
const ball = (r: number, phi = Math.PI) => new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, phi);
const ring = (r: number, t: number) => new THREE.TorusGeometry(r, t, 8, 28);

/** A hat sitting on top of a head: origin at the top centre of the head, +z forward. */
export function hat3d(id: string, colour: string): THREE.Group | null {
  const g = new THREE.Group();
  switch (id) {
    case "hat-cap":
      add(g, ball(0.52, Math.PI / 2), colour, 0, -0.08, 0);
      add(g, box(0.75, 0.04, 0.45), colour, 0, -0.06, 0.55);
      break;
    case "hat-beanie":
      add(g, ball(0.56, Math.PI / 2), colour, 0, -0.12, 0);
      add(g, cyl(0.57, 0.14), "#f3f6fb", 0, -0.08, 0);
      add(g, ball(0.12), "#f3f6fb", 0, 0.46, 0);
      break;
    case "hat-party":
      add(g, cyl(0.32, 0.8, 0.01), colour, 0, 0.32, 0);
      add(g, ball(0.08), "#ff8fd1", 0, 0.74, 0);
      break;
    case "hat-headphones":
      add(g, ring(0.6, 0.06), colour, 0, -0.25, 0, 0, Math.PI / 2, 0).scale.set(1, 1, 1);
      add(g, cyl(0.2, 0.16), colour, 0.62, -0.6, 0, 0, 0, Math.PI / 2);
      add(g, cyl(0.2, 0.16), colour, -0.62, -0.6, 0, 0, 0, Math.PI / 2);
      break;
    case "hat-tophat":
      add(g, cyl(0.42, 0.06), colour, 0, 0.02, 0);
      add(g, cyl(0.28, 0.5), colour, 0, 0.28, 0);
      add(g, cyl(0.285, 0.08), "#c8322d", 0, 0.1, 0);
      break;
    case "hat-crown":
      add(g, cyl(0.42, 0.22, 0.42, 24), colour, 0, 0.08, 0);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        add(g, cyl(0.07, 0.2, 0.001, 6), colour, Math.cos(a) * 0.38, 0.28, Math.sin(a) * 0.38);
      }
      add(g, ball(0.06), "#c8322d", 0, 0.1, 0.42);
      break;
    case "hat-hardhat":
      add(g, ball(0.56, Math.PI / 2), colour, 0, -0.1, 0);
      add(g, cyl(0.7, 0.04), colour, 0, -0.1, 0.05);
      break;
    case "hat-chef":
      add(g, cyl(0.42, 0.35), "#ffffff", 0, 0.12, 0);
      add(g, ball(0.5), "#ffffff", 0, 0.42, 0).scale.set(1, 0.6, 1);
      break;
    case "hat-explorer":
      add(g, cyl(0.8, 0.04), colour, 0, -0.02, 0);
      add(g, cyl(0.4, 0.32, 0.45), colour, 0, 0.14, 0);
      add(g, cyl(0.455, 0.08), "#7a4f32", 0, 0.06, 0);
      break;
    case "hat-grad":
      add(g, cyl(0.38, 0.22), "#1b1622", 0, 0.05, 0);
      add(g, box(0.95, 0.05, 0.95), "#1b1622", 0, 0.18, 0, 0, Math.PI / 4, 0);
      add(g, box(0.03, 0.35, 0.03), "#ffd166", 0.35, 0.02, 0.35);
      break;
    case "hat-lion":
      add(g, ball(0.17), colour, 0.36, 0.02, 0);
      add(g, ball(0.17), colour, -0.36, 0.02, 0);
      add(g, ball(0.09), "#ffd1b0", 0.36, 0.04, 0.08);
      add(g, ball(0.09), "#ffd1b0", -0.36, 0.04, 0.08);
      break;
    case "hat-halo":
      add(g, ring(0.38, 0.05), "#ffd166", 0, 0.32, 0, Math.PI / 2, 0, 0, true);
      break;
    default:
      return null;
  }
  return g;
}

/** Eyewear in front of the face: origin at the eye line, +z forward. */
export function eyewear3d(id: string, colour: string): THREE.Group | null {
  const g = new THREE.Group();
  switch (id) {
    case "face-round":
      add(g, ring(0.15, 0.025), "#1b1622", -0.22, 0, 0);
      add(g, ring(0.15, 0.025), "#1b1622", 0.22, 0, 0);
      add(g, box(0.16, 0.03, 0.02), "#1b1622", 0, 0.02, 0);
      break;
    case "face-star":
      add(g, cyl(0.18, 0.04, 0.18, 5), colour, -0.22, 0, 0, Math.PI / 2, 0, 0);
      add(g, cyl(0.18, 0.04, 0.18, 5), colour, 0.22, 0, 0, Math.PI / 2, 0, 0);
      break;
    case "face-vr":
      add(g, box(0.82, 0.3, 0.2), colour, 0, 0, 0.05);
      add(g, box(0.7, 0.18, 0.02), "#13203a", 0, 0, 0.16);
      break;
    case "face-shades":
      add(g, box(0.34, 0.2, 0.04), "#1b1622", -0.21, 0, 0);
      add(g, box(0.34, 0.2, 0.04), "#1b1622", 0.21, 0, 0);
      add(g, box(0.8, 0.04, 0.04), "#1b1622", 0, 0.09, 0);
      break;
    case "face-monocle":
      add(g, ring(0.16, 0.03), "#ffd166", 0.22, 0, 0);
      add(g, box(0.01, 0.4, 0.01), "#ffd166", 0.36, -0.22, 0);
      break;
    default:
      return null;
  }
  return g;
}

/** Something held in the hand: origin at the hand. */
export function held3d(id: string): THREE.Group | null {
  const g = new THREE.Group();
  switch (id) {
    case "held-coffee":
      add(g, cyl(0.12, 0.3, 0.1), "#f3f6fb", 0, 0.12, 0);
      add(g, cyl(0.13, 0.06), "#7a4f32", 0, 0.29, 0);
      break;
    case "held-phone":
      add(g, box(0.16, 0.3, 0.03), "#1b1622", 0, 0.12, 0);
      break;
    case "held-croissant":
      add(g, new THREE.TorusGeometry(0.14, 0.07, 8, 16, Math.PI * 1.3), "#e3a65a", 0, 0.1, 0, Math.PI / 2, 0, 0);
      break;
    case "held-briefcase":
      add(g, box(0.45, 0.32, 0.12), "#7a4f32", 0, -0.2, 0);
      add(g, ring(0.07, 0.02), "#1b1622", 0, 0.0, 0);
      break;
    case "held-mic":
      add(g, cyl(0.04, 0.3), "#1b1622", 0, 0.1, 0);
      add(g, ball(0.08), "#8d93a0", 0, 0.3, 0);
      break;
    case "held-laptop":
      add(g, box(0.45, 0.03, 0.3), "#c9ced8", 0, 0, 0);
      add(g, box(0.45, 0.3, 0.03), "#c9ced8", 0, 0.15, -0.15);
      break;
    case "held-trophy":
      add(g, cyl(0.15, 0.2, 0.06), "#ffd166", 0, 0.25, 0);
      add(g, cyl(0.04, 0.12), "#ffd166", 0, 0.1, 0);
      add(g, box(0.18, 0.06, 0.18), "#7a4f32", 0, 0.03, 0);
      break;
    case "held-compass":
      add(g, cyl(0.15, 0.05), "#ffd166", 0, 0.1, 0, Math.PI / 2, 0, 0);
      add(g, box(0.02, 0.2, 0.02), "#c8322d", 0, 0.1, 0.03);
      break;
    default:
      return null;
  }
  return g;
}

/** A little companion that trots along beside you. About 0.35 units tall. */
export function pet3d(id: string): THREE.Group | null {
  const g = new THREE.Group();
  const body = (c: string, w = 0.32, h = 0.22, d = 0.4) => add(g, box(w, h, d), c, 0, h / 2 + 0.02, 0);
  const head = (c: string, y = 0.3, z = 0.2, r = 0.13) => add(g, ball(r), c, 0, y, z);
  const ears = (c: string, y = 0.42, z = 0.2) => {
    add(g, cyl(0.05, 0.1, 0.001, 4), c, 0.08, y, z);
    add(g, cyl(0.05, 0.1, 0.001, 4), c, -0.08, y, z);
  };
  const eyes = (y = 0.33, z = 0.32) => {
    add(g, ball(0.025), "#1b1622", 0.05, y, z);
    add(g, ball(0.025), "#1b1622", -0.05, y, z);
  };
  switch (id) {
    case "pet-hamster":
      add(g, ball(0.17), "#e3a65a", 0, 0.17, 0).scale.set(1, 0.85, 1.1);
      eyes(0.22, 0.17);
      break;
    case "pet-goldfish": {
      const bowl = new THREE.Mesh(ball(0.2), new THREE.MeshLambertMaterial({ color: "#bfe3ff", transparent: true, opacity: 0.45 }));
      bowl.position.y = 0.2;
      g.add(bowl);
      add(g, ball(0.06), "#e98a1f", 0, 0.2, 0).scale.set(1.5, 1, 1);
      break;
    }
    case "pet-cat":
      body("#8d93a0");
      head("#8d93a0");
      ears("#8d93a0");
      eyes();
      add(g, cyl(0.025, 0.3), "#8d93a0", 0, 0.3, -0.22, -0.6, 0, 0);
      break;
    case "pet-duck":
      add(g, ball(0.16), "#ffd166", 0, 0.16, 0).scale.set(1, 0.9, 1.2);
      head("#ffd166", 0.33, 0.1, 0.1);
      add(g, box(0.1, 0.04, 0.1), "#e98a1f", 0, 0.32, 0.22);
      eyes(0.36, 0.18);
      break;
    case "pet-dragon":
      body("#4f9a46");
      head("#4f9a46");
      eyes();
      add(g, box(0.4, 0.02, 0.18), "#7cc35e", 0.2, 0.3, -0.02, 0, 0, 0.5);
      add(g, box(0.4, 0.02, 0.18), "#7cc35e", -0.2, 0.3, -0.02, 0, 0, -0.5);
      break;
    case "pet-cub":
      body("#e39b4a");
      head("#e39b4a");
      ears("#e39b4a");
      eyes();
      break;
    case "pet-robot":
      add(g, box(0.28, 0.28, 0.24), "#c9ced8", 0, 0.18, 0);
      add(g, box(0.18, 0.06, 0.02), "#6bc6ff", 0, 0.22, 0.13, 0, 0, 0, true);
      add(g, cyl(0.015, 0.15), "#1b1622", 0, 0.38, 0);
      add(g, ball(0.035), "#c8322d", 0, 0.46, 0, 0, 0, 0, true);
      break;
    case "pet-dog":
      body("#a46a45");
      head("#a46a45");
      add(g, box(0.06, 0.14, 0.06), "#7a4f32", 0.1, 0.3, 0.18);
      add(g, box(0.06, 0.14, 0.06), "#7a4f32", -0.1, 0.3, 0.18);
      eyes();
      break;
    case "pet-cow":
      body("#f3f6fb");
      add(g, box(0.12, 0.1, 0.02), "#1b1622", 0.1, 0.17, 0.2);
      head("#f3f6fb");
      add(g, box(0.14, 0.08, 0.06), "#ffb3c7", 0, 0.26, 0.31);
      ears("#1b1622");
      eyes(0.34, 0.3);
      break;
    default:
      return null;
  }
  return g;
}
