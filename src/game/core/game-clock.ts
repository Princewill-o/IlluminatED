/** Shared multiplayer clock: one hour per 30 real seconds; a day lasts 12 minutes. */
export const GAME_HOUR_MS = 30_000;
const EPOCH = Date.UTC(2026, 9, 19);
export function gameDateAt(realTime = Date.now()) {
  return new Date(EPOCH + (realTime - EPOCH) * 120);
}
export function gamePhaseAt(realTime = Date.now()): "day" | "dusk" | "night" {
  const hour = gameDateAt(realTime).getUTCHours();
  return hour >= 20 || hour < 6 ? "night" : hour >= 18 || hour < 7 ? "dusk" : "day";
}
