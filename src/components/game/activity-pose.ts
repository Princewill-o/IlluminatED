import type * as THREE from "three";

const boneCache = new WeakMap<
  THREE.Object3D,
  Map<string, THREE.Object3D | null>
>();
/** Layer small, bounded everyday gestures after the authored animation mixer. */
export function activityPose(
  root: THREE.Object3D,
  activity: string,
  seconds: number,
  reduced: boolean,
) {
  let bones = boneCache.get(root);
  if (!bones) {
    bones = new Map();
    boneCache.set(root, bones);
  }
  const sway = reduced ? 0 : Math.sin(seconds * 5) * 0.035;
  const set = (name: string, x: number, z = 0) => {
    if (!bones!.has(name))
      bones!.set(
        name,
        root.getObjectByName(`mixamorig${name}`) ??
          root.getObjectByName(`mixamorig:${name}`) ??
          null,
      );
    const joint = bones!.get(name);
    if (joint) {
      joint.rotation.x = x;
      joint.rotation.z = z;
    }
  };
  if (
    ["sit", "sit-phone", "sit-read", "typing", "read", "phone"].includes(
      activity,
    )
  ) {
    if (activity.startsWith("sit") || activity === "typing") {
      set("LeftUpLeg", -1.35);
      set("RightUpLeg", -1.35);
      set("LeftLeg", 1.4);
      set("RightLeg", 1.4);
    }
    if (activity !== "sit") {
      set("LeftArm", -0.45, -0.25);
      set("RightArm", -0.45, 0.25);
      set("LeftForeArm", -0.9 + sway);
      set("RightForeArm", -0.95 - sway);
      set("Head", 0.2);
    }
  } else if (activity === "stretch") {
    set("LeftArm", -0.1, -2.5 + sway);
    set("RightArm", -0.1, 2.5 - sway);
  } else if (activity === "dance") {
    set("LeftArm", -0.4, -0.7 + sway * 6);
    set("RightArm", -0.4, 0.7 + sway * 6);
    set("Spine", sway * 2, sway * 2);
  }
}
