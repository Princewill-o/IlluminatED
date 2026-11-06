import * as THREE from "three";

import { vegetationShader } from "./vegetation-shader";

/** Cutout leaf sprays: soft canopy normals with detailed silhouettes, instead
 * of lighting every little card as a flat polygon. One shared canopy mesh. */
export function createFoliage() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  for (let i = 0; i < 13; i++) {
    const angle = i * 2.399963;
    const r = i === 0 ? 0 : 15 + i * 2.2;
    const x = 64 + Math.cos(angle) * r,
      y = 64 + Math.sin(angle) * r;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + 0.6);
    const shade = 178 + ((i * 17) % 76);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10 + (i % 4), 5 + (i % 3), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.24)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(9, 0);
    ctx.stroke();
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [];
  // The reference keeps leaf cards facing the default camera and uses outward
  // canopy normals for shading. Random 3D card rotations made our trees sparse.
  const facing = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 9.8, 12.4).normalize(),
  );
  const orientation = new THREE.Quaternion(),
    roll = new THREE.Quaternion();
  const cardAxis = new THREE.Vector3(0, 0, 1);
  const vertex = new THREE.Vector3(),
    normal = new THREE.Vector3();
  const count = 76;
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2;
    const radius = Math.sqrt(1 - y * y),
      angle = i * 2.399963;
    const x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius;
    const spread = 0.74 + (i % 5) * 0.045;
    normal.set(x, y * 0.7 + 0.35, z).normalize();
    roll.setFromAxisAngle(cardAxis, angle);
    orientation.copy(facing).multiply(roll);
    const size = 0.37 + (i % 4) * 0.035;
    for (const [u, v] of [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
      [1, 1],
      [0, 1],
    ]) {
      vertex
        .set((u - 0.5) * size * 2, (v - 0.5) * size * 2, 0)
        .applyQuaternion(orientation);
      positions.push(
        vertex.x + x * spread,
        vertex.y + y * spread * 1.04,
        vertex.z + z * spread,
      );
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(u, v);
    }
  }
  // Low-poly look: one faceted crown (a slightly irregular icosahedron with
  // flat faces) instead of leaf cards. It outlines cleanly and costs fewer triangles.
  void positions; void normals; void uvs;
  const crown = new THREE.IcosahedronGeometry(0.86, 1);
  const p = crown.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const wobble = 1 + Math.sin(i * 12.9898) * 0.07;
    p.setXYZ(i, p.getX(i) * wobble, p.getY(i) * wobble * 1.05, p.getZ(i) * wobble);
  }
  const geometry = crown.toNonIndexed();
  crown.dispose();
  geometry.computeVertexNormals();
  const time = { value: 0 },
    materials = new Map<string, THREE.MeshStandardMaterial>();
  let released = false;
  const screenFocus = { value: new THREE.Vector2(-10, -10) };
  const screenSize = { value: new THREE.Vector2(1, 1) };
  const depth = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
  });
  vegetationShader(depth, time);
  const materialFor = (colour: string) => {
    let material = materials.get(colour);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color: colour,
        alphaTest: 0.45,
        roughness: 0.9,
        flatShading: true,
      });
      vegetationShader(material, time);
      const prepare = material.onBeforeCompile;
      material.onBeforeCompile = (shader, renderer) => {
        prepare.call(material!, shader, renderer);
        shader.uniforms.uFoliageFocus = screenFocus;
        shader.uniforms.uFoliageViewport = screenSize;
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nuniform vec2 uFoliageFocus,uFoliageViewport;",
          )
          .replace(
            "#include <alphatest_fragment>",
            `
            // Like the reference's see-through foliage, keep the player readable
            // when a canopy crosses the camera. Cutout edges avoid sorting layers.
            vec2 foliageScreen=gl_FragCoord.xy/uFoliageViewport;
            vec2 foliageDelta=(foliageScreen-uFoliageFocus)*vec2(uFoliageViewport.x/uFoliageViewport.y,1.0);
            float foliageOpening=smoothstep(.035,.105,length(foliageDelta));
            diffuseColor.a*=mix(.22,1.0,foliageOpening);
            #include <alphatest_fragment>`,
          );
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <lights_fragment_end>",
          `#include <lights_fragment_end>
          #if NUM_DIR_LIGHTS > 0
            float leafTransmission=pow(max(dot(-normal,directionalLights[0].direction),0.0),2.0);
            reflectedLight.directDiffuse+=material.diffuseColor*directionalLights[0].color*leafTransmission*.2;
          #endif`,
        );
      };
      material.customProgramCacheKey = () =>
        "leaf-canopy-transmission-focus-v2";
      materials.set(colour, material);
    }
    return material;
  };
  return {
    mesh: (colour: string) => {
      const mesh = new THREE.Mesh(geometry, materialFor(colour));
      mesh.userData.foliage = true;
      mesh.customDepthMaterial = depth;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      return mesh;
    },
    update: (seconds: number) => {
      time.value = seconds;
    },
    focus: (x: number, y: number, width: number, height: number) => {
      screenFocus.value.set(x, y);
      screenSize.value.set(width, height);
    },
    dispose: () => {
      if (released) return;
      released = true;
      geometry.dispose();
      texture.dispose();
      depth.dispose();
      materials.forEach((m) => m.dispose());
    },
  };
}
