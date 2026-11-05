import * as THREE from "three";

/**
 * Recognisable university buildings, modelled from their best-known
 * silhouettes: UCL's Portico and dome, Imperial's Queen's Tower, King's
 * Strand frontage, LSE's Marshall Building, Kent's concrete library, NTU's
 * Newton Building, Birmingham's Aston Webb dome and Old Joe, Manchester's
 * Whitworth Hall and Edinburgh's Old College dome. Stylised, not exact.
 */
type Box = (g: THREE.Group, colour: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => THREE.Mesh;
type Mat = (colour: string) => THREE.Material;
export interface Plot { x: number; y: number; w: number; h: number; height?: number }

const CYL = new THREE.CylinderGeometry(1, 1, 1, 14);
const CONE4 = new THREE.ConeGeometry(1, 1, 4);
const DOME = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);

export function universityLandmark(g: THREE.Group, id: string, t: Plot, box: Box, mat: Mat) {
  const { x, y, w, h } = t, front = y + h, cx = x + w / 2;
  const add = (geo: THREE.BufferGeometry, colour: string, px: number, py: number, pz: number, sx: number, sy: number, sz: number, ry = 0) => {
    const m = new THREE.Mesh(geo, mat(colour)); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; g.add(m); return m;
  };
  const column = (colour: string, px: number, pz: number, y0: number, y1: number, r = 0.16) => add(CYL, colour, px, (y0 + y1) / 2, pz, r, y1 - y0, r);
  const windows = (colour: string, x0: number, x1: number, z: number, rows: number[], gap = 0.9, ww = 0.42, wh = 0.7) => {
    for (let px = x0 + gap / 2; px < x1 - 0.2; px += gap) for (const py of rows) box(g, colour, px - ww / 2, py, z, px + ww / 2, py + wh, z + 0.04);
  };
  const steps = (colour: string, x0: number, x1: number, n = 3) => { for (let i = 0; i < n; i++) box(g, colour, x0 - i * 0.2, 0, front + i * 0.25, x1 + i * 0.2, 0.36 - i * 0.12, front + 0.25 + i * 0.25); };
  const pediment = (colour: string, x0: number, x1: number, py: number, pz: number, depth = 0.8) => {
    const span = x1 - x0;
    for (let i = 0; i < 5; i++) box(g, colour, x0 + i * span * 0.1, py + i * 0.18, pz - depth, x1 - i * span * 0.1, py + (i + 1) * 0.18, pz);
  };

  if (id === "ucl") {
    const stone = "#e9e3d4", shade = "#cfc6b2";
    box(g, stone, x, 0, y, x + w, 4.2, front - 1.2);
    windows("#3b4d5c", x + 0.4, cx - 2.4, front - 1.18, [1.1, 2.6]);
    windows("#3b4d5c", cx + 2.4, x + w - 0.4, front - 1.18, [1.1, 2.6]);
    box(g, shade, x, 4.2, y, x + w, 4.5, front - 1.1);
    steps(stone, cx - 2.6, cx + 2.6, 4);
    box(g, stone, cx - 2.6, 0.36, front - 1.2, cx + 2.6, 0.6, front + 0.1);
    for (let i = 0; i < 10; i++) column("#f3eee3", cx - 2.3 + i * 0.51, front - 0.15, 0.6, 3.9, 0.15);
    box(g, shade, cx - 2.6, 3.9, front - 1.2, cx + 2.6, 4.3, front + 0.1);
    pediment(stone, cx - 2.6, cx + 2.6, 4.3, front + 0.1, 1.3);
    add(CYL, stone, cx, 5.4, y + h / 2 - 0.6, 1.5, 1.6, 1.5);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; column("#f3eee3", cx + Math.cos(a) * 1.55, y + h / 2 - 0.6 + Math.sin(a) * 1.55, 4.6, 6.2, 0.08); }
    add(DOME, "#c9cfc9", cx, 6.2, y + h / 2 - 0.6, 1.6, 1.4, 1.6);
    add(CYL, stone, cx, 7.8, y + h / 2 - 0.6, 0.28, 0.6, 0.28);
    add(DOME, "#c9cfc9", cx, 8.1, y + h / 2 - 0.6, 0.3, 0.3, 0.3);
  } else if (id === "imperial") {
    box(g, "#c7cdd3", x, 0, y, x + w * 0.62, 3.2, front);
    windows("#5d7f99", x + 0.3, x + w * 0.62 - 0.3, front, [0.6, 1.6, 2.5], 0.7, 0.5, 0.6);
    box(g, "#2e5c7a", x + w * 0.62, 0, y + 0.5, x + w, 2.4, front);
    const tx = x + w * 0.8, tz = y + h * 0.45;
    box(g, "#d7c7a8", tx - 0.9, 0, tz - 0.9, tx + 0.9, 9.5, tz + 0.9);
    for (const py of [3, 5, 7]) box(g, "#bfae8e", tx - 0.95, py, tz - 0.95, tx + 0.95, py + 0.15, tz + 0.95);
    for (const py of [3.6, 5.6, 7.6]) box(g, "#3d4a55", tx - 0.3, py, tz + 0.91, tx + 0.3, py + 0.9, tz + 0.95);
    box(g, "#d7c7a8", tx - 1.0, 9.5, tz - 1.0, tx + 1.0, 10.2, tz + 1.0);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(DOME, "#6fa58f", tx + dx * 0.7, 10.2, tz + dz * 0.7, 0.28, 0.5, 0.28);
    add(CYL, "#d7c7a8", tx, 10.8, tz, 0.7, 1.2, 0.7);
    add(DOME, "#6fa58f", tx, 11.4, tz, 0.75, 1.3, 0.75);
    add(CYL, "#6fa58f", tx, 12.9, tz, 0.08, 0.6, 0.08);
  } else if (id === "kcl") {
    const stone = "#ddd3bf";
    box(g, "#c9bea8", x, 0, y, x + w, 1.4, front);
    for (let px = x + 0.4; px < x + w - 0.2; px += 0.5) box(g, "#b9ae97", px, 0.2, front, px + 0.04, 1.3, front + 0.03);
    box(g, stone, x, 1.4, y, x + w, 4.6, front);
    windows("#33424e", x + 0.3, x + w - 0.3, front, [1.8, 3.2], 0.8, 0.4, 0.9);
    box(g, "#c9bea8", x, 4.6, y, x + w, 4.85, front + 0.1);
    box(g, stone, cx - 2, 4.85, y + 1, cx + 2, 5.9, front);
    for (let i = 0; i < 6; i++) column("#efe7d6", cx - 1.7 + i * 0.68, front + 0.1, 1.4, 4.6, 0.13);
    pediment(stone, cx - 2, cx + 2, 5.9, front, 0.6);
    add(CYL, "#6b5a47", cx, 7.4, front - 0.5, 0.03, 1.4, 0.03);
    box(g, "#c84a59", cx + 0.03, 7.4, front - 0.5, cx + 0.8, 7.9, front - 0.48);
  } else if (id === "lse") {
    box(g, "#2a2f36", x, 0, y, x + w, 6.4, front);
    for (let px = x + 0.25; px < x + w; px += 0.6) box(g, "#7f99a8", px, 0.4, front, px + 0.42, 6.0, front + 0.03);
    for (let py = 1.2; py < 6.2; py += 1.1) box(g, "#1d2228", x, py, front, x + w, py + 0.14, front + 0.06);
    box(g, "#a21d2c", x + 0.3, 0, front, x + 2.6, 1.0, front + 0.3);
    box(g, "#c8c3bb", x + w * 0.55, 6.4, y + 0.5, x + w - 0.3, 7.6, front - 0.6);
    box(g, "#a21d2c", cx - 0.7, 1.4, front + 0.05, cx + 0.7, 2.1, front + 0.1);
  } else if (id === "kent") {
    const concrete = "#b8b5ad";
    box(g, concrete, x, 0, y, x + w, 3.6, front);
    for (let px = x + 0.2; px < x + w; px += 1.2) box(g, "#9e9b93", px, 0, front, px + 0.25, 3.8, front + 0.2);
    windows("#465766", x + 0.4, x + w - 0.4, front, [0.8, 2.2], 1.2, 0.8, 0.9);
    box(g, concrete, x + 1, 3.6, y + 0.5, x + w - 1, 4.6, front - 0.8);
    box(g, "#5a7f52", x - 0.5, 0, front + 0.5, x + w + 0.5, 0.05, front + 2);
  } else if (id === "ntu") {
    const stone = "#e6dfcf";
    box(g, stone, x, 0, y, x + w, 4.4, front);
    windows("#3f4d58", x + 0.3, x + w - 0.3, front, [0.9, 2.2, 3.4], 0.75, 0.38, 0.8);
    box(g, "#cfc5b0", x, 4.4, y, x + w, 4.65, front + 0.08);
    box(g, stone, cx - 1, 0, front - 1.4, cx + 1, 7.6, front + 0.1);
    box(g, "#2c3b46", cx - 0.5, 0, front + 0.11, cx + 0.5, 1.6, front + 0.14);
    add(CYL, "#f6f1e4", cx, 6.5, front + 0.13, 0.42, 0.04, 0.42).rotation.x = Math.PI / 2;
    box(g, "#cfc5b0", cx - 1.1, 7.6, front - 1.5, cx + 1.1, 7.9, front + 0.2);
    for (const [dx, dz] of [[-0.9, -1.3], [0.9, -1.3], [-0.9, 0], [0.9, 0]]) add(CONE4, stone, cx + dx, 8.3, front + dz, 0.16, 0.8, 0.16, Math.PI / 4);
  } else if (id === "birmingham") {
    const brick = "#a24b37", stone = "#d7c9ad";
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (i / 6), r = Math.min(w, h * 2) * 0.42;
      const px = cx + Math.cos(a) * r, pz = y + 0.8 + Math.sin(a) * r * 0.5;
      box(g, brick, px - 0.9, 0, pz - 0.6, px + 0.9, 3.2, pz + 0.6);
      box(g, stone, px - 0.95, 3.2, pz - 0.65, px + 0.95, 3.45, pz + 0.65);
    }
    box(g, brick, cx - 2, 0, y + 0.2, cx + 2, 4.2, y + 2.4);
    add(CYL, stone, cx, 4.8, y + 1.3, 1.3, 1.2, 1.3);
    add(DOME, "#7e9a8f", cx, 5.4, y + 1.3, 1.4, 1.3, 1.4);
    const tx = cx, tz = front - 1.2;
    box(g, brick, tx - 0.7, 0, tz - 0.7, tx + 0.7, 10, tz + 0.7);
    for (const py of [2.5, 5, 7.5]) box(g, stone, tx - 0.75, py, tz - 0.75, tx + 0.75, py + 0.18, tz + 0.75);
    box(g, stone, tx - 0.85, 10, tz - 0.85, tx + 0.85, 10.9, tz + 0.85);
    for (const [dx, dz, ry] of [[0, 0.86, 0], [0, -0.86, 0], [0.86, 0, Math.PI / 2], [-0.86, 0, Math.PI / 2]] as const) {
      const face = add(CYL, "#f5efe0", tx + dx, 10.45, tz + dz, 0.36, 0.03, 0.36, ry);
      face.rotation.x = Math.PI / 2;
    }
    add(CONE4, "#5f7d72", tx, 12.4, tz, 0.95, 3, 0.95, Math.PI / 4);
  } else if (id === "manchester") {
    const sandstone = "#8f7a5e", dark = "#6e5c45";
    box(g, sandstone, x, 0, y, x + w, 4.2, front);
    for (let px = x + 0.5; px < x + w - 0.3; px += 0.85) box(g, "#2e3a40", px, 1.0, front, px + 0.36, 2.0, front + 0.04);
    for (let px = x + 0.5; px < x + w - 0.3; px += 0.85) add(CONE4, dark, px + 0.18, 2.2, front + 0.02, 0.22, 0.45, 0.05, Math.PI / 4);
    for (let px = x; px < x + w; px += 1.2) add(CONE4, dark, px + 0.6, 4.6, y + h / 2, 0.7, 0.9, h / 2, Math.PI / 4);
    const tx = x + w * 0.3, tz = front - 0.9;
    box(g, sandstone, tx - 0.9, 0, tz - 0.9, tx + 0.9, 8.2, tz + 0.9);
    box(g, "#2e3a40", tx - 0.35, 2.2, tz + 0.91, tx + 0.35, 4.4, tz + 0.95);
    add(CONE4, "#4a4f52", tx, 9.6, tz, 1.15, 2.8, 1.15, Math.PI / 4);
    for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) add(CONE4, dark, tx + dx, 8.6, tz + dz, 0.14, 0.9, 0.14, Math.PI / 4);
  } else {
    // Edinburgh Old College: dark stone quad, a columned entrance and the dome with its golden figure.
    const stone = "#7f7a70";
    box(g, stone, x, 0, y, x + w, 4.4, front);
    windows("#2c3338", x + 0.3, x + w - 0.3, front, [1.0, 2.6], 0.85, 0.42, 0.9);
    box(g, "#6d685f", x, 4.4, y, x + w, 4.7, front + 0.1);
    for (let i = 0; i < 4; i++) column("#8d887e", cx - 1.2 + i * 0.8, front + 0.2, 0, 3.6, 0.2);
    box(g, "#6d685f", cx - 1.5, 3.6, front - 0.2, cx + 1.5, 4.4, front + 0.4);
    add(CYL, stone, cx, 5.4, front - 1.2, 1.1, 1.4, 1.1);
    add(DOME, "#5e7c70", cx, 6.1, front - 1.2, 1.15, 1.6, 1.15);
    add(CYL, "#d6a21b", cx, 8.0, front - 1.2, 0.09, 0.7, 0.09);
    add(DOME, "#d6a21b", cx, 8.35, front - 1.2, 0.18, 0.25, 0.18);
  }
  return g;
}
