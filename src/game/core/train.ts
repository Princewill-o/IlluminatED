/** Shared station choreography, in milliseconds on the performance clock. */
export const TRAIN_CYCLE_MS = 24000;
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
