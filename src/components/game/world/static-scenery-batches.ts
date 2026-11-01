import * as THREE from "three";
import { deinterleaveGeometry, mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const TRANSFORMED = new Set(["position", "normal", "tangent"]);
const MAX_VERTICES = 250_000;

/** Compatibility key for a caller-selected static mesh, excluding its location.
 * The caller adds a spatial cell so merged bounds still permit useful culling. */
export function staticScenerySignature(mesh: THREE.Mesh): string | null {
  const geometry = mesh.geometry;
  if (Array.isArray(mesh.material) || (mesh as THREE.SkinnedMesh).isSkinnedMesh ||
      (mesh as THREE.InstancedMesh).isInstancedMesh || !geometry.attributes.position ||
      geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity ||
      Object.values(geometry.morphAttributes).some(values => values.length > 0)) return null;
  const attributes = Object.entries(geometry.attributes).sort(([a], [b]) => a.localeCompare(b));
  for (const [, attribute] of attributes) {
    if (attribute.itemSize < 1 || attribute.itemSize > 4 || attribute.count !== geometry.attributes.position.count ||
        (attribute as THREE.InstancedBufferAttribute).isInstancedBufferAttribute ||
        (attribute as { isInstancedInterleavedBufferAttribute?: boolean }).isInstancedInterleavedBufferAttribute) return null;
  }
  return [
    mesh.material.uuid, mesh.castShadow, mesh.receiveShadow,
    mesh.customDepthMaterial?.uuid ?? "", mesh.customDistanceMaterial?.uuid ?? "",
    mesh.renderOrder, mesh.layers.mask, mesh.visible, mesh.frustumCulled,
    ...attributes.map(([name, attribute]) => TRANSFORMED.has(name)
      ? `${name}:${attribute.itemSize}:Float32Array:false:${THREE.FloatType}`
      : `${name}:${attribute.itemSize}:${attribute.array.constructor.name}:${attribute.normalized}:${"gpuType" in attribute ? attribute.gpuType : THREE.FloatType}`),
  ].join("|");
}

/** Merge one compatible spatial cell into world coordinates. The returned mesh
 * owns its geometry, borrows its materials, and must be added directly to the
 * scene (identity transform). Sources are neither edited nor removed here. */
export function mergeStaticScenery(meshes: THREE.Mesh[]): THREE.Mesh | null {
  if (meshes.length < 2) return null;
  const first = meshes[0], signature = staticScenerySignature(first);
  if (signature === null || meshes.some(mesh => staticScenerySignature(mesh) !== signature ||
      mesh.onBeforeRender !== first.onBeforeRender || mesh.onAfterRender !== first.onAfterRender ||
      mesh.onBeforeShadow !== first.onBeforeShadow || mesh.onAfterShadow !== first.onAfterShadow)) return null;
  if (meshes.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count, 0) > MAX_VERTICES) return null;
  const geometries: THREE.BufferGeometry[] = [];
  try {
    for (const source of meshes) {
      source.updateWorldMatrix(true, false);
      const determinant = source.matrixWorld.determinant();
      if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12 ||
          !source.matrixWorld.elements.every(Number.isFinite)) return null;
      const geometry = source.geometry.clone();
      geometries.push(geometry);
      deinterleaveGeometry(geometry);
      // Matrix transforms need decoded floating point positions/normals, not
      // normalized integer storage that would clamp the baked world positions.
      for (const name of TRANSFORMED) {
        const attribute = geometry.getAttribute(name);
        if (!attribute) continue;
        const values = new Float32Array(attribute.count * attribute.itemSize);
        for (let i = 0; i < attribute.count; i++) {
          values[i * attribute.itemSize] = attribute.getX(i);
          if (attribute.itemSize > 1) values[i * attribute.itemSize + 1] = attribute.getY(i);
          if (attribute.itemSize > 2) values[i * attribute.itemSize + 2] = attribute.getZ(i);
          if (attribute.itemSize > 3) values[i * attribute.itemSize + 3] = attribute.getW(i);
        }
        geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
      }
      const available = geometry.index?.count ?? geometry.attributes.position.count;
      if (available < 3 || available % 3) return null;
      const indices = Array.from({ length: available }, (_, i) => geometry.index?.getX(i) ?? i);
      // Baking a reflection removes the renderer's per-object winding reversal.
      if (determinant < 0) {
        for (let i = 0; i < available; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
      }
      geometry.setIndex(indices);
      geometry.clearGroups();
      geometry.applyMatrix4(source.matrixWorld);
      if (determinant < 0) {
        const tangent = geometry.getAttribute("tangent");
        if (tangent?.itemSize === 4) for (let i = 0; i < tangent.count; i++) tangent.setW(i, -tangent.getW(i));
      }
      geometry.morphTargetsRelative = false;
    }
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) return null;
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, first.material);
    mesh.name = "Static scenery cell";
    mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow;
    mesh.customDepthMaterial = first.customDepthMaterial;
    mesh.customDistanceMaterial = first.customDistanceMaterial;
    mesh.onBeforeRender = first.onBeforeRender; mesh.onAfterRender = first.onAfterRender;
    mesh.onBeforeShadow = first.onBeforeShadow; mesh.onAfterShadow = first.onAfterShadow;
    mesh.renderOrder = first.renderOrder; mesh.layers.mask = first.layers.mask;
    mesh.visible = first.visible; mesh.frustumCulled = first.frustumCulled;
    mesh.matrixAutoUpdate = false; mesh.matrixWorldAutoUpdate = false;
    return mesh;
  } finally {
    for (const geometry of geometries) geometry.dispose();
  }
}
