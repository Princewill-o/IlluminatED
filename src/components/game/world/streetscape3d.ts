import * as THREE from "three";

import { buildLondon } from "@/game/core/london";
import type { WorldMap } from "@/game/core/world";

/**
 * Small, reusable British garden details. The map remains the collision source:
 * every ground-level object stays on an existing tree tile or building plot.
 * Resources belong to this scene, so a later visit never reuses disposed data.
 */
export function addStreetscape(world: THREE.Group, map: WorldMap, phase: "day" | "dusk" | "night") {
  const scenery = new THREE.Group();
  scenery.name = "London planted streets";
  scenery.userData.dispose = () => {};
  world.add(scenery);
  if (map.art !== "london") return scenery;

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const crown = new THREE.IcosahedronGeometry(1, 1);
  const smallLeaf = new THREE.IcosahedronGeometry(1, 0);
  const column = new THREE.CylinderGeometry(1, 1, 1, 7);
  const materials = new Map<string, THREE.MeshLambertMaterial>();
  let disposed = false;
  scenery.userData.dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const geometry of [cube, crown, smallLeaf, column]) geometry.dispose();
    const textures = new Set<THREE.Texture>();
    for (const value of materials.values()) {
      for (const property of Object.values(value))
        if (property instanceof THREE.Texture) textures.add(property);
      value.dispose();
    }
    for (const texture of textures) texture.dispose();
    materials.clear();
  };
  const material = (colour: string) => {
    let value = materials.get(colour);
    if (!value) {
      value = new THREE.MeshLambertMaterial({ color: colour, flatShading: true });
      materials.set(colour, value);
    }
    return value;
  };
  const mesh = (geometry: THREE.BufferGeometry, colour: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const object = new THREE.Mesh(geometry, material(colour));
    object.position.set(x, y, z);
    object.scale.set(sx, sy, sz);
    object.castShadow = false;
    object.receiveShadow = false;
    scenery.add(object);
    return object;
  };
  const box = (colour: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
    mesh(cube, colour, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
  const leaf = (colour: string, x: number, y: number, z: number, w: number, h: number, d = w) =>
    mesh(w < .4 ? smallLeaf : crown, colour, x, y, z, w, h, d);

  const iron = "#34443d";
  const brick = "#9e5c46";
  const mortar = "#c7a88a";
  const stone = "#dac9a7";
  const soil = "#665448";
  const foliage = phase === "day" ? ["#65845a", "#8ba56a"] : ["#617d59", "#849b69"];
  const flowers = ["#e6ba98", "#d1a1a1", "#d5c98e"];
  const source = buildLondon();
  const tile = (x: number, y: number) => map.tiles[y]?.[x];
  const onTree = (x: number, y: number) => tile(x, y) === "T";

  // Rounded, overlapping crowns have a richer silhouette than a cone while
  // using just three shared 80-triangle shapes per tree. High foliage may
  // overhang a path; trunks, beds and ironwork stay inside its solid tile.
  for (const tree of source.things) {
    if (tree.kind !== "tree" || !onTree(tree.x, tree.y)) continue;
    const { x, y: z } = tree;
    const seed = x * 7 + z * 13;
    const cx = x + 0.5, cz = z + 0.5;
    const blossom = seed % 7 === 0;
    const leaves = blossom ? ["#bd8f82", "#ddb39d"] : foliage;
    const height = 1.95 + (seed % 4) * 0.12;
    mesh(column, "#7a604a", cx, 0.97, cz, 0.12, 1.64, 0.12);
    // A short fork joins the visible trunk to the broad crown.
    const branch = mesh(column, "#7a604a", cx + 0.15, 1.52, cz, 0.07, 0.68, 0.07);
    branch.rotation.z = -0.48;
    leaf(leaves[0], cx - 0.39, height, cz + 0.04, 0.77, 0.7, 0.73);
    leaf(leaves[0], cx + 0.38, height + 0.09, cz + 0.02, 0.76, 0.75, 0.76);
    leaf(leaves[1], cx, height + 0.53, cz - 0.12, 0.83, 0.72, 0.77);

    // Outer groves grow directly from lawns; keep ornate beds for city streets.
    if (tree.id.startsWith("district-")) continue;

    // Cream coping and a planted understorey make each existing tree into a
    // deliberate garden bed rather than scattering new obstacles in the road.
    box(brick, x + 0.035, 0.13, z + 0.035, x + 0.965, 0.3, z + 0.965);
    box(stone, x + 0.02, 0.3, z + 0.02, x + 0.98, 0.35, z + 0.98);
    box(soil, x + 0.105, 0.35, z + 0.105, x + 0.895, 0.365, z + 0.895);
    leaf(foliage[0], x + 0.25, 0.43, z + 0.28, 0.19, 0.16, 0.2);
    leaf(foliage[1], x + 0.76, 0.43, z + 0.72, 0.18, 0.16, 0.19);
    leaf(flowers[seed % flowers.length], x + 0.23, 0.49, z + 0.7, 0.1, 0.08, 0.12);
    leaf(flowers[(seed + 1) % flowers.length], x + 0.75, 0.49, z + 0.28, 0.1, 0.08, 0.12);

    if (seed % 3 === 0) {
      // Iron guards share the same solid tree footprint. Leave the side
      // facing the street open, so the small bed still reads as planting.
      for (const edge of [x + 0.07, x + 0.93]) {
        box(iron, edge - 0.025, 0.35, z + 0.07, edge + 0.025, 0.74, z + 0.12);
        box(iron, edge - 0.025, 0.35, z + 0.86, edge + 0.025, 0.74, z + 0.91);
        box(iron, edge - 0.024, 0.63, z + 0.07, edge + 0.024, 0.69, z + 0.91);
      }
    }
  }

  // Ivy dresses a few blank terrace ends without
  // protruding into the reserved, walkable front-door row.
  for (const building of source.things) {
    if(building.kind==="building" && ["district-campus-studios","district-conservatory"].includes(building.id)) {
      const {x,y:z,w,h,height}=building;
      // Repeated pale roof ribs give the glass halls a conservatory silhouette.
      for(let dx=0.5;dx<w;dx+=2) {
        box(stone,x+dx,height,z+0.3,x+dx+0.1,height+0.4,z+h-0.3);
      }
      box(iron,x+0.3,height,z+0.4,x+w-0.3,height+0.12,z+0.5);
      box(iron,x+0.3,height,z+h-0.5,x+w-0.3,height+0.12,z+h-0.4);
    }
    if (building.kind !== "building" || building.style !== "terrace") continue;
    const seed = building.x * 7 + building.y * 13;
    if (seed % 5 !== 0) continue;
    const x = building.x + 0.24;
    const front = building.y + building.h - 0.018;
    const floors = Math.max(2, Math.min(4, Math.round(building.height)));
    for (let level = 0; level < floors; level++) {
      const side = level % 2 === 0 ? 0 : 0.1;
      leaf(foliage[level % 2], x + side, 0.7 + level * 0.76, front, 0.14, 0.34, 0.018);
    }
  }

  // Brick piers with pale capstones echo the reference garden gates. These
  // sit entirely within the station's solid plot;
  // the central portal and its two-tile approach retain their full width.
  for (const station of source.things) {
    if (station.kind !== "station") continue;
    const front = station.y + station.h;
    for (const x of [station.x + 0.1, station.x + station.w - 0.48]) {
      box(brick, x, 0.17, front - 0.28, x + 0.38, 1.72, front - 0.006);
      for (let course = 0; course < 5; course++) {
        box(mortar, x + 0.01, 0.34 + course * 0.27, front - 0.008, x + 0.37, 0.36 + course * 0.27, front - 0.001);
      }
      box(stone, x - 0.025, 0.12, front - 0.3, x + 0.405, 0.22, front - 0.001);
      box(stone, x - 0.025, 1.68, front - 0.3, x + 0.405, 1.78, front - 0.001);
      // Compact urns sit on the piers, echoing the planted brick gateways.
      mesh(column, stone, x + 0.19, 1.86, front - 0.15, 0.13, 0.16, 0.13);
      leaf(foliage[1], x + 0.19, 2.04, front - 0.15, 0.17, 0.17, 0.14);
    }
  }

  // No dynamic lights, animation, textures or new navigation blockers.
  scenery.userData.treeCount = source.things.filter(t => t.kind === "tree" && onTree(t.x, t.y)).length;
  return scenery;
}
