import * as THREE from "three";

const MAX_CUTAWAYS = 2;
const CUTAWAY_OPACITY = .28;
const SCAN_INTERVAL = .1;
const STATIONARY_REFRESH = .5;
const MOVEMENT_EPSILON_SQUARED = .02 * .02;
const LOSS_HOLD = .2;
const SURFACE_UNIFORMS = ["emissiveIntensity", "roughness", "metalness", "envMapIntensity"] as const;

/** Cut away the nearest real obstructions to the player, never a whole district. */
export function buildingVisibility() {
  type Building = { group: THREE.Group; bounds: THREE.Box3; meshes: THREE.Mesh[]; amount: number; missingFor: number };
  type MaterialEntry = { original: THREE.Material | THREE.Material[]; faded: THREE.Material | THREE.Material[] };
  const buildings: Building[] = [];
  const registered = new Set<THREE.Group>();
  const active = new Set<Building>();
  const materials = new Map<THREE.Mesh, MaterialEntry>();
  const clones = new Set<THREE.Material>();
  const raycaster = new THREE.Raycaster();
  const delta = new THREE.Vector3();
  const hit = new THREE.Vector3();
  let selected: Building[] = [];
  let untilScan = 0;
  let untilRefresh = 0;
  let dirty = true;
  const scannedCamera = new THREE.Vector3();
  const scannedTargets: THREE.Vector3[] = [];
  let disposed = false;

  const opaque = (material: THREE.Material) => material.visible && !material.transparent && material.opacity >= .95 && material.depthWrite && ((material as THREE.Material & { transmission?: number }).transmission ?? 0) < .1;
  const originals = (mesh: THREE.Mesh) => {
    const source = materials.get(mesh)?.original ?? mesh.material;
    return Array.isArray(source) ? source : [source];
  };
  const visible = (mesh: THREE.Object3D) => {
    for (let node: THREE.Object3D | null = mesh; node; node = node.parent) if (!node.visible) return false;
    return true;
  };
  const drawable = (building: Building) => visible(building.group) &&
    building.meshes.some(mesh => visible(mesh) && originals(mesh).some(opaque));
  const restore = (building: Building) => {
    for (const mesh of building.meshes) {
      const entry = materials.get(mesh);
      if (entry) {
        mesh.material = entry.original;
      }
    }
  };
  const blend = (building: Building) => {
    for (const mesh of building.meshes) {
      let entry = materials.get(mesh);
      if (!entry) {
        const clone = (source: THREE.Material) => {
          if (!opaque(source)) return source;
          const copy = source.clone();
          // Three.js does not clone the callbacks used by the curved-world shader.
          copy.onBeforeCompile = source.onBeforeCompile;
          copy.customProgramCacheKey = source.customProgramCacheKey;
          copy.transparent = true;
          copy.depthWrite = false;
          clones.add(copy);
          return copy;
        };
        const original = mesh.material;
        entry = { original, faded: Array.isArray(original) ? original.map(clone) : clone(original) };
        materials.set(mesh, entry);
      }
      const source = Array.isArray(entry.original) ? entry.original : [entry.original];
      const faded = Array.isArray(entry.faded) ? entry.faded : [entry.faded];
      faded.forEach((material, index) => {
        if (material === source[index]) return;
        // Cached fade materials follow weather/time uniforms on their source.
        const original = source[index] as THREE.MeshStandardMaterial;
        const copy = material as THREE.MeshStandardMaterial;
        if (copy.color && original.color) copy.color.copy(original.color);
        if (copy.emissive && original.emissive) copy.emissive.copy(original.emissive);
        for (const key of SURFACE_UNIFORMS)
          if (typeof original[key] === "number") copy[key] = original[key];
        material.opacity = original.opacity * (1 - building.amount * (1 - CUTAWAY_OPACITY));
      });
      mesh.material = entry.faded;
    }
  };

  const scan = (camera: THREE.Vector3, targets: THREE.Vector3[]) => {
    const candidates: { building: Building; distance: number }[] = [];
    for (const building of buildings) {
      if (!building.group.visible) continue;
      let nearest = Infinity;
      for (const target of targets) {
        delta.subVectors(target, camera);
        const far = delta.length() - .25;
        if (far <= .05) continue;
        raycaster.set(camera, delta.normalize());
        raycaster.near = .05;
        raycaster.far = far;
        if (!raycaster.ray.intersectBox(building.bounds, hit)) continue;
        if (!building.bounds.containsPoint(camera) && camera.distanceTo(hit) > far) continue;
        // Bounding boxes include empty courtyards and gaps. Only an opaque mesh
        // between the camera and the player's body/head is an obstruction.
        for (const intersection of raycaster.intersectObjects(building.meshes, false)) {
          if (!visible(intersection.object)) continue;
          const source = originals(intersection.object as THREE.Mesh);
          if (!opaque(source[intersection.face?.materialIndex ?? 0] ?? source[0])) continue;
          nearest = Math.min(nearest, intersection.distance);
          break;
        }
      }
      if (Number.isFinite(nearest)) candidates.push({ building, distance: nearest });
    }
    candidates.sort((a,b) => a.distance - b.distance);
    selected = candidates.slice(0, MAX_CUTAWAYS).map(candidate => candidate.building);
  };

  return {
    register(group: THREE.Group) {
      if (disposed || registered.has(group)) return;
      group.userData.sightlineBuilding = true;
      group.updateMatrixWorld(true);
      const meshes: THREE.Mesh[] = [];
      group.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && originals(mesh).some(opaque)) meshes.push(mesh);
      });
      if (!meshes.length) return;
      registered.add(group);
      buildings.push({ group, bounds: new THREE.Box3().setFromObject(group), meshes, amount: 0, missingFor: 0 });
      dirty = true;
    },
    /** Call every frame with only player body/head targets and elapsed seconds. */
    update(camera: THREE.Vector3, targets: THREE.Vector3[], dt = 1 / 60) {
      if (disposed) return;
      const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(.1, dt)) : 0;
      untilScan -= elapsed;
      untilRefresh -= elapsed;
      const targetsChanged = targets.length !== scannedTargets.length;
      const moved = targetsChanged || scannedCamera.distanceToSquared(camera) > MOVEMENT_EPSILON_SQUARED ||
        targets.some((target, index) => target.distanceToSquared(scannedTargets[index]) > MOVEMENT_EPSILON_SQUARED);
      // Camera settling must not re-raycast an unchanged street every 100 ms.
      // The periodic refresh still catches visibility/material changes while idle.
      if (dirty || targetsChanged || untilScan <= 0 && (moved || untilRefresh <= 0)) {
        scan(camera, targets);
        scannedCamera.copy(camera);
        targets.forEach((target, index) => {
          if (!scannedTargets[index]) scannedTargets[index] = new THREE.Vector3();
          scannedTargets[index].copy(target);
        });
        scannedTargets.length = targets.length;
        dirty = false;
        untilScan = SCAN_INTERVAL;
        untilRefresh = STATIONARY_REFRESH;
      }
      // Recover old blockers first. They keep their slot until fully restored,
      // so moving around a corner never makes four buildings transparent at once.
      for (const building of active) {
        if (selected.includes(building) && drawable(building)) { building.missingFor = 0; continue; }
        // Brief edge misses must not pulse a facade between opaque and faded.
        // Overview/hidden geometry bypass the hold and start recovering now.
        if (targets.length && drawable(building) && building.missingFor < LOSS_HOLD) {
          building.missingFor += elapsed;
          continue;
        }
        building.missingFor = LOSS_HOLD;
        building.amount *= Math.exp(-elapsed / .1);
        if (building.amount < .01) {
          building.amount = 0;
          restore(building);
          active.delete(building);
        } else blend(building);
      }
      for (const building of selected) {
        if (!drawable(building)) continue;
        building.missingFor = 0;
        if (!active.has(building)) {
          if (active.size >= MAX_CUTAWAYS) continue;
          active.add(building);
        }
        building.amount += (1 - building.amount) * (1 - Math.exp(-elapsed / .14));
        if (building.amount > 0) blend(building);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const building of buildings) restore(building);
      for (const material of clones) material.dispose();
      active.clear(); registered.clear(); materials.clear(); clones.clear();
      buildings.length = 0; selected = [];
    },
  };
}
