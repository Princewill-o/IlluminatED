import * as THREE from "three";

import { SOLID, TILE, type Portal, type WorldMap } from "@/game/core/world";

/**
 * Doors at building entrances, in place of the old glowing ground rings. As you walk up
 * the door swings open and warm light spills out of the doorway onto the ground; walk
 * through and the travel cutscene takes over. Doors are built only near the player.
 */
type Facing = "n" | "s" | "w" | "e";
export type DoorSpot = { portal: Portal; x: number; z: number; facing: Facing; width: number };

type Rect = { x: number; y: number; w: number; h: number };
/**
 * Where a portal's door sits: on a building's wall face beside it, facing out. Null unless the
 * portal is right at the front of one of `buildings` (tile rects), so stations, trains, parks
 * and interiors keep no door.
 */
export function doorSpot(map: WorldMap, portal: Portal, buildings: readonly Rect[]): DoorSpot | null {
  const r = portal.rect;
  const px = (r.x + r.w / 2) / TILE, py = (r.y + r.h / 2) / TILE;
  const onBuilding = buildings.some((b) => px > b.x - 0.6 && px < b.x + b.w + 0.6 && py > b.y - 0.6 && py < b.y + b.h + 1.6);
  if (!onBuilding) return null;
  const cx = Math.floor((r.x + r.w / 2) / TILE), cy = Math.floor((r.y + r.h / 2) / TILE);
  const solid = (x: number, y: number) => SOLID.has(map.tiles[y]?.[x] ?? "") && map.tiles[y]?.[x] !== "T" && map.tiles[y]?.[x] !== "B" && map.tiles[y]?.[x] !== "L";
  const width = 0.78;
  const top = Math.floor(r.y / TILE) - 1, bottom = Math.floor((r.y + r.h) / TILE), left = Math.floor(r.x / TILE) - 1, right = Math.floor((r.x + r.w) / TILE);
  if (solid(cx, top)) return { portal, x: (r.x + r.w / 2) / TILE, z: r.y / TILE, facing: "s", width };
  if (solid(cx, bottom)) return { portal, x: (r.x + r.w / 2) / TILE, z: (r.y + r.h) / TILE, facing: "n", width };
  if (solid(left, cy)) return { portal, x: r.x / TILE, z: (r.y + r.h / 2) / TILE, facing: "e", width };
  if (solid(right, cy)) return { portal, x: (r.x + r.w) / TILE, z: (r.y + r.h / 2) / TILE, facing: "w", width };
  return null;
}

const ROT: Record<Facing, number> = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
const FRAME = new THREE.MeshStandardMaterial({ color: "#3b2a22", roughness: 0.8, flatShading: true });
const HANDLE = new THREE.MeshStandardMaterial({ color: "#e8c25a", metalness: 0.6, roughness: 0.3 });
const GLASS = new THREE.MeshStandardMaterial({ color: "#ffe2a6", emissive: "#ffcf7a", emissiveIntensity: 0.6, roughness: 0.2 });
const GLOW = new THREE.MeshBasicMaterial({ color: "#ffd38a", transparent: true, opacity: 0, depthWrite: false });
const SPILL_TEXTURE = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const g = c.getContext("2d")!;
  // A soft trapezoid of light fanning out from the doorway.
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, "rgba(255,214,140,0.95)");
  grad.addColorStop(1, "rgba(255,214,140,0)");
  g.fillStyle = grad;
  g.beginPath(); g.moveTo(20, 0); g.lineTo(44, 0); g.lineTo(62, 64); g.lineTo(2, 64); g.closePath(); g.fill();
  return new THREE.CanvasTexture(c);
})();

export type Door = { spot: DoorSpot; root: THREE.Group; update: (px: number, pz: number, dt: number) => void; dispose: () => void };

