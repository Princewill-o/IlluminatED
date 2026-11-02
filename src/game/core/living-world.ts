/** Compressed game speeds: these are pixels/second, not real-world mph. */
export const isMotorway = (mapId: string) =>
  mapId === "m25" || mapId.startsWith("road-");
export function roadCruiseSpeed(mapId: string, carMultiplier = 3) {
  return Math.max(
    90,
    Math.min(
      isMotorway(mapId) ? 840 : 380,
      (isMotorway(mapId) ? 220 : 96) * carMultiplier,
    ),
  );
}
export function crashImpact(speed: number, pedestrian = false) {
  const value = Math.max(0, Number.isFinite(speed) ? speed : 0);
  return {
    damage:
      value < 70
        ? 0
        : Math.min(55, Math.round(value / 15) + (pedestrian ? 8 : 0)),
    recoveryMs: Math.min(2800, 500 + value * 3),
  };
}
export type ResidentActivity =
  "walk" | "phone" | "read" | "stretch" | "dance" | "talk";
/** Shared wall-clock phases keep ambient schedules stable across players. */
export function residentActivity(
  index: number,
  milliseconds: number,
  indoors = false,
): ResidentActivity {
  const phase = (((milliseconds / 1000 + index * 11) % 74) + 74) % 74;
  if (phase < 42) return "walk";
  const activities: ResidentActivity[] = indoors
    ? ["phone", "read", "talk", "stretch"]
    : ["phone", "read", "stretch", "dance", "talk"];
  return activities[index % activities.length];
}
/** Only the walking portion advances along a route. Late joiners see the same position. */
export function residentMotionSeconds(index: number, milliseconds: number) {
  const seconds = milliseconds / 1000 + index * 11,
    cycle = Math.floor(seconds / 74),
    phase = seconds - cycle * 74;
  return cycle * 42 + Math.min(42, phase);
}
export const TRAIN_JOURNEY_MS = 120_000;
export function journeyClock(startedAt: number, now: number) {
  const elapsed = Math.max(0, now - startedAt);
  return {
    elapsed,
    remaining: Math.max(0, TRAIN_JOURNEY_MS - elapsed),
    progress: Math.min(1, elapsed / TRAIN_JOURNEY_MS),
  };
}
