import * as THREE from "three";

import type { createFoliage } from "./foliage3d";
import TREES from "../../../../public/world3d/folio-reference/trees.json";

/** Bruno Simon's MIT-licensed authored branch meshes and canopy references,
 * decoded offline. Existing map tree tiles remain the collision authority. */
export function referenceTrees(foliage: ReturnType<typeof createFoliage>) {
  const material = new THREE.MeshStandardMaterial({
    color: "#a68469",
    roughness: 0.94,
  });
  const geometries = new Map<keyof typeof TREES, THREE.BufferGeometry>();
  let released = false,
    palette: THREE.Texture | null = null;
  if (typeof window !== "undefined")
    new THREE.TextureLoader().load(
      "/world3d/folio-reference/palette.png",
      (texture) => {
        if (released) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.flipY = false;
        palette = texture;
        material.map = texture;
        material.color.set("#ffffff");
        material.needsUpdate = true;
      },
      undefined,
      () => {
        /* Local bark colour remains available offline. */
      },
    );
  return {
    create: (kind: keyof typeof TREES, colour: string, height: number) => {
      const data = TREES[kind];
      let geometry = geometries.get(kind);
      if (!geometry) {
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(data.attributes.POSITION, 3),
        );
        geometry.setAttribute(
          "normal",
          new THREE.Float32BufferAttribute(data.attributes.NORMAL, 3),
        );
        geometry.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute(data.attributes.TEXCOORD_0, 2),
        );
        geometry.setIndex(data.indices);
        geometries.set(kind, geometry);
      }
      const group = new THREE.Group();
      group.name = `Authored ${kind} park tree`;
      const body = new THREE.Mesh(geometry, material);
      body.castShadow = body.receiveShadow = true;
      group.add(body);
      for (const reference of data.leaves) {
        const leaves = foliage.mesh(colour);
        leaves.position.fromArray(reference.position);
        leaves.scale.setScalar(reference.scale);
        group.add(leaves);
      }
      const sourceHeight = Math.max(
        ...data.leaves.map((leaf) => leaf.position[1] + leaf.scale * 1.2),
      );
      group.scale.setScalar(height / sourceHeight);
      return group;
    },
    dispose: () => {
      if (released) return;
      released = true;
      geometries.forEach((geometry) => geometry.dispose());
      material.dispose();
      palette?.dispose();
    },
  };
}
