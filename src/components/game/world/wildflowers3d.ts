import * as THREE from "three";

import { vegetationShader } from "./vegetation-shader";

/** One tiny flower geometry, repeated with individual colours and stem sway. */
export function wildflowers(time: { value: number }, maximum: number) {
  const positions: number[] = [],
    colours: number[] = [];
  const triangle = (points: number[], colour: string) => {
    positions.push(...points);
    const tint = new THREE.Color(colour);
    for (let i = 0; i < 3; i++) tint.toArray(colours, colours.length);
  };
  triangle([-0.009, 0, 0, 0.009, 0, 0, 0.008, 0.22, 0], "#487147");
  triangle([-0.009, 0, 0, 0.008, 0.22, 0, -0.008, 0.22, 0], "#487147");
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3,
      b = a + 0.38;
    const x = Math.cos(a) * 0.09,
      z = Math.sin(a) * 0.09;
    triangle(
      [
        0,
        0.218,
        0,
        Math.cos(a - 0.38) * 0.065,
        0.224,
        Math.sin(a - 0.38) * 0.065,
        x,
        0.23,
        z,
      ],
      "#fff3d8",
    );
    triangle(
      [
        0,
        0.218,
        0,
        x,
        0.23,
        z,
        Math.cos(b) * 0.065,
        0.224,
        Math.sin(b) * 0.065,
      ],
      "#fff3d8",
    );
    triangle(
      [
        0,
        0.231,
        0,
        Math.cos(a) * 0.025,
        0.231,
        Math.sin(a) * 0.025,
        Math.cos(a + Math.PI / 3) * 0.025,
        0.231,
        Math.sin(a + Math.PI / 3) * 0.025,
      ],
      "#ffca65",
    );
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
    roughness: 0.94,
  });
  vegetationShader(material, time, true);
  const mesh = new THREE.InstancedMesh(geometry, material, maximum);
  mesh.name = "Garden wildflowers";
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const palette = ["#fff1df", "#ef99b3", "#c8b2ef", "#f4cc76"];
  for (let i = 0; i < maximum; i++)
    mesh.setColorAt(i, new THREE.Color(palette[i % palette.length]));
  mesh.count = 0;
  mesh.receiveShadow = true;
  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
