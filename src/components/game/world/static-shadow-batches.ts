import * as THREE from "three";

const MAX_VERTICES = 250_000;
const defaults = THREE.Object3D.prototype;

/** Only callers that have frozen their static scene may transfer its shadow work.
 * Alpha cards, custom shadow behaviour and dynamic/skinned surfaces stay intact. */
export function staticShadowEligible(mesh: THREE.Mesh, depth: THREE.Material): boolean {
  const material = mesh.material as THREE.MeshStandardMaterial;
  const geometry = mesh.geometry;
  if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh ||
      mesh.matrixAutoUpdate || mesh.matrixWorldAutoUpdate || !mesh.visible || !mesh.castShadow ||
      Array.isArray(material) || !material.visible || material.transparent || material.opacity !== 1 ||
      material.side !== THREE.FrontSide || material.shadowSide !== null || material.alphaTest !== 0 ||
      material.alphaHash || material.alphaMap || material.displacementMap || material.wireframe ||
      material.clippingPlanes?.length || mesh.customDepthMaterial !== depth || mesh.customDistanceMaterial ||
      mesh.onBeforeRender !== defaults.onBeforeRender || mesh.onAfterRender !== defaults.onAfterRender ||
      mesh.onBeforeShadow !== defaults.onBeforeShadow || mesh.onAfterShadow !== defaults.onAfterShadow ||
      !geometry.attributes.position || geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity ||
      (geometry as THREE.InstancedBufferGeometry).isInstancedBufferGeometry ||
      Object.values(geometry.morphAttributes).some(attributes => attributes.length > 0)) return false;
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent)
    if (node.userData.foliage || node.userData.spin || node.userData.train || node.userData.vehicleRig) return false;
  return true;
}

/** Combine an owner/cell's exact static depth geometry independently of colours.
 * The proxy has zero main-pass draw range and opens only around each shadow draw.
 * It must share the sources' visibility owner; moving models remain normal casters.
 * No scene, source geometry or material is changed until construction succeeds. */
export function createStaticShadowBatch(meshes: THREE.Mesh[], depth: THREE.Material) {
  if (meshes.length < 2 || meshes.some(mesh => !staticShadowEligible(mesh, depth))) return null;
  const first = meshes[0];
  if (meshes.some(mesh => mesh.layers.mask !== first.layers.mask)) return null;
  const instanceCount = (mesh: THREE.Mesh) => mesh instanceof THREE.InstancedMesh ? mesh.count : 1;
  const vertexCount = meshes.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count * instanceCount(mesh), 0);
  if (!Number.isSafeInteger(vertexCount) || vertexCount < 3 || vertexCount > MAX_VERTICES) return null;
  const positions = new Float32Array(vertexCount * 3), indices: number[] = [];
  const instance = new THREE.Matrix4(), transform = new THREE.Matrix4(), point = new THREE.Vector3();
  let vertexAt = 0;
  for (const source of meshes) {
    const attribute = source.geometry.attributes.position, index = source.geometry.index;
    const count = index?.count ?? attribute.count;
    if (attribute.itemSize !== 3 || count < 3 || count % 3 || instanceCount(source) < 1) return null;
    for (let copy = 0; copy < instanceCount(source); copy++) {
      if (source instanceof THREE.InstancedMesh) {
        source.getMatrixAt(copy, instance); transform.multiplyMatrices(source.matrixWorld, instance);
      } else transform.copy(source.matrixWorld);
      const determinant = transform.determinant();
      if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12 || !transform.elements.every(Number.isFinite)) return null;
      for (let i = 0; i < attribute.count; i++) {
        point.fromBufferAttribute(attribute, i).applyMatrix4(transform);
        if (![point.x, point.y, point.z].every(Number.isFinite)) return null;
        point.toArray(positions, (vertexAt + i) * 3);
      }
      for (let i = 0; i < count; i += 3) {
        const triangle = [0, 1, 2].map(offset => index?.getX(i + offset) ?? i + offset);
        if (triangle.some(vertex => !Number.isSafeInteger(vertex) || vertex < 0 || vertex >= attribute.count)) return null;
        if (determinant < 0) [triangle[1], triangle[2]] = [triangle[2], triangle[1]];
        indices.push(...triangle.map(vertex => vertexAt + vertex));
      }
      vertexAt += attribute.count;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  geometry.setDrawRange(0, 0);
  const material = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "Static shadow cell";
  mesh.castShadow = true; mesh.customDepthMaterial = depth; mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false; mesh.matrixWorldAutoUpdate = false; mesh.layers.mask = first.layers.mask;
  mesh.onBeforeShadow = () => geometry.setDrawRange(0, indices.length);
  mesh.onAfterShadow = () => geometry.setDrawRange(0, 0);
  const flags = meshes.map(source => source.castShadow);
  for (const source of meshes) source.castShadow = false;
  let disposed = false;
  return {
    mesh,
    dispose() {
      if (disposed) return;
      disposed = true;
      meshes.forEach((source, i) => { source.castShadow = flags[i]; });
      mesh.removeFromParent(); geometry.dispose(); material.dispose();
    },
  };
}
