import * as THREE from "three";

import { vegetationShader } from "./vegetation-shader";
import { wildflowers } from "./wildflowers3d";

import type { WorldMap } from "@/game/core/world";

/** Dense nearby grass in one reusable instance buffer, on existing lawns only.
 * Refill on district boundaries rather than allocating an entire world's grass. */
export function addMeadow(world: THREE.Group, map: WorldMap, mobile: boolean) {
  const group = new THREE.Group();
  group.name = "Sunlit meadow tufts";
  world.add(group);
  const positions: number[] = [],
    colours: number[] = [];
  const bottom = new THREE.Color("#537144"),
    tip = new THREE.Color("#c4cc79");
  for (let blade = 0; blade < 5; blade++) {
    const angle = blade * 2.39996;
    const x = Math.cos(angle) * 0.065,
      z = Math.sin(angle) * 0.065;
    const height = 0.12 + (blade % 3) * 0.045;
    positions.push(
      x - 0.025,
      0,
      z,
      x + 0.025,
      0,
      z,
      x + Math.cos(angle) * 0.045,
      height,
      z + Math.sin(angle) * 0.055,
    );
    bottom.toArray(colours, colours.length);
    bottom.toArray(colours, colours.length);
    tip.toArray(colours, colours.length);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  const breezeTime = { value: 0 };
  vegetationShader(material, breezeTime, true);
  group.userData.animate = (seconds: number) => {
    breezeTime.value = seconds;
  };
  const flowers = wildflowers(breezeTime, mobile ? 48 : 160);
  group.add(flowers.mesh);
  const maximum = mobile ? 2400 : 7000;
  const dummy = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(geometry, material, maximum);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.receiveShadow = true;
  group.add(mesh);
  let region = "";
  group.userData.update = (focusX: number, focusZ: number) => {
    const cx = Math.floor(focusX / 6) * 6,
      cz = Math.floor(focusZ / 6) * 6;
    const next = `${cx}:${cz}`;
    if (next === region) return;
    region = next;
    let count = 0,
      flowerCount = 0;
    const lawns: Array<{ x: number; z: number; seed: number }> = [];
    for (let z = Math.max(1, cz - 20); z < Math.min(map.rows - 1, cz + 26); z++)
      for (
        let x = Math.max(1, cx - 20);
        x < Math.min(map.cols - 1, cx + 26);
        x++
      ) {
        if (map.tiles[z]?.[x] !== "g") continue;
        const seed =
          (Math.imul(x + 1, 73856093) ^ Math.imul(z + 1, 19349663)) >>> 0;
        lawns.push({ x, z, seed });
      }
    // Prioritise visible gardens when the local area exceeds the fixed budget.
    lawns.sort(
      (a, b) =>
        Math.hypot(a.x - cx - 3, a.z - cz - 3) -
        Math.hypot(b.x - cx - 3, b.z - cz - 3),
    );
    for (const { x, z, seed } of lawns) {
      if (seed % 7 === 0)
        for (let i = 0; i < 4 && flowerCount < (mobile ? 48 : 160); i++) {
          dummy.position.set(
            x + 0.12 + ((seed + i * 163) % 733) / 1000,
            0.052,
            z + 0.12 + ((seed + i * 251) % 733) / 1000,
          );
          dummy.rotation.y = seed;
          dummy.scale.setScalar(0.85 + ((seed + i) % 4) * 0.12);
          dummy.updateMatrix();
          flowers.mesh.setMatrixAt(flowerCount++, dummy.matrix);
        }
      for (let i = 0; i < (mobile ? 8 : 22) && count < maximum; i++) {
        dummy.position.set(
          x + 0.08 + ((seed + i * 137) % 839) / 1000,
          0.052,
          z + 0.08 + ((seed + i * 223) % 839) / 1000,
        );
        dummy.rotation.y = ((seed + i * 17) % 628) / 100;
        dummy.scale.setScalar(0.7 + ((seed + i * 7) % 60) / 100);
        dummy.updateMatrix();
        mesh.setMatrixAt(count++, dummy.matrix);
      }
      if (count === maximum) break;
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    flowers.mesh.count = flowerCount;
    flowers.mesh.instanceMatrix.needsUpdate = true;
    flowers.mesh.computeBoundingSphere();
    group.userData.tuftCount = count;
  };
  group.userData.update(map.cols / 2, map.rows / 2);
  group.userData.dispose = () => {
    geometry.dispose();
    material.dispose();
    flowers.dispose();
  };
  return group;
}
