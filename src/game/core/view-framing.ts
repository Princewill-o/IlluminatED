/** Ground footprint of the fixed, tilted 30-degree game camera (in tiles). */
export function groundFootprint(
  height: number,
  distance: number,
  target: number,
  aspect: number,
  bendZ = 0,
  bendX = 0,
) {
  const pitch = Math.atan2(height - target, distance);
  const t = Math.tan(Math.PI / 12);
  const corners = [-1, 1].flatMap((x) =>
    [-1, 1].map((y) => {
      const dy = -Math.sin(pitch) + y * t * Math.cos(pitch);
      const dz = -Math.cos(pitch) - y * t * Math.sin(pitch);
      const dx = x * t * aspect;
      const a = bendZ * dz * dz + bendX * dx * dx;
      const b = dy + 2 * bendZ * distance * dz;
      const c = height + bendZ * distance * distance;
      const discriminant = b * b - 4 * a * c;
      const length =
        a > 0 && discriminant >= 0
          ? (2 * c) / (-b + Math.sqrt(discriminant))
          : height / -dy;
      return { x: x * t * aspect * length, z: distance + dz * length };
    }),
  );
  return {
    minX: Math.min(...corners.map((p) => p.x)),
    maxX: Math.max(...corners.map((p) => p.x)),
    minZ: Math.min(...corners.map((p) => p.z)),
    maxZ: Math.max(...corners.map((p) => p.z)),
  };
}

/** Keep every visible ground corner inside the map, even in a small room or wide window. */
export function frameMapCamera(
  x: number,
  z: number,
  width: number,
  depth: number,
  aspect: number,
  indoors: boolean,
  subject = { x, z },
  zoom = 1,
  lockToPlayer = false,
) {
  const padding = 0.2;
  // Close, tilted village camera: the player is big on screen and the street
  // curls away over the horizon (the bend shader), like Animal Crossing.
  const height = indoors ? 9.5 : 9.8;
  const distance = indoors ? 10 : 12.4;
  const footprintAt = (scale: number) =>
    groundFootprint(
      height * scale,
      distance * scale,
      0.6 * scale,
      Math.max(0.1, aspect),
      indoors ? 0 : 0.0055,
      indoors ? 0 : 0.0012,
    );
  let scale = 1 / Math.max(0.75, Math.min(1.65, Number.isFinite(zoom) ? zoom : 1));
  if (lockToPlayer && !indoors) return { x: subject.x, z: subject.z, height: height * scale, distance: distance * scale, target: 0.6 * scale };
  let footprint = footprintAt(scale);
  for (let i = 0; i < 8; i++) {
    const fit = Math.min(
      1,
      (width - padding * 2) / (footprint.maxX - footprint.minX),
      (depth - padding * 2) / (footprint.maxZ - footprint.minZ),
    );
    if (fit >= 1) break;
    scale *= fit * 0.999;
    footprint = footprintAt(scale);
  }
  const clamp = (n: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, n));
  const frameAt = (tilt: number) => {
    const d = distance * scale * tilt;
    const bounds = groundFootprint(
      height * scale,
      d,
      0.6 * scale,
      Math.max(0.1, aspect),
      indoors ? 0 : 0.0055,
      indoors ? 0 : 0.0012,
    );
    return {
      x: clamp(x, padding - bounds.minX, width - padding - bounds.maxX),
      z: clamp(z, padding - bounds.minZ, depth - padding - bounds.maxZ),
      height: height * scale,
      distance: d,
      target: 0.6 * scale,
    };
  };
  let frame = frameAt(1);
  const visible = (f: typeof frame) => {
    const point = projectCameraGround(f, subject, aspect, indoors);
    return Math.abs(point.x) <= 0.94 && Math.abs(point.y) <= 0.88;
  };
  // At boundaries, tilt toward an overhead view instead of zooming into the avatar.
  // A wide tilted perspective can otherwise push its subject off-screen when clamped.
  if (!visible(frame)) {
    let lo = 0,
      hi = 1;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (visible(frameAt(mid))) lo = mid;
      else hi = mid;
    }
    frame = frameAt(lo);
  }
  return frame;
}

/** Responsive player tracking: cap trailing distance and snap after fast travel. */
export function followPlayerCamera(
  current: { x: number; z: number },
  player: { x: number; z: number },
  dt: number,
) {
  const dx = player.x - current.x,
    dz = player.z - current.z;
  const distance = Math.hypot(dx, dz);
  if (!Number.isFinite(distance) || distance > 6) return { ...player };
  const ease = 1 - Math.exp(-Math.max(0, dt) * 14);
  const remaining = Math.min(0.35, distance * (1 - ease));
  const ratio = distance ? remaining / distance : 0;
  return { x: player.x - dx * ratio, z: player.z - dz * ratio };
}

/** Project a ground position using the same tilted perspective and world bend as the renderer. */
export function projectCameraGround(
  frame: {
    x: number;
    z: number;
    height: number;
    distance: number;
    target: number;
  },
  point: { x: number; z: number },
  aspect: number,
  indoors: boolean,
) {
  const dx = point.x - frame.x,
    dz = point.z - frame.z;
  const pitch = Math.atan2(frame.height - frame.target, frame.distance);
  const dy =
    -frame.height - (indoors ? 0 : 0.0055 * dz * dz + 0.0012 * dx * dx);
  const forward =
    -dy * Math.sin(pitch) - (dz - frame.distance) * Math.cos(pitch);
  const up = dy * Math.cos(pitch) - (dz - frame.distance) * Math.sin(pitch);
  const fov = Math.tan(Math.PI / 12);
  return {
    x: dx / (forward * fov * Math.max(0.1, aspect)),
    y: up / (forward * fov),
  };
}
