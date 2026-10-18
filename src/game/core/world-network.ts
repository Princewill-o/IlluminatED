/** Client budgets; the database independently enforces room/project admission. */
export const ROOM_CAPACITY = 5;
export const MOVE_INTERVAL_MS = 120;
export const PRESENCE_INTERVAL_MS = 16000;
export const VISIBLE_PLAYERS = 12;
export const VISIBLE_RADIUS = 32 * 28;

/** Bound model/nameplate allocation, even if a faulty transport supplies a huge roster. */
export function nearbyPlayers<T extends { id: string; x: number; y: number }>(
  players: Iterable<T>,
  origin: { x: number; y: number },
  hidden: Set<string>,
): T[] {
  return [...players]
    .filter(
      (p) =>
        !hidden.has(p.id) &&
        Math.hypot(p.x - origin.x, p.y - origin.y) <= VISIBLE_RADIUS,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - origin.x, a.y - origin.y) -
          Math.hypot(b.x - origin.x, b.y - origin.y) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, VISIBLE_PLAYERS);
}
