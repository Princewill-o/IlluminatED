/** Ground footprint of the fixed, tilted 30-degree game camera (in tiles). */
export function groundFootprint(height: number, distance: number, target: number, aspect: number, bendZ = 0, bendX = 0) {
  const pitch = Math.atan2(height - target, distance);
  const t = Math.tan(Math.PI / 12);
  const corners = [-1, 1].flatMap((x) => [-1, 1].map((y) => {
    const dy = -Math.sin(pitch) + y * t * Math.cos(pitch);
    const dz = -Math.cos(pitch) - y * t * Math.sin(pitch);
    const dx = x * t * aspect;
    const a = bendZ * dz * dz + bendX * dx * dx;
    const b = dy + 2 * bendZ * distance * dz;
    const c = height + bendZ * distance * distance;
    const discriminant = b * b - 4 * a * c;
    const length = a > 0 && discriminant >= 0 ? (2 * c) / (-b + Math.sqrt(discriminant)) : height / -dy;
    return { x: x * t * aspect * length, z: distance + dz * length };
  }));
  return { minX: Math.min(...corners.map((p) => p.x)), maxX: Math.max(...corners.map((p) => p.x)), minZ: Math.min(...corners.map((p) => p.z)), maxZ: Math.max(...corners.map((p) => p.z)) };
}

/** Keep every visible ground corner inside the map, even in a small room or wide window. */
export function frameMapCamera(x: number, z: number, width: number, depth: number, aspect: number, indoors: boolean) {
  const padding = indoors ? 0.2 : 2;
  const height = indoors ? 12.5 : 19;
  const distance = indoors ? 11.5 : 18;
  const footprintAt = (scale: number) => groundFootprint(height * scale, distance * scale, 0.6 * scale, Math.max(0.1, aspect), indoors ? 0 : 0.0055, indoors ? 0 : 0.0012);
  let scale = 1;
  let footprint = footprintAt(scale);
  for (let i = 0; i < 8; i++) {
    const fit = Math.min(1, (width - padding * 2) / (footprint.maxX - footprint.minX), (depth - padding * 2) / (footprint.maxZ - footprint.minZ));
    if (fit >= 1) break;
    scale *= fit * 0.999;
    footprint = footprintAt(scale);
  }
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  return {
    x: clamp(x, padding - footprint.minX, width - padding - footprint.maxX),
    z: clamp(z, padding - footprint.minZ, depth - padding - footprint.maxZ),
    height: height * scale, distance: distance * scale, target: 0.6 * scale,
  };
}
