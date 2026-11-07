import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { edgeRoadRuns, type Side } from "@/game/core/edge-loop";
import type { WorldMap } from "@/game/core/world";

/**
 * The mountain ring that closes off every outdoor map (blender/terrain/build_terrain.py).
 * Roads that reach the map edge run into a tunnel mouth; the car wraps round inside it.
 * Everything is merged into one mesh per material so the ring costs a handful of draw calls.
 */
const STRIP = 24;
/** Tunnel mouths sit this far inside the edge, so the car is in the bore when it wraps (2.5 tiles). */
export const TUNNEL_INSET = 2.8;

type Kit = { strips: THREE.Object3D[]; tunnel: THREE.Object3D };
type Helpers = { load: (url: string) => Promise<GLTF>; bend: (m: THREE.Material) => void };

/** Placement of a model: its front edge at (x, z) along a side, facing into the map. */
function frame(side: Side, along: number, cols: number, rows: number, inset: number) {
  // Model space: front at z=0, mass toward -z. Rotate so -z points out of the map.
  switch (side) {
    case "n": return { x: along, z: inset, rot: 0 };
    case "s": return { x: along, z: rows - inset, rot: Math.PI };
    case "w": return { x: inset, z: along, rot: Math.PI / 2 };
    case "e": return { x: cols - inset, z: along, rot: -Math.PI / 2 };
  }
}

export async function addMountainRing(parent: THREE.Group, map: WorldMap, h: Helpers) {
  const [a, b, c, t] = await Promise.all(
    ["mountains-a", "mountains-b", "mountains-c", "tunnel"].map((n) => h.load(`/world3d/terrain/${n}.glb`)),
  );
  const kit: Kit = { strips: [a.scene, b.scene, c.scene], tunnel: t.scene };
  const runs = edgeRoadRuns(map);
  const buckets = new Map<string, { material: THREE.Material; parts: THREE.BufferGeometry[] }>();
  // One bucket per side and material: only the sides in view are drawn.
  const addModel = (model: THREE.Object3D, matrix: THREE.Matrix4, side: Side) => {
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      const key = `${side}:${material.name || material.uuid}`;
      let bucket = buckets.get(key);
      if (!bucket) buckets.set(key, (bucket = { material, parts: [] }));
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", mesh.geometry.getAttribute("position").clone());
      g.setAttribute("normal", mesh.geometry.getAttribute("normal").clone());
      if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(matrix, mesh.matrixWorld));
      bucket.parts.push(g.index ? g.toNonIndexed() : g);
    });
  };
  const place = (model: THREE.Object3D, side: Side, along: number, inset: number, sx: number, sy: number, sz: number) => {
    const f = frame(side, along, map.cols, map.rows, inset);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(f.x, 0, f.z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), f.rot),
      new THREE.Vector3(sx, sy, sz),
    );
    addModel(model, m, side);
  };
  const sides: [Side, number][] = [["n", map.cols], ["s", map.cols], ["w", map.rows], ["e", map.rows]];
  let n = 0;
  for (const [side, len] of sides) {
    const openings = runs.filter((r) => r.side === side).sort((p, q) => p.from - q.from);
    // Front row: strips fill each stretch between tunnel mouths exactly, running past the corners.
    const stretches: [number, number][] = [];
    let cursor = -STRIP;
    for (const r of openings) { stretches.push([cursor, r.from - 1.2]); cursor = r.to + 1.2; }
    stretches.push([cursor, len + STRIP]);
    for (const [from, to] of stretches) {
      const span = to - from;
      if (span <= 0.5) continue;
      const count = Math.max(1, Math.round(span / STRIP)), w = span / count;
      for (let i = 0; i < count; i++)
        place(kit.strips[n++ % 3], side, from + w * (i + 0.5), -0.15, w / STRIP, 0.8 + ((n * 7) % 5) * 0.08, 1);
    }
    // Back row: taller peaks, offset half a strip, so the skyline reads as a range rather than a wall.
    for (let at = -STRIP; at < len + STRIP * 1.5; at += STRIP)
      place(kit.strips[(n++ + 1) % 3], side, at + STRIP / 2, -11, 1.1, 1.25 + ((n * 3) % 4) * 0.1, 1.2);
    // Tunnel mouths, stretched across each road that leaves the map.
    for (const r of openings) {
      const opening = r.to - r.from + 1.2;
      place(kit.tunnel, side, (r.from + r.to) / 2, TUNNEL_INSET, opening / 10, Math.min(1, Math.max(0.55, opening / 10)), Math.min(1, Math.max(0.6, opening / 10)));
    }
  }
  const ring = new THREE.Group();
  ring.name = "mountain-ring";
  for (const { material, parts } of buckets.values()) {
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const m = material.clone() as THREE.MeshStandardMaterial;
    m.flatShading = true;
    h.bend(m);
    const mesh = new THREE.Mesh(merged, m);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // The bend shader moves vertices; the sphere would cull wrongly.
    ring.add(mesh);
  }
  // Ground skirt under the range, so nothing past the edge shows the sky.
  const skirt = new THREE.MeshStandardMaterial({ color: "#7aa257", roughness: 1 });
  h.bend(skirt);
  const pad = 46;
  for (const [x0, z0, x1, z1] of [
    [-pad, -pad, map.cols + pad, 0],
    [-pad, map.rows, map.cols + pad, map.rows + pad],
    [-pad, 0, 0, map.rows],
    [map.cols, 0, map.cols + pad, map.rows],
  ]) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.ceil((x1 - x0) / 8), Math.ceil((z1 - z0) / 8));
    g.rotateX(-Math.PI / 2);
    const plane = new THREE.Mesh(g, skirt);
    plane.position.set((x0 + x1) / 2, -0.03, (z0 + z1) / 2);
    plane.receiveShadow = true;
    plane.frustumCulled = false;
    ring.add(plane);
  }
  // Dark road surface running on into each bore.
  const asphalt = new THREE.MeshStandardMaterial({ color: "#2d2f35", roughness: 1 });
  h.bend(asphalt);
  for (const r of runs) {
    const long = 16, across = r.to - r.from + 1;
    const g = new THREE.PlaneGeometry(r.side === "n" || r.side === "s" ? across : long, r.side === "n" || r.side === "s" ? long : across);
    g.rotateX(-Math.PI / 2);
    const mid = (r.from + r.to) / 2;
    const plane = new THREE.Mesh(g, asphalt);
    plane.position.set(
      r.side === "w" ? -long / 2 + 0.5 : r.side === "e" ? map.cols + long / 2 - 0.5 : mid,
      0.004,
      r.side === "n" ? -long / 2 + 0.5 : r.side === "s" ? map.rows + long / 2 - 0.5 : mid,
    );
    plane.frustumCulled = false;
    ring.add(plane);
  }
  parent.add(ring);
  return { ring, runs };
}
