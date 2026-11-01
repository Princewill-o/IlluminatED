import * as THREE from "three";

import { realisticCarAsset, realisticCarModel, realisticCarScale } from "@/game/core/realistic-cars";

/** One placement path for traffic, the player's garage car and remote players' cars. */
export async function placeRealisticCar(
  group: THREE.Group,
  kind: string,
  load: (url: string) => Promise<{ scene: THREE.Group }>,
  style: (object: THREE.Object3D) => void,
) {
  const asset = realisticCarAsset(kind);
  const gltf = await load(asset);
  const car = gltf.scene.clone(true);
  // Source GLBs face +Z; the road/driving heading zero points along +X.
  car.rotation.y = Math.PI / 2;
  const size = new THREE.Box3().setFromObject(car).getSize(new THREE.Vector3());
  const fitted = new THREE.Group();
  fitted.add(car);
  fitted.scale.setScalar(realisticCarScale(size, kind));
  const bounds = new THREE.Box3().setFromObject(fitted);
  const centre = bounds.getCenter(new THREE.Vector3());
  fitted.position.set(-centre.x, -bounds.min.y, -centre.z);
  fitted.userData.importedAsset = asset;
  fitted.userData.realisticCar = realisticCarModel(kind);
  style(fitted);
  group.add(fitted);
  return fitted;
}
