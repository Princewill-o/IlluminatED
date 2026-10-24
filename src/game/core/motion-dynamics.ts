const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const approach = (from: number, to: number, rate: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-rate * dt));

export interface MotionDynamics {
  speed: number;
  pitch: number;
  bank: number;
}
export const restingMotion = (): MotionDynamics => ({
  speed: 0,
  pitch: 0,
  bank: 0,
});

/** Cosmetic secondary motion only; never modifies game position or collision. */
export function motionDynamics(
  previous: MotionDynamics,
  speed: number,
  turnRate: number,
  seconds: number,
  reduced = false,
  vehicle = false,
): MotionDynamics {
  const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, 0.05);
  const velocity = clamp(Number.isFinite(speed) ? speed : 0, -20, 20);
  const turn = clamp(Number.isFinite(turnRate) ? turnRate : 0, -4, 4);
  if (reduced) return { speed: velocity, pitch: 0, bank: 0 };
  const acceleration =
    dt > 0 ? clamp((velocity - previous.speed) / dt, -8, 8) : 0;
  return {
    speed: approach(previous.speed, velocity, 9, dt),
    pitch: approach(
      previous.pitch,
      clamp(acceleration * (vehicle ? -0.006 : 0.009), -0.065, 0.065),
      7,
      dt,
    ),
    bank: approach(
      previous.bank,
      clamp(-turn * Math.abs(velocity) * (vehicle ? 0.009 : 0.014), -0.1, 0.1),
      8,
      dt,
    ),
  };
}
