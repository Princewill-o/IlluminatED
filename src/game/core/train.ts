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
