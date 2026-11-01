import * as THREE from "three";

import { buildLondon } from "@/game/core/london";
import type { WorldMap } from "@/game/core/world";

/** A small local pool of drifting leaves. No emitters, physics bodies or
 * allocations per frame; replenish the tree list only after crossing a block. */
export function driftingLeaves(
  world: THREE.Group,
  map: WorldMap,
  mobile: boolean,
) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0, -0.09, -0.045, 0, 0, 0, 0.012, 0.085, 0, 0, -0.09, 0, 0.012,
        0.085, 0.045, 0, 0,
      ],
      3,
    ),
  );
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const count = mobile ? 20 : 56;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = "Drifting autumn leaves";
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.receiveShadow = true;
  const palette = ["#e6ad57", "#d57a4d", "#c76779", "#c7ba70"];
  for (let i = 0; i < count; i++)
    mesh.setColorAt(i, new THREE.Color(palette[i % palette.length]));
  world.add(mesh);
  const trees = buildLondon().things.filter(
    (t) => t.kind === "tree" && map.tiles[t.y]?.[t.x] === "T",
  );
  let nearby: typeof trees = [],
    block = "";
  const dummy = new THREE.Object3D();
  return {
    object: mesh,
    update: (seconds: number, x: number, z: number, reduced: boolean) => {
      const next = `${Math.floor(x / 8)}:${Math.floor(z / 8)}`;
      if (next !== block) {
        block = next;
        nearby = trees.filter(
          (tree) => Math.abs(tree.x - x) < 17 && Math.abs(tree.y - z) < 17,
        );
      }
      mesh.visible = !reduced && nearby.length > 0;
      if (!mesh.visible) return;
      for (let i = 0; i < count; i++) {
        const tree = nearby[i % nearby.length];
        const cycle = (seconds * (0.11 + (i % 3) * 0.013) + i * 0.618) % 1;
        const angle = seconds * 0.8 + i * 2.4;
        dummy.position.set(
          tree.x + 0.5 + Math.sin(angle) * 0.55 + cycle * 0.5,
          0.16 + (1 - cycle) * 2.7,
          tree.y + 0.5 + Math.cos(angle * 0.7) * 0.7,
        );
        dummy.rotation.set(angle, angle * 0.7, Math.sin(angle * 1.3) * 0.8);
        dummy.scale.setScalar(0.65 + (i % 4) * 0.16);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
