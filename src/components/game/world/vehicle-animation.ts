import * as THREE from "three";

import { motionDynamics, restingMotion } from "@/game/core/motion-dynamics";

interface VehicleRig {
  update: (
    distance: number,
    speed: number,
    turn: number,
    dt: number,
    time: number,
    night: boolean,
    reduced: boolean,
  ) => void;
  dispose: () => void;
}

/** Our GLBs combine all tyres into one primitive. Separate its disconnected
 * quadrants into real wheel pivots without editing the cached source asset. */
function splitWheels(
  mesh: THREE.Mesh,
  geometries: THREE.BufferGeometry[],
  forward: "x" | "z",
) {
  const indexed = mesh.geometry.index !== null;
  const source = indexed ? mesh.geometry.toNonIndexed() : mesh.geometry;
  const position = source.getAttribute("position");
  const parts = new Map<string, number[]>();
  for (let i = 0; i < position.count; i += 3) {
    const x =
      (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
    const z =
      (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
    const key = `${Math.sign(x)}:${Math.sign(z)}`;
    const vertices = parts.get(key) ?? [];
    vertices.push(i, i + 1, i + 2);
    parts.set(key, vertices);
  }
  const pivots: Array<{ pivot: THREE.Group; front: boolean; radius: number }> =
    [];
  for (const vertices of parts.values()) {
    const geometry = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(source.attributes)) {
      const values: number[] = [];
      for (const i of vertices)
        for (let c = 0; c < attribute.itemSize; c++)
          values.push(attribute.getComponent(i, c));
      geometry.setAttribute(
        name,
        new THREE.Float32BufferAttribute(values, attribute.itemSize),
      );
    }
    geometry.computeBoundingBox();
    const centre = geometry.boundingBox!.getCenter(new THREE.Vector3());
    const size = geometry.boundingBox!.getSize(new THREE.Vector3());
    geometry.translate(-centre.x, -centre.y, -centre.z);
    geometries.push(geometry);
    const pivot = new THREE.Group();
    pivot.name = "animated-wheel";
    pivot.position.copy(centre);
    pivot.add(new THREE.Mesh(geometry, mesh.material));
    mesh.parent?.add(pivot);
    pivots.push({
      pivot,
      front: centre[forward] > 0,
      radius: Math.max(size.y, forward === "z" ? size.z : size.x) / 2,
    });
  }
  mesh.removeFromParent();
  if (indexed) source.dispose();
  return pivots;
}

/** Individual paint/reflection and lamp state per car, with shared source GLBs. */
export function rigVehicle(
  model: THREE.Object3D,
  wheelScale = 1,
  forward: "x" | "z" = "z",
): VehicleRig {
  const materials = new Map<THREE.Material, THREE.MeshStandardMaterial>();
  const geometries: THREE.BufferGeometry[] = [];
  const lights: THREE.MeshStandardMaterial[] = [],
    tails: THREE.MeshStandardMaterial[] = [];
  const wheels: ReturnType<typeof splitWheels> = [];
  const candidates: THREE.Mesh[] = [];
  model.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) candidates.push(object as THREE.Mesh);
  });
  const finish = (source: THREE.Material) => {
    if (!(source instanceof THREE.MeshStandardMaterial)) return source;
    let material = materials.get(source);
    if (!material) {
      const name = source.name.toLowerCase();
      material =
        name === "paint" || name === "glass"
          ? new THREE.MeshPhysicalMaterial({
              color: source.color,
              map: source.map,
              roughness: name === "glass" ? 0.13 : 0.28,
              metalness: name === "glass" ? 0.25 : 0.34,
              clearcoat: 1,
              clearcoatRoughness: 0.12,
            })
          : source.clone();
      material.name = source.name;
      if (/lamp|headlight/.test(name)) {
        material.emissive.set("#ffe7b0");
        lights.push(material);
      }
      if (/tail/.test(name)) {
        material.emissive.set("#ff2921");
        tails.push(material);
      }
      if (/chrome|hub/.test(name)) {
        material.metalness = 0.72;
        material.roughness = 0.24;
      }
      if (name === "hub") {
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying vec2 vHub;",
            )
            .replace(
              "#include <begin_vertex>",
              `#include <begin_vertex>\nvHub=position.${forward === "z" ? "yz" : "yx"};`,
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying vec2 vHub;",
            )
            .replace(
              "#include <color_fragment>",
              "#include <color_fragment>\ndiffuseColor.rgb*=mix(.28,1.0,smoothstep(.68,.8,abs(sin(atan(vHub.y,vHub.x)*3.0))));",
            );
        };
        material.customProgramCacheKey = () =>
          `rotating-alloy-spokes-${forward}-v1`;
      }
      materials.set(source, material);
    }
    return material;
  };
  for (const mesh of candidates) {
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(finish)
      : finish(mesh.material);
    if (
      !Array.isArray(mesh.material) &&
      /^(rubber|hub)$/.test(mesh.material.name)
    )
      wheels.push(...splitWheels(mesh, geometries, forward));
  }
  const initialY = model.position.y;
  let dynamics = restingMotion(),
    rotation = 0,
    lastSpeed = 0,
    released = false;
  const rig: VehicleRig = {
    update: (distance, speed, turn, dt, time, night, reduced) => {
      dynamics = motionDynamics(dynamics, speed, turn, dt, reduced, true);
      if (!reduced)
        rotation +=
          distance /
          Math.max(
            0.05,
            (wheels.find((w) => w.radius > 0.05)?.radius ?? 0.25) * wheelScale,
          );
      for (const { pivot, front } of wheels) {
        const spin = reduced ? 0 : rotation;
        const steer =
          front && !reduced ? Math.max(-0.3, Math.min(0.3, turn * 0.14)) : 0;
        pivot.rotation.set(
          forward === "z" ? spin : 0,
          steer,
          forward === "x" ? -spin : 0,
          forward === "z" ? "YXZ" : "YZX",
        );
      }
      model.rotation.x = forward === "z" ? dynamics.pitch : dynamics.bank;
      model.rotation.z = forward === "z" ? dynamics.bank : -dynamics.pitch;
      model.position.y =
        initialY +
        (reduced
          ? 0
          : Math.sin(time * 13) * Math.min(0.009, Math.abs(speed) * 0.002));
      const braking =
        Math.abs(lastSpeed) - Math.abs(speed) > Math.max(0.02, dt * 1.5);
      lights.forEach((material) => {
        material.emissiveIntensity = night ? 2.2 : 0.12;
      });
      tails.forEach((material) => {
        material.emissiveIntensity = braking ? 2.6 : night ? 0.6 : 0.06;
      });
      lastSpeed = speed;
    },
    dispose: () => {
      if (released) return;
      released = true;
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
  return rig;
}

/** Derive cosmetic movement from actual displacement: stopped cars cannot have
 * spinning wheels, and teleports never produce a suspension/steering explosion. */
export function animateVehicle(
  root: THREE.Object3D,
  dt: number,
  time: number,
  night: boolean,
  reduced: boolean,
) {
  const previous = root.userData.motionSample as
    { x: number; z: number; heading: number } | undefined;
  const { x, z } = root.position,
    heading = -root.rotation.y;
  const dx = previous ? x - previous.x : 0,
    dz = previous ? z - previous.z : 0;
  const distance =
    Math.hypot(dx, dz) < 3
      ? dx * Math.cos(heading) + dz * Math.sin(heading)
      : 0;
  const speed = dt > 0 ? distance / dt : 0;
  const turn =
    previous && dt > 0
      ? Math.atan2(
          Math.sin(heading - previous.heading),
          Math.cos(heading - previous.heading),
        ) / dt
      : 0;
  root.userData.motionSample = { x, z, heading };
  root.traverse((object) =>
    (object.userData.vehicleRig as VehicleRig | undefined)?.update(
      distance,
      speed,
      turn,
      dt,
      time,
      night,
      reduced,
    ),
  );
}

export function disposeVehicle(root: THREE.Object3D) {
  root.traverse((object) => {
    object.userData.vehicleRemoved = true;
    (object.userData.vehicleRig as VehicleRig | undefined)?.dispose();
  });
}
