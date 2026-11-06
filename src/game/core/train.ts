/** Shared station choreography, in milliseconds on the performance clock. */
export const TRAIN_CYCLE_MS = 24000;
/** Countdown to the actual station animation events, never a separate timer. */
export function trainTimes(elapsed: number) {
  const t = ((elapsed % TRAIN_CYCLE_MS) + TRAIN_CYCLE_MS) % TRAIN_CYCLE_MS;
  const until = (event: number) => Math.ceil((event > t ? event - t : TRAIN_CYCLE_MS - t + event) / 1000);
  return {
    phase: trainFrame(elapsed, 30).phase,
    arrivalSeconds: until(5000),
    boardingSeconds: until(6000),
    closingSeconds: until(12000),
    departureSeconds: until(13000),
  };
}
/** Door centres match the four carriages in the station renderer (tile units). */
export function trainDoorOpenAt(elapsed: number, width: number, x: number) {
  const train = trainFrame(elapsed, width);
  return train.phase === "boarding" &&
    Array.from({ length: 4 }, (_, i) => train.x + i * 6.2 + 3)
      .some(doorX => Math.abs(x - doorX) <= 0.48);
}
export function canBoardTrain(elapsed: number, width: number, x: number, y: number) {
  return y >= 15.6 && y <= 16 && trainDoorOpenAt(elapsed, width, x);
}
export function trainFrame(elapsed: number, width: number) {
  const t = ((elapsed % TRAIN_CYCLE_MS) + TRAIN_CYCLE_MS) % TRAIN_CYCLE_MS / 1000;
  const stop = width / 2 - 12.7;
  const phase = t < 5 ? "arriving" : t < 6 ? "opening" : t < 12 ? "boarding" : t < 13 ? "closing" : t < 20 ? "departing" : "waiting";
  const smooth = (v: number) => v * v * (3 - 2 * v);
  return { phase, visible: t < 20,
    x: t < 5 ? -29 + (stop + 29) * (1 - Math.pow(1 - t / 5, 3)) : t < 13 ? stop : stop + (width + 30) * Math.pow((t - 13) / 7, 2),
    doorOpen: t < 5 || t >= 13 ? 0 : t < 6 ? smooth(t - 5) : t < 12 ? 1 : 1 - smooth(t - 12) };
}
export function trainBoardingDelay(elapsed: number) {
  const t = ((elapsed % TRAIN_CYCLE_MS) + TRAIN_CYCLE_MS) % TRAIN_CYCLE_MS;
  return t < 6000 ? 6000 - t : t < 12000 ? 600 : TRAIN_CYCLE_MS - t + 6000;
}

/**
 * Riding the train for real: you walk on, the doors close, the train pulls out with you inside
 * and into the tunnel, and pulls into the next station where the doors open and you walk off.
 * Positions are the train's offset (tiles) from where it stands at the platform.
 */
export const RIDE_SWAP_S = 13;
const ACCEL = 2.8, TOP = 16.8, ACCEL_END = 7, ACCEL_DIST = 50.4;
const smoothstep = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
/** Leaving: seconds since the doors started closing. */
export function departFrame(t: number) {
  const offset = t < 1 ? 0 : t < ACCEL_END ? 0.5 * ACCEL * (t - 1) ** 2 : ACCEL_DIST + TOP * (t - ACCEL_END);
  return { offset, doorOpen: t < 1 ? 1 - smoothstep(t) : 0, speed: t < 1 ? 0 : t < ACCEL_END ? ACCEL * (t - 1) : TOP };
}
/** Arriving: seconds since the swap into the destination station (the train is still in the tunnel). */
export const ARRIVE_DOCK_S = 9;
export function arriveFrame(t: number) {
  const cruise = 3;
  const offset = t < cruise ? -(ACCEL_DIST + TOP * (cruise - t)) : t < ARRIVE_DOCK_S ? -ACCEL_DIST * (1 - (t - cruise) / 6) ** 2 : 0;
  return { offset, doorOpen: t < ARRIVE_DOCK_S ? 0 : smoothstep(t - ARRIVE_DOCK_S), speed: t < cruise ? TOP : t < ARRIVE_DOCK_S ? TOP * (1 - (t - cruise) / 6) : 0, docked: t >= ARRIVE_DOCK_S + 1 };
}
/** Where the train stands at a platform of this width. */
export const trainStop = (width: number) => width / 2 - 12.7;
/** The four carriage door centres (tile x) for a train standing at `x`. */
export const doorCentres = (x: number) => Array.from({ length: 4 }, (_, i) => x + i * 6.2 + 3);
/** Inside the carriages (tile units): x relative to the train's front, y across the car. */
export const CARRIAGE = { minX: 0.45, maxX: 4 * 6.2 - 0.65, minY: 15.5, maxY: 17.35, doorY: 15.4 };