export function makeDoor(spot: DoorSpot, accent: string, style: (m: THREE.Material) => void): Door {
  const root = new THREE.Group();
  root.position.set(spot.x, 0, spot.z);
  root.rotation.y = ROT[spot.facing];
  const w = spot.width, h = 1.28;
  const leafMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6, flatShading: true });
  const glowMat = GLOW.clone();
  const spillMat = new THREE.MeshBasicMaterial({ map: SPILL_TEXTURE, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const mats = [FRAME, HANDLE, GLASS, leafMat, glowMat, spillMat];
  mats.forEach(style);
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = root) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  // Frame: two posts and a lintel, standing just proud of the wall.
  add(new THREE.BoxGeometry(0.12, h + 0.12, 0.16), FRAME, -w / 2 - 0.06, (h + 0.12) / 2, 0.06);
  add(new THREE.BoxGeometry(0.12, h + 0.12, 0.16), FRAME, w / 2 + 0.06, (h + 0.12) / 2, 0.06);
  add(new THREE.BoxGeometry(w + 0.24, 0.14, 0.18), FRAME, 0, h + 0.07, 0.06);
  // The lit room behind, seen through the opening.
  const glow = add(new THREE.PlaneGeometry(w, h), glowMat, 0, h / 2, 0.01);
  glow.renderOrder = 1;
  // The leaf, hinged on its left edge.
  const hinge = new THREE.Group();
  hinge.position.set(-w / 2, 0, 0.08);
  root.add(hinge);
  add(new THREE.BoxGeometry(w, h, 0.07), leafMat, w / 2, h / 2, 0, hinge);
  add(new THREE.BoxGeometry(w * 0.5, h * 0.22, 0.08), GLASS, w / 2, h * 0.74, 0.005, hinge);
  add(new THREE.SphereGeometry(0.05, 8, 6), HANDLE, w - 0.12, h * 0.48, 0.06, hinge);
  // Light spilling onto the ground in front.
  const spill = add(new THREE.PlaneGeometry(w * 2.2, 1.6), spillMat, 0, 0.16, 0.85);
  spill.rotation.x = -Math.PI / 2;
  spill.renderOrder = 2;
  let open = 0;
  return {
    spot,
    root,
    update(px, pz, dt) {
      const near = Math.hypot(px - spot.x, pz - spot.z) < 2.2;
      open += ((near ? 1 : 0) - open) * Math.min(1, dt * 6);
      hinge.rotation.y = -open * 1.75;
      glowMat.opacity = 0.15 + open * 0.85;
      spillMat.opacity = open * 0.55;
      spill.visible = open > 0.02;
    },
    dispose() {
      root.removeFromParent();
      root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
      leafMat.dispose(); glowMat.dispose(); spillMat.dispose();
    },
  };
}

/**
 * A tube entrance: steps going down into a lit stairwell, parapet walls with railings on three
 * sides, and a station roundel on a post. The ground can't be cut, so depth is suggested by
 * steps that drop and darken toward the bottom, with warm light coming up from below.
 */
export function tubeEntrance(name: string, x: number, z: number, style: (m: THREE.Material) => void, sign: (text: string, o: { bg: string; fg: string; w: number; h: number }) => THREE.Object3D) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  const W = 1.7, L = 2.4;
  const mats: THREE.Material[] = [];
  const m = (colour: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.8, flatShading: true, ...extra });
    style(mat); mats.push(mat); return mat;
  };
  const add = (w: number, h: number, d: number, mat: THREE.Material, px: number, py: number, pz: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(px, py, pz);
    root.add(mesh);
    return mesh;
  };
  // Steps: eight treads, each a little lower and darker, leading down and away (toward -z).
  for (let i = 0; i < 8; i++) {
    const shade = new THREE.Color("#b9b2a4").lerp(new THREE.Color("#141821"), i / 7.5);
    add(W, 0.04, L / 8, m(`#${shade.getHexString()}`), 0, 0.15 - i * 0.012, L / 2 - (i + 0.5) * (L / 8));
    add(W, 0.02, 0.05, m("#f2c94c"), 0, 0.17 - i * 0.012, L / 2 - i * (L / 8)); // yellow step edges
  }
  // Glow from the bottom of the stairs.
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, 0.8), new THREE.MeshBasicMaterial({ color: "#ffd38a", transparent: true, opacity: 0.45, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, 0.18, -L / 2 + 0.4);
  style(glow.material);
  root.add(glow);
  // Parapet walls with railings on the two sides and the back.
  const wall = m("#d9d2c3"), rail = m("#2b3442", { metalness: 0.4 });
  for (const side of [-1, 1]) {
    add(0.14, 0.55, L, wall, side * (W / 2 + 0.07), 0.4, 0);
    add(0.06, 0.06, L, rail, side * (W / 2 + 0.07), 0.95, 0);
    for (let k = 0; k <= 4; k++) add(0.04, 0.3, 0.04, rail, side * (W / 2 + 0.07), 0.8, -L / 2 + (k * L) / 4);
  }
  add(W + 0.28, 0.55, 0.14, wall, 0, 0.4, -L / 2 - 0.07);
  add(W + 0.28, 0.06, 0.06, rail, 0, 0.95, -L / 2 - 0.07);
  // Station roundel on a post at the open end.
  const post = add(0.08, 2.3, 0.08, m("#2b3442"), W / 2 + 0.35, 1.15, L / 2);
  void post;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 8, 24), m("#d8262a"));
  ring.position.set(W / 2 + 0.35, 2.35, L / 2 + 0.06);
  root.add(ring);
  const bar = sign(name.toUpperCase(), { bg: "#1f3f8a", fg: "#ffffff", w: 1.1, h: 0.2 });
  bar.position.set(W / 2 + 0.35, 2.35, L / 2 + 0.12);
  root.add(bar);
  return root;
}
