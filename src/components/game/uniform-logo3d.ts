"use client";
import * as THREE from "three";

import { logoFor } from "@/game/core/logos";
/** Sew a small logo onto the torso bone, so it follows the uniform while walking. */
export function addUniformLogo(
  object: THREE.Object3D,
  body: THREE.SkinnedMesh | null,
  id: string | null,
) {
  const logo = id ? logoFor(id) : null;
  const torso = object.getObjectByName("torso");
  if (!logo || !torso || !body) return;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(2, 2);
  ctx.fillStyle = logo.bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, 64, 64, 14);
  ctx.fill();
  for (const shape of logo.shapes)
    if (shape.fill !== "none") {
      ctx.fillStyle = shape.fill;
      ctx.fill(new Path2D(shape.d));
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const bounds = new THREE.Box3().setFromObject(body);
  const size =
    Math.min(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y) * 0.28;
  const patch = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      side: THREE.DoubleSide,
    }),
  );
  patch.name = "uniform-workplace-logo";
  patch.position.set(
    (bounds.min.x + bounds.max.x) / 2 - size * 0.5,
    bounds.min.y + (bounds.max.y - bounds.min.y) * 0.7,
    bounds.max.z + 0.005,
  );
  torso.attach(patch);
}
