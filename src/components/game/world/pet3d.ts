import * as THREE from "three";

import type { PetAccessory, PetAction, PetKind } from "@/game/core/pets";

/**
 * Blocky low-poly pets built from boxes, with their own walk, idle, eating, drinking,
 * sleeping, playing and bath animations. One small group each, so they're cheap.
 */
export type Pet3D = {
  root: THREE.Group;
  /** Animate: `moving` is walking speed 0–1; `action` plays a care animation. */
  update: (secs: number, moving: number, action: PetAction | null, actionStart: number) => void;
  dispose: () => void;
};

const darker = (hex: string, k = 0.65) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;

export function makePet(kind: PetKind, colour: string, accessory: PetAccessory, style: (m: THREE.Material) => void): Pet3D {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (c: string) => {
    let m = mats.get(c);
    if (!m) { m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true }); style(m); mats.set(c, m); }
    return m;
  };
  const box = (parent: THREE.Object3D, c: string, w: number, h: number, d: number, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const main = kind === "panda" ? "#f2efe6" : colour;
  const dark = kind === "panda" ? "#22262e" : darker(colour);
  const light = kind === "fox" || kind === "penguin" ? "#f7f3ea" : main;
  const legs: THREE.Object3D[] = [];
  let head: THREE.Group, tail: THREE.Object3D | null = null;
  const upright = kind === "penguin";
  if (upright) {
    box(body, main, 0.3, 0.42, 0.26, 0, 0.3, 0);
    box(body, "#f7f3ea", 0.22, 0.32, 0.04, 0, 0.27, 0.13);
    head = new THREE.Group(); head.position.set(0, 0.58, 0); body.add(head);
    box(head, main, 0.24, 0.2, 0.22, 0, 0, 0);
    box(head, "#f2a541", 0.08, 0.05, 0.1, 0, -0.02, 0.15);
    for (const s of [-1, 1]) { box(head, "#ffffff", 0.05, 0.05, 0.02, s * 0.06, 0.03, 0.115); box(head, "#141020", 0.025, 0.025, 0.02, s * 0.06, 0.03, 0.125); }
    for (const s of [-1, 1]) { const f = box(body, dark, 0.04, 0.26, 0.14, s * 0.17, 0.32, 0); f.rotation.z = s * 0.25; legs.push(f); }
    for (const s of [-1, 1]) box(body, "#f2a541", 0.09, 0.03, 0.12, s * 0.07, 0.015, 0.04);
  } else {
    const long = kind === "cat" || kind === "fox" ? 0.46 : kind === "rabbit" ? 0.34 : kind === "panda" ? 0.44 : 0.48;
    const high = kind === "rabbit" ? 0.14 : kind === "panda" ? 0.22 : 0.18;
    box(body, main, 0.26, kind === "panda" ? 0.26 : 0.22, long, 0, high + 0.11, 0);
    if (kind === "fox" || kind === "dog") box(body, light, 0.18, 0.1, 0.12, 0, high + 0.06, long / 2 - 0.04);
    if (kind === "panda") box(body, "#22262e", 0.28, 0.12, 0.16, 0, high + 0.2, 0.06); // the black band
    // Legs at the four corners.
    for (const [x, z] of [[-0.09, long / 2 - 0.07], [0.09, long / 2 - 0.07], [-0.09, -long / 2 + 0.07], [0.09, -long / 2 + 0.07]]) {
      const leg = new THREE.Group(); leg.position.set(x, high, z); body.add(leg);
      box(leg, kind === "panda" ? "#22262e" : dark, 0.07, high, 0.07, 0, -high / 2, 0);
      legs.push(leg);
    }
    head = new THREE.Group(); head.position.set(0, high + 0.3, long / 2 + 0.04); body.add(head);
    box(head, main, 0.22, 0.2, 0.2, 0, 0, 0);
    if (kind === "dog" || kind === "fox") box(head, kind === "fox" ? light : darker(main, 0.85), 0.1, 0.08, 0.1, 0, -0.04, 0.13);
    box(head, "#141020", 0.04, 0.03, 0.02, 0, kind === "dog" || kind === "fox" ? -0.01 : -0.04, kind === "dog" || kind === "fox" ? 0.185 : 0.105);
    for (const s of [-1, 1]) {
      box(head, kind === "panda" ? "#22262e" : "#ffffff", 0.06, 0.06, 0.02, s * 0.055, 0.03, 0.1);
      box(head, kind === "panda" ? "#ffffff" : "#141020", 0.028, 0.028, 0.02, s * 0.055, 0.03, 0.11);
      if (kind === "rabbit") { const e = box(head, main, 0.05, 0.22, 0.04, s * 0.05, 0.2, -0.02); e.rotation.z = s * 0.12; box(head, "#f2b7c4", 0.025, 0.16, 0.01, s * 0.05, 0.2, 0.0); }
      else if (kind === "cat" || kind === "fox") { const e = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), mat(kind === "fox" ? dark : main)); e.position.set(s * 0.07, 0.14, -0.02); e.castShadow = true; head.add(e); }
      else if (kind === "panda") box(head, "#22262e", 0.07, 0.07, 0.04, s * 0.08, 0.12, -0.03);
      else { const e = box(head, dark, 0.05, 0.14, 0.08, s * 0.12, 0.0, -0.01); e.rotation.z = s * 0.2; }
    }
    // Tail.
    const t = new THREE.Group(); t.position.set(0, high + 0.18, -long / 2); body.add(t);
    if (kind === "rabbit" || kind === "panda") box(t, kind === "panda" ? "#f2efe6" : "#ffffff", 0.08, 0.08, 0.06, 0, 0, -0.02);
    else {
      const len = kind === "cat" ? 0.3 : kind === "fox" ? 0.26 : 0.18;
      const seg = box(t, kind === "fox" ? colour : main, kind === "fox" ? 0.1 : 0.05, kind === "fox" ? 0.1 : 0.05, len, 0, 0.05, -len / 2);
      seg.rotation.x = -0.6;
      if (kind === "fox") box(t, "#f7f3ea", 0.1, 0.1, 0.07, 0, 0.05 + Math.sin(0.6) * len, -Math.cos(0.6) * len);
    }
    tail = t;
  }
  // Accessory on the head or neck.
  if (accessory === "collar") box(head, "#c8322d", 0.24, 0.035, 0.22, 0, -0.11, -0.01);
  if (accessory === "bandana") { const b = box(head, "#2b6fe0", 0.24, 0.06, 0.2, 0, -0.12, 0.01); b.rotation.x = 0.2; }
  if (accessory === "bow") { box(head, "#ff5a7a", 0.12, 0.05, 0.03, 0.06, 0.12, 0.02); box(head, "#e8457a", 0.03, 0.04, 0.035, 0.06, 0.12, 0.02); }
  if (accessory === "cap") { box(head, "#2b6fe0", 0.2, 0.06, 0.2, 0, 0.12, 0); box(head, "#2b6fe0", 0.18, 0.02, 0.1, 0, 0.1, 0.13); }

  // Props for care animations: bowl, ball, bubbles and Zzz.
  const bowl = new THREE.Group(); bowl.visible = false; root.add(bowl);
  const bowlFill = box(bowl, "#c8955c", 0.16, 0.03, 0.16, 0, 0.06, 0.38);
  box(bowl, "#9aa3ad", 0.2, 0.05, 0.2, 0, 0.025, 0.38);
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), mat("#ffd166")); ball.visible = false; ball.castShadow = true; root.add(ball);
  const bubbles = new THREE.Group(); bubbles.visible = false; root.add(bubbles);
  const bubbleMat = new THREE.MeshStandardMaterial({ color: "#e9f6ff", transparent: true, opacity: 0.8, roughness: 0.1 }); style(bubbleMat);
  for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05 + (i % 3) * 0.02, 0), bubbleMat); b.userData.seed = i; bubbles.add(b); }
  const zzz = new THREE.Group(); zzz.visible = false; root.add(zzz);
  for (let i = 0; i < 3; i++) { const z = box(zzz, "#ffffff", 0.06 + i * 0.02, 0.012, 0.012, 0, 0, 0); z.userData.seed = i; }

  let phase = 0;
  return {
    root,
    update(secs, moving, action, actionStart) {
      const t = secs - actionStart;
      phase += moving * 0.22;
      const walk = Math.sin(phase * 6) * 0.6 * moving;
      legs.forEach((l, i) => { l.rotation.x = upright ? 0 : (i % 2 === (i < 2 ? 0 : 1) ? walk : -walk); });
      if (upright) { body.rotation.z = Math.sin(phase * 6) * 0.15 * moving; legs.forEach((f, i) => { f.rotation.x = Math.sin(secs * 3 + i) * 0.2; }); }
      body.position.y = Math.abs(Math.sin(phase * 6)) * 0.03 * moving;
      body.rotation.x = 0; body.scale.set(1, 1, 1); head.rotation.set(0, 0, 0); body.rotation.y = 0;
      if (tail) tail.rotation.y = Math.sin(secs * (moving > 0.1 ? 8 : 5)) * 0.5;
      bowl.visible = action === "feed" || action === "water";
      bowlFill.material = mat(action === "water" ? "#5ec8ff" : "#c8955c");
      ball.visible = action === "play";
      bubbles.visible = action === "wash";
      zzz.visible = action === "sleep";
      if (action === "feed" || action === "water") {
        head.rotation.x = 0.5 + Math.abs(Math.sin(t * 7)) * 0.25; // head down, nibbling or lapping
        bowlFill.scale.y = Math.max(0.1, 1 - t / 4);
      } else if (action === "sleep") {
        body.scale.set(1, upright ? 1 : 0.7, 1); body.position.y = upright ? 0 : -0.05; head.rotation.x = 0.3;
        if (tail) tail.rotation.y = 0.8;
        zzz.children.forEach((z, i) => { const k = (t * 0.6 + i / 3) % 1; z.position.set(0.15 + k * 0.1, 0.5 + k * 0.5, 0.1); z.scale.setScalar(0.5 + k); });
      } else if (action === "play") {
        const hop = Math.abs(Math.sin(t * 4));
        body.position.y = hop * 0.25; body.rotation.y = Math.sin(t * 2) * 0.8;
        ball.position.set(Math.sin(t * 2) * 0.5, 0.07 + Math.abs(Math.sin(t * 5)) * 0.4, 0.4 + Math.cos(t * 2) * 0.3);
      } else if (action === "wash") {
        body.rotation.z = Math.sin(t * 20) * 0.12; // the shake
        bubbles.children.forEach((b, i) => { const k = (t * 0.5 + i / 8) % 1; b.position.set(Math.sin(i * 2.4) * 0.25, 0.25 + k * 0.5, Math.cos(i * 2.4) * 0.25); b.scale.setScalar(1 - k * 0.6); });
      }
    },
    dispose() {
      root.removeFromParent();
      root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
      mats.forEach((m) => m.dispose());
      bubbleMat.dispose();
    },
  };
}
