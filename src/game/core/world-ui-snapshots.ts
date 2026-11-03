import type { NearbyPerson } from "./city-social";
import type { LifeState } from "./law";

/** Storage reads allocate objects even when nothing changed. Preserve React's
 * snapshot identity without dropping nested court evidence or timed releases. */
export function retainLifeSnapshot(previous: LifeState, next: LifeState): LifeState {
  return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
}

/** The closed-phone HUD only consumes membership. Open phone actions receive
 * live positions as well. Names, account kind and ordering always stay current. */
export function retainNearbySnapshot(previous: NearbyPerson[], next: NearbyPerson[], details = false): NearbyPerson[] {
  if (previous.length !== next.length) return next;
  for (let i = 0; i < previous.length; i++) {
    const before = previous[i], after = next[i];
    if (before.id !== after.id || before.name !== after.name || before.kind !== after.kind ||
        (details && (before.x !== after.x || before.y !== after.y || before.distance !== after.distance))) return next;
  }
  return previous;
}
