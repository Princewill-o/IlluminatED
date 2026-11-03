export type LocomotionClip = "idle" | "walk" | "sprint";

/** Render frames can repeat or skip physics snapshots. Filter the measured
 * velocity so those samples do not repeatedly swap walking/running clips. */
export function characterSpeed(previous: number, distance: number, dt: number) {
  if (!Number.isFinite(distance) || !Number.isFinite(dt) || distance < 0 || distance >= 2 || dt <= 0 || dt > .25) return 0;
  const before = Number.isFinite(previous) ? Math.max(0, previous) : 0;
  return Math.max(0, before + (distance / dt - before) * (1 - Math.exp(-dt * 12)));
}

export function locomotionClip(walking: boolean, speed: number, previous: LocomotionClip = "idle"): LocomotionClip {
  if (!walking) return "idle";
  const velocity = Number.isFinite(speed) ? speed : 0;
  return velocity > (previous === "sprint" ? 3.8 : 4.6) ? "sprint" : "walk";
}
