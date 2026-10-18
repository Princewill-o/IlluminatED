import * as THREE from "three";

type Phase = "day" | "dusk" | "night";
type SurfaceMaterial = THREE.MeshLambertMaterial | THREE.MeshStandardMaterial;

// These are the authored masonry/roof palettes in world3d, rather than a broad
// colour test that would accidentally put bricks on trees, signs or interiors.
const BRICK = new Set([
  "b9634a", "a65840", "d8be92", "ead9bd", "c26b4f", "aa715a",
  "b0624a", "8c4a3a", "c96657", "c49a7c", "c58365", "b5463a",
]);
const SLATE = new Set(["4d5862", "65534f", "46535b", "4c6078", "6a7d8f"]);
const GLASS = new Set(["95cddd", "465967", "c4b284", "b5dce2", "9ec6c9", "bbd9d6"]);
const LANTERN = new Set(["f3d99d", "fff0be"]);

/** Small shared diffuse maps: no normal maps, extra geometry or shader changes. */
function surfaceTexture(slate: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Low contrast keeps the original wall colours and avoids exaggerated joints
  // on the shared unit-box UVs used by buildings of different proportions.
  ctx.fillStyle = slate ? "#bfc5ca" : "#c5bfb5";
  ctx.fillRect(0, 0, 128, 128);
  const columns = 8, rows = slate ? 10 : 12;
  const width = 128 / columns, height = 128 / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = -1; col < columns; col++) {
      const x = col * width + (row % 2) * width / 2;
      const y = row * height;
      const variation = (row * 11 + (col + 1) * 7) % 13;
      const value = 237 + variation;
      ctx.fillStyle = `rgb(${value},${value},${value})`;
      ctx.fillRect(x + 0.6, y + 0.6, width - 1.2, height - 1.2);
      // A restrained lower edge gives each course a little depth at dusk.
      ctx.fillStyle = slate ? "#c4cbd0" : "#d5cec2";
      ctx.fillRect(x + 0.6, y + height - 1.2, width - 1.2, 0.6);
    }
  }
  // Deterministic speckling reads as material grain rather than flat plastic.
  let seed = 1967;
  for (let i = 0; i < 1200; i++) {
    seed = (seed * 16807) % 2147483647;
    const x = seed % 128;
    seed = (seed * 16807) % 2147483647;
    const y = seed % 128;
    ctx.fillStyle = i % 2 ? "#ffffff16" : "#392f2810";
    ctx.fillRect(x, y, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = slate ? "London slate courses" : "London masonry courses";
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  // Roof extrusions already have UVs in model units; box walls have 0–1 UVs.
  if (slate) texture.repeat.set(0.25, 0.4);
  texture.anisotropy = 2;
  return texture;
}

/**
 * Finish static London scenery before instancing. Shared clones preserve the
 * rolling-world shader callback and remain batchable by source/finish variant.
 * The returned disposer owns only resources created by this pass.
 */
export function finishArchitecture(world: THREE.Group, phase: Phase): () => void {
  const materials = new Map<string, SurfaceMaterial>();
  const textures = new Map<"brick" | "slate", THREE.CanvasTexture | null>();
  const getTexture = (kind: "brick" | "slate") => {
    if (!textures.has(kind)) textures.set(kind, surfaceTexture(kind === "slate"));
    return textures.get(kind) ?? null;
  };
  const finish = (source: THREE.Material, mesh: THREE.Mesh): THREE.Material => {
    if (!(source instanceof THREE.MeshLambertMaterial || source instanceof THREE.MeshStandardMaterial)) return source;
    if (source.map || source.vertexColors || !mesh.geometry.getAttribute("uv")) return source;
    const colour = source.color.getHexString();
    const masonry = BRICK.has(colour), slate = SLATE.has(colour);
    const lantern = LANTERN.has(colour), glass = GLASS.has(colour);
    if (!masonry && !slate && !lantern && !glass) return source;
    if (phase === "day" && (glass || lantern)) return source;

    // Keep some panes cool so rows of windows do not all glow identically.
    const seed = Math.abs(Math.round(mesh.position.x * 13) + Math.round(mesh.position.y * 29) + Math.round(mesh.position.z * 19));
    const lit = lantern || colour === "c4b284" || seed % 5 < 3;
    const variant = masonry ? "brick" : slate ? "slate" : lit ? "lit" : "unlit";
    const key = `${source.uuid}:${variant}`;
    let material = materials.get(key);
    if (!material) {
      material = source.clone();
      // Material.clone deliberately does not copy these callbacks in Three.js.
      // Losing the callback here would leave masonry floating above curved roads.
      material.onBeforeCompile = source.onBeforeCompile;
      material.customProgramCacheKey = source.customProgramCacheKey;
      material.name = `${source.name || colour} · London ${variant}`;
      if (masonry || slate) {
        material.map = getTexture(masonry ? "brick" : "slate");
      } else if (lit) {
        material.color.set(lantern ? "#ffe5a6" : "#d9b276");
        material.emissive.set(lantern ? "#ffcb79" : "#ffc17a");
        material.emissiveIntensity = phase === "night" ? (lantern ? 0.85 : 0.48) : (lantern ? 0.3 : 0.16);
      } else {
        material.color.set("#49677a");
        material.emissive.set("#273a60");
        material.emissiveIntensity = phase === "night" ? 0.15 : 0.04;
      }
      materials.set(key, material);
    }
    return material;
  };

  world.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(material => finish(material, mesh))
      : finish(mesh.material, mesh);
  });

  return () => {
    materials.forEach(material => material.dispose());
    textures.forEach(texture => texture?.dispose());
    materials.clear();
    textures.clear();
  };
}
