import * as THREE from "three";

/**
 * The poses below were measured on the old blocky rig, whose bones all share the model's axes,
 * so a local turn there is a turn about the character's own left-right (X) or forward (Z) axis.
 * Other rigs (the creative kit) orient bones differently, so for those we turn each joint about
 * the character's axes directly, on top of whatever the animation is doing.
 */
const LIMB = /Arm|ForeArm|Hand|Shoulder|UpLeg|Leg$|Foot|Toe/;
export function preparePoseAxes(root: THREE.Object3D) {
  root.userData.poseModelAxes = true;
}
const _rootQ = new THREE.Quaternion(), _parentQ = new THREE.Quaternion(), _turn = new THREE.Quaternion(), _axis = new THREE.Vector3();
function turnAboutModel(root: THREE.Object3D, joint: THREE.Object3D, axis: THREE.Vector3, angle: number) {
  root.getWorldQuaternion(_rootQ);
  _axis.copy(axis).applyQuaternion(_rootQ).normalize();
  joint.parent!.getWorldQuaternion(_parentQ);
  // local' = parent⁻¹ · R(world axis) · parent · local
  _turn.setFromAxisAngle(_axis, angle);
  joint.quaternion.premultiply(_parentQ.clone().invert().multiply(_turn).multiply(_parentQ));
}
const X = new THREE.Vector3(1, 0, 0), Z_FWD = new THREE.Vector3(0, 0, 1), Z_BACK = new THREE.Vector3(0, 0, -1);

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
  const modelAxes = root.userData.poseModelAxes === true;
  const set = (name: string, x: number, z = 0) => {
    if (!bones!.has(name))
      bones!.set(
        name,
        root.getObjectByName(`mixamorig${name}`) ??
          root.getObjectByName(`mixamorig:${name}`) ??
          root.getObjectByName(name) ??
          null,
      );
    const joint = bones!.get(name);
    // Local turns on top of the clip's pose (the mixer rewrites it every frame). Measured on the
    // blocky rig: -x swings arms, forearms and thighs forward; +x bends knees and leans spine/head
    // forward; z raises an arm sideways (left -z, right +z).
    if (!joint) return;
    if (modelAxes && joint.parent) {
      if (x) turnAboutModel(root, joint, X, x);
      if (z) turnAboutModel(root, joint, LIMB.test(name) ? Z_BACK : Z_FWD, z);
      return;
    }
    if (x) joint.rotateX(x);
    if (z) joint.rotateZ(z);
  };
  const wave = (speed: number, phase = 0) => (reduced ? 0 : Math.sin(seconds * speed + phase));
  const seatedLegs = () => {
    set("LeftUpLeg", -1.35);
    set("RightUpLeg", -1.35);
    set("LeftLeg", 1.4);
    set("RightLeg", 1.4);
  };
  // Work poses for the people who run the world: offices, wards, kitchens, stations and roads.
  const k = (speed: number, phase = 0) => 0.5 + 0.5 * wave(speed, phase);
  switch (activity) {
    // Seated passengers and people waiting on benches.
    case "sit":
      seatedLegs();
      set("LeftArm", -0.35, -0.08);
      set("RightArm", -0.35, 0.08);
      set("Head", 0.05 + sway);
      return;
    case "sit-read":
      seatedLegs();
      set("LeftArm", -0.7, -0.15);
      set("RightArm", -0.7, 0.15);
      set("LeftForeArm", -0.9);
      set("RightForeArm", -0.9);
      set("Head", 0.45);
      return;
    case "phone":
      seatedLegs();
      set("LeftArm", -0.35, -0.08);
      set("RightArm", -0.9, 0.2);
      set("RightForeArm", -1.5 + sway);
      set("Head", 0.35);
      return;
    case "laptop":
      seatedLegs();
      set("LeftArm", -0.55, -0.12);
      set("RightArm", -0.55, 0.12);
      set("LeftForeArm", -0.75 + sway * 2);
      set("RightForeArm", -0.8 - sway * 2);
      set("Head", 0.4);
      return;
    case "eat":
      seatedLegs();
      set("LeftArm", -0.5, -0.1);
      set("LeftForeArm", -0.9);
      set("RightArm", -0.75 - 0.35 * k(2.2), 0.15);
      set("RightForeArm", -1.0 - 0.9 * k(2.2));
      set("Head", 0.15 - 0.12 * k(2.2));
      return;
    case "cook":
      set("Spine", 0.15);
      set("LeftArm", -0.75, -0.1);
      set("LeftForeArm", -0.6);
      set("RightArm", -0.85 + wave(6) * 0.2, 0.15 + wave(6, 1.6) * 0.15);
      set("RightForeArm", -0.9 + wave(6) * 0.3);
      set("Head", 0.35);
      return;
    case "treat":
      set("Spine", 0.5);
      set("Head", 0.3);
      set("LeftArm", -1.0 + wave(2.5) * 0.15, -0.1);
      set("RightArm", -1.0 - wave(2.5) * 0.15, 0.1);
      set("LeftForeArm", -0.45 + wave(3.1) * 0.2);
      set("RightForeArm", -0.45 - wave(3.1) * 0.2);
      return;
    case "sweep":
      set("Spine", 0.3);
      set("LeftArm", -0.7, wave(3) * 0.45);
      set("RightArm", -0.85, wave(3) * 0.45);
      set("LeftForeArm", -0.4);
      set("RightForeArm", -0.3);
      return;
    case "direct":
      set("LeftArm", -0.2, -1.2);
      set("RightArm", -2.6 + wave(4) * 0.35, 0.25);
      set("RightForeArm", -0.3 + wave(4) * 0.3);
      set("Head", 0.05);
      return;
    case "hammer":
      set("Spine", 0.4);
      set("Head", 0.35);
      set("LeftArm", -0.8, -0.1);
      set("LeftForeArm", -0.6);
      set("RightArm", -0.4 - 1.5 * k(7), 0.1);
      set("RightForeArm", -0.3 - 0.5 * k(7));
      return;
    case "clipboard":
      set("LeftArm", -0.8, -0.15);
      set("LeftForeArm", -1.2);
      set("RightArm", -0.6, 0.1);
      set("RightForeArm", -1.0 + sway * 4);
      set("Head", 0.35);
      return;
    case "serve":
      set("LeftArm", -0.5, -0.1);
      set("LeftForeArm", -0.8);
      set("RightArm", -0.9 - 0.45 * k(1.6), 0.1);
      set("RightForeArm", -0.3);
      set("Head", 0.1);
      return;
    case "keyboard":
      set("Spine", 0.15);
      set("LeftArm", -0.65, 0.12);
      set("RightArm", -0.65, -0.12);
      set("LeftForeArm", -0.8 + sway * 3);
      set("RightForeArm", -0.85 - sway * 3);
      set("Head", 0.3);
      return;
    case "carry":
    case "carry-walk":
      set("LeftArm", -1.0, 0.1);
      set("RightArm", -1.0, -0.1);
      set("LeftForeArm", -0.8);
      set("RightForeArm", -0.8);
      return;
    // A street disagreement: arms thrown out in frustration, head shaking. Nobody touches anyone.
    case "argue":
      set("Spine", -0.08 + 0.06 * k(2.2));
      set("LeftArm", -0.9 - 0.5 * k(3.1), -0.35 - 0.3 * k(3.1));
      set("RightArm", -0.9 - 0.5 * k(3.1, 1.4), 0.35 + 0.3 * k(3.1, 1.4));
      set("LeftForeArm", -0.5);
      set("RightForeArm", -0.5);
      set("Head", -0.05, wave(2.4) * 0.12);
      return;
    // The community officer (or you) settling things: palms down, slow and steady.
    case "calm":
      set("LeftArm", -1.1, -0.35);
      set("RightArm", -1.1, 0.35);
      set("LeftForeArm", -0.15 + 0.12 * k(1.2));
      set("RightForeArm", -0.15 + 0.12 * k(1.2));
      set("Head", 0.12);
      return;
    case "shake":
      set("RightArm", -1.15, 0.05);
      set("RightForeArm", -0.35 + 0.1 * wave(9));
      set("Head", 0.08);
      return;
    case "cuffed":
      set("LeftArm", 0.45, 0.2);
      set("RightArm", 0.45, -0.2);
      set("LeftForeArm", -0.9);
      set("RightForeArm", -0.9);
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
    set("LeftArm", -2.8 + sway, 0);
    set("RightArm", -2.8 - sway, 0);
  } else if (activity === "dance") {
    set("LeftArm", -0.4, -0.9 + sway * 6);
    set("RightArm", -0.4, 0.9 + sway * 6);
    set("Spine", sway * 2, sway * 2);
  }
}
