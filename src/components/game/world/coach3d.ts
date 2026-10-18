"use client";

import * as THREE from "three";

import {
  COACHES,
  COACH_LENGTH,
  COACH_WIDTH,
  type CoachId,
} from "@/game/core/coaches";

/** Single-deck, three-axle touring coach. +X is forwards, matching road traffic. */
export function coachModel(id: CoachId) {
  const livery = COACHES.find((c) => c.id === id)!;
  const root = new THREE.Group();
  root.name = `coach-${id}`;
  root.userData = {
    coach: id,
    brand: livery.name,
    length: COACH_LENGTH,
    width: COACH_WIDTH,
  };
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (colour: string) => {
    let m = materials.get(colour);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color: colour,
        roughness: 0.52,
        metalness: 0.12,
      });
      materials.set(colour, m);
    }
    return m;
  };
  const box = (
    name: string,
    colour: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material(colour),
    );
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  box("lower-body", livery.body, 0, 0.78, 0, COACH_LENGTH, 0.9, COACH_WIDTH);
  box(
    "upper-body",
    livery.body,
    -0.04,
    1.75,
    0,
    COACH_LENGTH - 0.16,
    1.15,
    COACH_WIDTH - 0.08,
  );
  box(
    "panoramic-windows",
    "#182d3a",
    0.04,
    1.87,
    0,
    COACH_LENGTH - 0.46,
    0.68,
    COACH_WIDTH + 0.012,
  );
  box(
    "roof",
    livery.body,
    -0.12,
    2.38,
    0,
    COACH_LENGTH - 0.28,
    0.14,
    COACH_WIDTH - 0.12,
  );
  box("air-conditioning", "#d2d6d3", -0.6, 2.49, 0, 1.35, 0.16, 1.1);
  box(
    "windscreen",
    "#102b39",
    COACH_LENGTH / 2 + 0.012,
    1.76,
    0,
    0.04,
    1.12,
    COACH_WIDTH - 0.16,
  );
  box(
    "rear-window",
    "#1c3440",
    -COACH_LENGTH / 2 - 0.012,
    1.88,
    0,
    0.035,
    0.62,
    COACH_WIDTH - 0.2,
  );
  box(
    "front-grille",
    "#1d2832",
    COACH_LENGTH / 2 + 0.03,
    0.56,
    0,
    0.045,
    0.25,
    0.95,
  );
  for (const side of [-1, 1]) {
    box(
      "luggage-trim",
      livery.accent,
      -0.15,
      0.65,
      side * (COACH_WIDTH / 2 + 0.015),
      COACH_LENGTH - 0.7,
      0.07,
      0.025,
    );
    for (const x of [-2.7, -1.4, 0, 1.4])
      box(
        "window-pillar",
        livery.body,
        x,
        1.88,
        side * (COACH_WIDTH / 2 + 0.018),
        0.045,
        0.7,
        0.025,
      );
    for (const x of [-1.8, -0.6, 0.6])
      box(
        "luggage-door-edge",
        "#66717a",
        x,
        0.83,
        side * (COACH_WIDTH / 2 + 0.02),
        0.025,
        0.53,
        0.02,
      );
    box("mirror-arm", "#1d2832", 2.99, 1.94, side * 1.04, 0.3, 0.07, 0.22);
    box("mirror", "#151e27", 3.1, 1.85, side * 1.13, 0.13, 0.28, 0.14);
    box(
      "headlight",
      "#fff4d0",
      COACH_LENGTH / 2 + 0.045,
      0.87,
      side * 0.65,
      0.06,
      0.18,
      0.33,
    );
    box(
      "tail-light",
      "#db343a",
      -COACH_LENGTH / 2 - 0.045,
      0.82,
      side * 0.65,
      0.06,
      0.32,
      0.16,
    );
    for (const x of [-2.25, -1.3, 2.15]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.18, 16),
        material("#20252a"),
      );
      wheel.name = "wheel";
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.43, side * 0.88);
      root.add(wheel);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.19, 12),
        material("#c8ced1"),
      );
      hub.rotation.x = Math.PI / 2;
      hub.position.copy(wheel.position);
      root.add(hub);
    }
    const logo = brandPanel(id, side);
    logo.position.set(-0.15, 1.23, side * (COACH_WIDTH / 2 + 0.035));
    logo.rotation.y = side > 0 ? 0 : Math.PI;
    root.add(logo);
  }
  box(
    "passenger-door",
    "#152d3b",
    2.6,
    1.14,
    -COACH_WIDTH / 2 - 0.025,
    0.6,
    1.58,
    0.025,
  );
  const front = brandPanel(id, 1, true);
  front.position.set(COACH_LENGTH / 2 + 0.05, 1.27, 0);
  front.rotation.y = Math.PI / 2;
  root.add(front);
  let disposed = false;
  root.userData.dispose = () => {
    if (disposed) return;
    disposed = true;
    const geometries = new Set<THREE.BufferGeometry>(),
      ownedMaterials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      geometries.add(mesh.geometry);
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]) {
        ownedMaterials.add(material);
        if (material instanceof THREE.MeshBasicMaterial && material.map)
          textures.add(material.map);
      }
    });
    geometries.forEach((g) => g.dispose());
    ownedMaterials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    root.removeFromParent();
    root.clear();
  };
  return root;
}

function brandPanel(id: CoachId, _side: number, front = false) {
  const brand = COACHES.find((c) => c.id === id)!;
  let texture: THREE.CanvasTexture | undefined;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 192;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = brand.body;
      ctx.fillRect(0, 0, 1024, 192);
      ctx.fillStyle = brand.ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font =
        id === "airline"
          ? "italic 112px Georgia, serif"
          : "bold 100px Arial, sans-serif";
      ctx.fillText(brand.name, 512, 82, 900);
      ctx.font = "bold 26px Arial, sans-serif";
      ctx.fillText(brand.destination.toUpperCase(), 512, 159, 850);
      if (id === "national-express") {
        ctx.fillStyle = "#d63e3c";
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(30 + i * 22, 26);
          ctx.lineTo(43 + i * 22, 26);
          ctx.lineTo(68 + i * 22, 112);
          ctx.lineTo(55 + i * 22, 112);
          ctx.fill();
        }
      } else if (id === "flixbus") {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(23, 52);
        ctx.lineTo(50, 52);
        ctx.lineTo(72, 80);
        ctx.lineTo(50, 109);
        ctx.lineTo(23, 109);
        ctx.lineTo(45, 80);
        ctx.fill();
      } else {
        ctx.strokeStyle = "#e6bb43";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(52, 155);
        ctx.bezierCurveTo(150, 170, 220, 130, 260, 110);
        ctx.stroke();
      }
      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
    }
  }
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(front ? 1.35 : 4.4, front ? 0.25 : 0.6),
    new THREE.MeshBasicMaterial({
      map: texture ?? null,
      color: texture ? "#ffffff" : brand.body,
      side: THREE.DoubleSide,
    }),
  );
  panel.name = `logo-${id}`;
  panel.userData.brand = brand.name;
  return panel;
}
