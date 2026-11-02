import * as THREE from "three";

import type { WorldNavigation } from "@/game/core/navigation";
import { TILE } from "@/game/core/world";

/** A real ground ribbon, sharing the same geometry/collision route as the map. */
export function createNavigationTrail(
  scene: THREE.Scene,
  bend: (material: THREE.Material) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ff339f";
  ctx.fillRect(0, 0, 128, 32);
  ctx.strokeStyle = "#fff3fb";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(46, 4);
  ctx.lineTo(65, 16);
  ctx.lineTo(46, 28);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    toneMapped: false,
  });
  bend(material);
  const ribbon = new THREE.Mesh(new THREE.BufferGeometry(), material);
  ribbon.renderOrder = 5;
  scene.add(ribbon);
  const beaconMaterial = new THREE.MeshBasicMaterial({
    color: "#ff339f",
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  bend(beaconMaterial);
  const beacon = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.83, 40),
    beaconMaterial,
  );
  beacon.rotation.x = -Math.PI / 2;
  scene.add(beacon);
  let previous: WorldNavigation | null = null;
  return {
    update(route: WorldNavigation | null, seconds: number, reduce: boolean) {
      ribbon.visible = Boolean(route?.points.length);
      beacon.visible = Boolean(route?.points.length);
      texture.offset.x = reduce ? 0 : -seconds * 0.65;
      if (route !== previous) {
        previous = route;
        const vertices: number[] = [],
          uvs: number[] = [];
        let length = 0;
        // Only the near section needs geometry. The complete route stays in navigation state.
        const points = route?.points.slice(0, 180) ?? [];
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1],
            b = points[i],
            dx = (b.x - a.x) / TILE,
            dz = (b.y - a.y) / TILE,
            d = Math.hypot(dx, dz);
          if (!d) continue;
          const w = route?.driving ? 0.28 : 0.17,
            nx = (-dz / d) * w,
            nz = (dx / d) * w,
            ax = a.x / TILE,
            az = a.y / TILE,
            bx = b.x / TILE,
            bz = b.y / TILE,
            y = 0.16;
          vertices.push(
            ax + nx,
            y,
            az + nz,
            ax - nx,
            y,
            az - nz,
            bx + nx,
            y,
            bz + nz,
            ax - nx,
            y,
            az - nz,
            bx - nx,
            y,
            bz - nz,
            bx + nx,
            y,
            bz + nz,
          );
          uvs.push(
            length,
            0,
            length,
            1,
            length + d,
            0,
            length,
            1,
            length + d,
            1,
            length + d,
            0,
          );
          length += d;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(vertices, 3),
        );
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        geometry.computeBoundingSphere();
        ribbon.geometry.dispose();
        ribbon.geometry = geometry;
      }
      const end = route?.points.at(-1);
      if (end) {
        beacon.position.set(end.x / TILE, 0.18, end.y / TILE);
        beacon.scale.setScalar(reduce ? 1 : 1 + Math.sin(seconds * 3) * 0.12);
      }
    },
    dispose() {
      ribbon.removeFromParent();
      beacon.removeFromParent();
      ribbon.geometry.dispose();
      beacon.geometry.dispose();
      material.dispose();
      beaconMaterial.dispose();
      texture.dispose();
    },
  };
}
