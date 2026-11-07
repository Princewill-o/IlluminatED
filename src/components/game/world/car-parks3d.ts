import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { type Lot, PARKED_BAY, lotSize, lotTile } from "@/game/core/car-parks";
import { realisticCarAsset, realisticCarScale } from "@/game/core/realistic-cars";

/**
 * Car parks in 3D: white bay lines, a blue P sign at each entrance, and parked cars
 * drawn from the game's own car models. Every model is one instanced mesh, so a city
 * full of parked cars costs a few dozen draw calls rather than hundreds.
 */
const PARKED_MODELS = ["sedan", "hatchback", "hatchback-sports", "sports", "suv", "mini", "pickup", "camper"];

type Helpers = {
  load: (url: string) => Promise<GLTF>;
  bend: (m: THREE.Material) => void;
  sign: (text: string, o: { bg: string; fg: string; w: number; h: number }) => THREE.Object3D;
};

const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Returns a culler: give it a visibility test and only the parked cars in view are drawn. */
export async function addCarParks3D(parent: THREE.Group, lots: Lot[], tiles: string[], h: Helpers): Promise<((visible: (bounds: THREE.Box3) => boolean) => void) | undefined> {
  if (!lots.length) return;
  const root = new THREE.Group();
  root.name = "car-parks";
  parent.add(root);

  // Bay lines and a kerb stop at the back of each bay, merged into one mesh.
  const lineParts: THREE.BufferGeometry[] = [];
  const line = (x0: number, z0: number, x1: number, z1: number, y = 0.135, height = 0.012) => {
    const g = new THREE.BoxGeometry(Math.max(0.06, x1 - x0), height, Math.max(0.06, z1 - z0));
    g.translate((x0 + x1) / 2, y + height / 2, (z0 + z1) / 2);
    lineParts.push(g);
  };
  // Points in tile space for a lot's local (u, v), at tile corners.
  const corner = (lot: Lot, u: number, v: number): [number, number] => {
    const [tx, tz] = lotTile(lot, Math.min(u, lotSize(lot).long - 1), Math.min(v, lotSize(lot).deep - 1));
    const du = u >= lotSize(lot).long ? 1 : 0, dv = v >= lotSize(lot).deep ? 1 : 0;
    switch (lot.facing) {
      case "s": return [tx + du, tz + 1 - dv];
      case "n": return [tx + du, tz + dv];
      case "e": return [tx + 1 - dv, tz + du];
      case "w": return [tx + dv, tz + du];
    }
  };
  const segment = (lot: Lot, u0: number, v0: number, u1: number, v1: number) => {
    const [ax, az] = corner(lot, u0, v0), [bx, bz] = corner(lot, u1, v1);
    line(Math.min(ax, bx) - 0.04, Math.min(az, bz) - 0.04, Math.max(ax, bx) + 0.04, Math.max(az, bz) + 0.04);
  };

  // Asphalt over the whole lot and its dropped kerb (the city ground draws these tiles as paving).
  const slabParts: THREE.BufferGeometry[] = [];
  for (let z = 0; z < tiles.length; z++) {
    const row = tiles[z];
    let start = -1;
    for (let x = 0; x <= row.length; x++) {
      const lotTile = x < row.length && (row[x] === "P" || row[x] === "U" || row[x] === PARKED_BAY);
      if (lotTile && start < 0) start = x;
      if (!lotTile && start >= 0) {
        slabParts.push(new THREE.BoxGeometry(x - start, 0.02, 1).translate((start + x) / 2, 0.125, z + 0.5));
        start = -1;
      }
    }
  }
  const slab = mergeGeometries(slabParts, false);
  slabParts.forEach((g) => g.dispose());
  if (slab) {
    const m = new THREE.MeshStandardMaterial({ color: "#4f5562", roughness: 1 });
    const mesh = new THREE.Mesh(slab, m);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    root.add(mesh);
  }

  type Parked = { x: number; z: number; rot: number };
  const parked = new Map<string, Parked[]>();
  lots.forEach((lot, li) => {
    const { long, deep } = lotSize(lot);
    segment(lot, 0, 4, long, 4); // front edge of the bays
    for (let u = 0; u <= long; u += 2) segment(lot, u, 4, u, deep);
    for (let b = 0; b < long / 2; b++) {
      const [kx, kz] = corner(lot, b * 2 + 0.5, deep - 0.35), [kx2, kz2] = corner(lot, b * 2 + 1.5, deep - 0.35);
      const minX = Math.min(kx, kx2), maxX = Math.max(kx, kx2), minZ = Math.min(kz, kz2), maxZ = Math.max(kz, kz2);
      lineParts.push(new THREE.BoxGeometry(Math.max(0.14, maxX - minX), 0.1, Math.max(0.14, maxZ - minZ)).translate((minX + maxX) / 2, 0.185, (minZ + maxZ) / 2));
      const [tx, tz] = lotTile(lot, b * 2, 5);
      if (tiles[tz]?.[tx] !== PARKED_BAY) continue;
      const [cx, cz] = corner(lot, b * 2 + 1, 6);
      const model = PARKED_MODELS[Math.floor(rand(li * 31 + b) * PARKED_MODELS.length)];
      const along = lot.facing === "n" || lot.facing === "s";
      // Nose-in or reversed in, as people do.
      const rot = (along ? Math.PI / 2 : 0) + (rand(li * 17 + b * 3) < 0.5 ? 0 : Math.PI);
      const list = parked.get(model) ?? [];
      list.push({ x: cx, z: cz, rot });
      parked.set(model, list);
    }
    // P sign by the entrance.
    const [sx, sz] = corner(lot, 0, 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 6), new THREE.MeshStandardMaterial({ color: "#6b7280" }));
    pole.position.set(sx, 1.05, sz);
    root.add(pole);
    const p = h.sign("P", { bg: "#1f5fd1", fg: "#ffffff", w: 0.8, h: 0.8 });
    p.position.set(sx, 2.2, sz);
    p.rotation.y = lot.facing === "s" ? 0 : lot.facing === "n" ? Math.PI : lot.facing === "e" ? Math.PI / 2 : -Math.PI / 2;
    root.add(p);
  });
  const merged = mergeGeometries(lineParts, false);
  lineParts.forEach((g) => g.dispose());
  if (merged) {
    const m = new THREE.MeshStandardMaterial({ color: "#f4f1e6", roughness: 0.8 });
    h.bend(m);
    const mesh = new THREE.Mesh(merged, m);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    root.add(mesh);
  }
  root.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) for (const m of [mesh.material].flat()) h.bend(m); });

  // Parked cars: one instanced mesh per model, materials as groups.
  const fleets: { inst: THREE.InstancedMesh; matrices: THREE.Matrix4[]; bounds: THREE.Box3[] }[] = [];
  await Promise.all([...parked].map(async ([model, spots]) => {
    const gltf = await h.load(realisticCarAsset(model)).catch(() => null);
    if (!gltf) return;
    const src = gltf.scene.clone(true);
    src.updateMatrixWorld(true);
    const geoms: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [];
    src.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const g = new THREE.BufferGeometry();
      for (const name of ["position", "normal", "uv", "color"]) { const a = mesh.geometry.getAttribute(name); if (a) g.setAttribute(name, a.clone()); }
      if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());
      g.applyMatrix4(mesh.matrixWorld);
      const plain = g.index ? g.toNonIndexed() : g;
      const count = plain.getAttribute("position").count;
      if (!plain.getAttribute("uv")) plain.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      // Shared attribute set so the parts merge; white vertex colour leaves the material as it was.
      const col = plain.getAttribute("color");
      if (!col || col.itemSize !== 4) {
        const rgba = new Float32Array(count * 4).fill(1);
        if (col) for (let i = 0; i < count; i++) { rgba[i * 4] = col.getX(i); rgba[i * 4 + 1] = col.getY(i); rgba[i * 4 + 2] = col.getZ(i); }
        plain.setAttribute("color", new THREE.BufferAttribute(rgba, 4));
      }
      geoms.push(plain);
      const m = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).clone() as THREE.MeshStandardMaterial;
      m.vertexColors = true;
      h.bend(m);
      mats.push(m);
    });
    const geometry = mergeGeometries(geoms, true);
    geoms.forEach((g) => g.dispose());
    if (!geometry) return;
    // Fit like the driving cars: source faces +Z, scaled into the shared car envelope.
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const size = box.getSize(new THREE.Vector3());
    const s = realisticCarScale({ x: size.z, z: size.x }, model);
    const centre = box.getCenter(new THREE.Vector3());
    geometry.translate(-centre.x, -box.min.y, -centre.z);
    geometry.scale(s, s, s);
    const inst = new THREE.InstancedMesh(geometry, mats, spots.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    const matrices: THREE.Matrix4[] = [], bounds: THREE.Box3[] = [];
    spots.forEach((spot, i) => {
      // Car length along v: n/s lots run v along z, so no turn; e/w lots turn a quarter.
      q.setFromAxisAngle(up, spot.rot - Math.PI / 2);
      inst.setMatrixAt(i, m4.compose(new THREE.Vector3(spot.x, 0.135, spot.z), q, one));
      matrices.push(m4.clone());
      bounds.push(new THREE.Box3(new THREE.Vector3(spot.x - 1.4, 0, spot.z - 1.4), new THREE.Vector3(spot.x + 1.4, 1.8, spot.z + 1.4)));
    });
    fleets.push({ inst, matrices, bounds });
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.frustumCulled = false;
    root.add(inst);
  }));
  return (visible) => {
    for (const { inst, matrices, bounds } of fleets) {
      let n = 0;
      for (let i = 0; i < matrices.length; i++) if (visible(bounds[i])) inst.setMatrixAt(n++, matrices[i]);
      if (n !== inst.count || n) { inst.count = n; inst.instanceMatrix.needsUpdate = true; }
      inst.visible = n > 0;
    }
  };
}
