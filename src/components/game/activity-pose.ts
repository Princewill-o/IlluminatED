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
  const wave = (speed: number, phase = 0) => (reduced ? 0 : Math.sin(seconds * speed + phase));
  const seatedLegs = () => {
    set("LeftUpLeg", -1.35);
    set("RightUpLeg", -1.35);
    set("LeftLeg", 1.4);
    set("RightLeg", 1.4);
  };
  // Work poses for the people who run the world: offices, wards, kitchens, stations and roads.
  switch (activity) {
    case "laptop":
      seatedLegs();
      set("LeftArm", -0.35, -0.3);
      set("RightArm", -0.35, 0.3);
      set("LeftForeArm", -0.65 + sway);
      set("RightForeArm", -0.7 - sway);
      set("Head", 0.4);
      return;
    case "eat":
      seatedLegs();
      set("LeftArm", -0.45, -0.25);
      set("LeftForeArm", -0.9);
      set("RightArm", -0.7, 0.35);
      set("RightForeArm", -1.1 - 0.7 * (0.5 + 0.5 * wave(2.2)));
      set("Head", 0.12 - 0.08 * (0.5 + 0.5 * wave(2.2)));
      return;
    case "cook":
      set("Spine", 0.15);
      set("LeftArm", -0.5, -0.3);
      set("LeftForeArm", -0.8);
      set("RightArm", -0.6 + wave(6) * 0.15, 0.3 + wave(6, 1.6) * 0.15);
      set("RightForeArm", -1.05 + wave(6) * 0.25);
      set("Head", 0.35);
      return;
    case "treat":
      set("Spine", 0.45);
      set("Head", 0.3);
      set("LeftArm", -0.75 + wave(2.5) * 0.12, -0.3);
      set("RightArm", -0.75 - wave(2.5) * 0.12, 0.3);
      set("LeftForeArm", -0.55 + wave(3.1) * 0.15);
      set("RightForeArm", -0.55 - wave(3.1) * 0.15);
      return;
    case "sweep":
      set("Spine", 0.25, wave(3) * 0.12);
      set("LeftArm", -0.6, -0.4 + wave(3) * 0.4);
      set("RightArm", -0.75, 0.4 + wave(3) * 0.4);
      set("LeftForeArm", -0.5);
      set("RightForeArm", -0.4);
      return;
    case "direct":
      set("LeftArm", -0.2, -1.2);
      set("RightArm", -0.2, 2.1 + wave(4) * 0.5);
      set("RightForeArm", -0.3 + wave(4) * 0.3);
      set("Head", 0.05, wave(1.2) * 0.2);
      return;
    case "hammer":
      set("Spine", 0.4);
      set("Head", 0.35);
      set("LeftArm", -0.6, -0.3);
      set("LeftForeArm", -0.7);
      set("RightArm", -1.2 + (0.5 + 0.5 * wave(7)) * 0.9, 0.3);
      set("RightForeArm", -0.9 + (0.5 + 0.5 * wave(7)) * 0.4);
      return;
    case "clipboard":
      set("LeftArm", -0.6, -0.3);
      set("LeftForeArm", -1.3);
      set("RightArm", -0.5, 0.3);
      set("RightForeArm", -1.0 + sway * 3);
      set("Head", 0.35, wave(0.7) * 0.15);
      return;
    case "serve":
      set("LeftArm", -0.45, -0.3);
      set("LeftForeArm", -0.8);
      set("RightArm", -0.85 - (0.5 + 0.5 * wave(1.6)) * 0.35, 0.25);
      set("RightForeArm", -0.4);
      set("Head", 0.1);
      return;
    case "carry":
      set("LeftArm", -0.9, -0.25);
      set("RightArm", -0.9, 0.25);
      set("LeftForeArm", -0.7);
      set("RightForeArm", -0.7);
      return;
    case "cuffed":
      set("LeftArm", 0.5, -1.0);
      set("RightArm", 0.5, 1.0);
      set("LeftForeArm", -0.2);
      set("RightForeArm", -0.2);
      set("Head", 0.25);
      return;
  }
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
