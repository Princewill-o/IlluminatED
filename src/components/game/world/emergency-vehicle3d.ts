import * as THREE from "three";

import { AMBULANCE_LENGTH, AMBULANCE_WIDTH, EMERGENCY_ASSETS, rearDoorAngle, type EmergencyVehicleKind } from "@/game/core/emergency-vehicles";
import { CAR_LENGTH, CAR_WIDTH } from "@/game/core/vehicles";

export interface EmergencyVehicle {
  /** Grounded, centred parent. Forward +X, rear -X; apply world heading to this group. */
  root: THREE.Group;
  openRearDoors(progress: number): void;
  update(seconds: number, sirens?: boolean): void;
  dispose(): void;
}
/** Standalone vehicle rig for pursuit, rescue and cinematics; no app state or audio side effects. */
export async function createEmergencyVehicle(
  kind: EmergencyVehicleKind,
  load: (url: string) => Promise<{ scene: THREE.Group }>,
  style: (object: THREE.Object3D) => void = () => {},
): Promise<EmergencyVehicle> {
  const source = await load(EMERGENCY_ASSETS[kind]);
  const object = source.scene.clone(true);
  object.rotation.y = Math.PI / 2;
  const root = new THREE.Group();
  root.name = `${kind}-vehicle`;
  root.userData.emergencyKind = kind;
  const fitted = new THREE.Group();
  fitted.add(object);
  root.add(fitted);
  const bounds = new THREE.Box3().setFromObject(fitted);
  const size = bounds.getSize(new THREE.Vector3());
  const length = kind === "ambulance" ? AMBULANCE_LENGTH : CAR_LENGTH;
  const width = kind === "ambulance" ? AMBULANCE_WIDTH : CAR_WIDTH;
  fitted.scale.setScalar(Math.min(length / Math.max(.001,size.x), width / Math.max(.001,size.z)));
  const scaled = new THREE.Box3().setFromObject(fitted), centre = scaled.getCenter(new THREE.Vector3());
  fitted.position.set(-centre.x, -scaled.min.y, -centre.z);
  root.userData.vehicleLength = length;
  root.userData.vehicleWidth = width;
  root.userData.importedAsset = EMERGENCY_ASSETS[kind];
  // Per-instance light materials keep one response vehicle's flash independent of others.
  const ownMaterials: THREE.Material[] = [];
  const lamps: { material: THREE.MeshStandardMaterial; side: number }[] = [];
  root.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = mesh.receiveShadow = true;
    const copy = (source: THREE.Material) => {
      const material = source.clone();
      material.onBeforeCompile = source.onBeforeCompile;
      material.customProgramCacheKey = source.customProgramCacheKey;
      ownMaterials.push(material);
      if (material instanceof THREE.MeshStandardMaterial && /SirenBlue(Left|Right)/.test(material.name)) {
        lamps.push({ material, side: /Right/.test(material.name) ? 1 : 0 });
      }
      return material;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
  });
  style(root);
  const left = object.getObjectByName("RearDoorLeft");
  const right = object.getObjectByName("RearDoorRight");
  const leftRest = left?.rotation.y ?? 0, rightRest = right?.rotation.y ?? 0;
  let disposed = false;
  return {
    root,
    openRearDoors(progress) {
      if (disposed) return;
      const angle = rearDoorAngle(progress);
      // glTF uses Y up; local source rear is +Z and swings outward around Y.
      if (left) left.rotation.y = leftRest + angle;
      if (right) right.rotation.y = rightRest - angle;
    },
    update(seconds, sirens = true) {
      if (disposed) return;
      const phase = Math.floor(Math.max(0, seconds) * 8) % 4;
      for (const {material, side} of lamps) {
        const on = sirens && (phase < 2 ? side === 0 : side === 1);
        material.emissiveIntensity = on ? 4 : .12;
        material.color.set(on ? "#69aaff" : "#123c9b");
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      ownMaterials.forEach(material => material.dispose());
    },
  };
}
