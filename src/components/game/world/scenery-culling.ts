import * as THREE from "three";

/** Reusable curved-world view for static scenery and moving render-only bounds. */
export function curvedView() {
  const frustum = new THREE.Frustum(),
    matrix = new THREE.Matrix4(),
    bent = new THREE.Box3();
  const distanceToInterval = (at: number, min: number, max: number) =>
    at < min ? min - at : at > max ? at - max : 0;
  return {
    update(camera: THREE.Camera) {
      matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(matrix);
    },
    intersects(bounds: THREE.Box3, focus: { x: number; z: number }, padding = 0) {
      if (bounds.isEmpty()) return false;
      bent.copy(bounds);
      const nearX = distanceToInterval(focus.x, bent.min.x, bent.max.x),
        nearZ = distanceToInterval(focus.z, bent.min.z, bent.max.z);
      const farX = Math.max(
          Math.abs(bent.min.x - focus.x),
          Math.abs(bent.max.x - focus.x),
        ),
        farZ = Math.max(
          Math.abs(bent.min.z - focus.z),
          Math.abs(bent.max.z - focus.z),
        );
      bent.min.y -= farZ * farZ * 0.0055 + farX * farX * 0.0012;
      bent.max.y -= nearZ * nearZ * 0.0055 + nearX * nearX * 0.0012;
      bent.expandByScalar(padding);
      return frustum.intersectsBox(bent);
    },
  };
}

/** Conservative CPU culling accounts for the world bend that the GPU applies. */
export function sceneryCulling() {
  const entries = new Map<
    THREE.Object3D,
    { bounds: THREE.Box3; original: boolean }
  >();
  const view = curvedView();
  return {
    register(object: THREE.Object3D, bounds?: THREE.Box3) {
      const box = bounds?.clone() ?? new THREE.Box3().setFromObject(object);
      if (box.isEmpty()) return;
      const old = entries.get(object);
      entries.set(object, {
        bounds: box,
        original: old?.original ?? object.visible,
      });
    },
    update(
      camera: THREE.Camera,
      focus: { x: number; z: number },
      overview = false,
    ) {
      view.update(camera);
      for (const [object, entry] of entries) {
        if (!entry.original) continue;
        if (overview) {
          object.visible = true;
          continue;
        }
        // Include offscreen casters and a movement margin, rather than clipping at a facade edge.
        object.visible = view.intersects(entry.bounds, focus,
          Math.min(18, 3 + (entry.bounds.max.y - entry.bounds.min.y) * 0.7),
        );
      }
    },
    dispose() {
      for (const [object, entry] of entries) object.visible = entry.original;
      entries.clear();
    },
  };
}
