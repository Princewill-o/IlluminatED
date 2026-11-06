
import {
  nearestDrivingSpot,
  vehicleFits,
  type DrivingState,
  type VehicleObstacle,
} from "./driving";
import { edgeLoop } from "./edge-loop";
import {
  isUKScene,
  UK_PLACES,
  UK_ROUTES,
  ukPlace,
  ukArrival,
  loopRoadPosition,
} from "./uk-world";
import { universityById } from "./universities";
import { CAR_LENGTH, CAR_WIDTH } from "./vehicles";
import { TILE, safeSpot, type WorldMap } from "./world";

/** Offices belong to London; regional homes retain their own district. */
export function ukRegionOf(mapId: string): string | null {
  if (mapId === "city" || isUKScene(mapId)) return mapId;
  if(mapId.startsWith("party-"))return ukRegionOf(mapId.slice(6));
  if(mapId.startsWith("university-"))return universityById(mapId.slice(11))?.city??null;
  const home =
    /^uk-home-(kent|nottingham|birmingham|manchester|edinburgh)-\d+$/.exec(
      mapId,
    );
  if (home) return home[1];
  if (mapId.startsWith("uk-home-")) return null;
  if (
    [
      "home",
      "campus",
      "universities",
      "study-lobby",
      "supermarket",
      "hospital",
      "court",
      "prison",
      "venture-hub",
      "highlands",
    ].includes(mapId) ||
    /^(office|workplace|station|venue|hotel|university)-/.test(mapId)
  )
    return "city";
  return null;
}

export function ukSceneName(id: string): string {
  return (
    UK_PLACES.find((place) => place.id === id)?.name ??
    (id.startsWith("road-") ? `Motorway to ${ukPlace(id.slice(5))?.name??id.slice(5)}` : id === "m25"
      ? "M25 · London Orbital"
      : id === "rotherhithe"
        ? "A101 · Rotherhithe Tunnel"
        : "London")
  );
}

/** Find a reversible route through the playable road graph. */
export function planUKJourney(
  from: string,
  to: string,
): { maps: string[]; roads: string[] } | null {
  const start = ukRegionOf(from),
    end = ukRegionOf(to);
  if (!start || !end) return null;
  const queue = [[start]],
    seen = new Set([start]);
  for (let head = 0; head < queue.length; head++) {
    const maps = queue[head],
      at = maps[maps.length - 1];
    if (at === end) {
      const roads: string[] = [];
      for (let i = 1; i < maps.length; i++) {
        const edge = UK_ROUTES.find(
          (route) =>
            (route.from === maps[i - 1] && route.to === maps[i]) ||
            (route.to === maps[i - 1] && route.from === maps[i]),
        );
        const signs =
          edge?.from === maps[i - 1]
            ? edge.roads
            : [...(edge?.roads ?? [])].reverse();
        for (const road of signs)
          if (roads[roads.length - 1] !== road) roads.push(road);
      }
      return { maps, roads };
    }
    for (const edge of UK_ROUTES) {
      const next =
        edge.from === at ? edge.to : edge.to === at ? edge.from : null;
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push([...maps, next]);
      }
    }
  }
  return null;
}

export function nextUKPortal(map: WorldMap, destination: string) {
  const start = ukRegionOf(map.id);
  if (!start) return null;
  const next =
    map.id !== start ? start : planUKJourney(start, destination)?.maps[1];
  return next
    ? (map.portals.find(
        (portal) => portal.to.kind === "map" && portal.to.mapId === next,
      ) ?? null)
    : null;
}

/** Cars need a whole road footprint; walking arrivals use the exact returning doorway. */
export function roadTransitionArrival(
  map: WorldMap,
  from: string,
  portalId?: string,
  driving = false,
) {
  const preferred = ukArrival(map.id, from, portalId) ?? map.spawn;
  if (
    driving &&
    from === "m25" &&
    isUKScene(map.id) &&
    !map.id.startsWith("road-") &&
    map.id !== "m25" &&
    map.id !== "rotherhithe"
  ) {
    const entrance = { x: 8 * TILE, y: 21 * TILE, heading: 0, speed: 0 };
    if (vehicleFits(map, entrance)) return entrance;
  }
  if (driving && (map.id === "city" || isUKScene(map.id)))
    return motorwayCarArrival(map, nearestDrivingSpot(map, preferred));
  return { ...safeSpot(map, preferred.x, preferred.y), heading: 0 };
}

export function motorwayCarArrival(
  map: WorldMap,
  candidate: DrivingState | null,
): DrivingState | null {
  if (!candidate || (map.id !== "m25" && !map.id.startsWith("road-"))) return candidate;
  const northbound = candidate.y / TILE < 36;
  const lanes = northbound ? [28, 30, 32] : [40, 42, 44];
  const lane = lanes.reduce((nearest, y) =>
    Math.abs(candidate.y / TILE - y) < Math.abs(candidate.y / TILE - nearest)
      ? y
      : nearest,
  );
  const aligned = {
    ...candidate,
    y: lane * TILE,
    heading: northbound ? 0 : Math.PI,
  };
  return vehicleFits(map, aligned) ? aligned : null;
}

/** An occupied loop exit waits for space instead of materialising inside traffic. */
export function freeRoadLoop(
  map: WorldMap,
  at: { x: number; y: number },
  heading: number,
  vehicles: readonly VehicleObstacle[],
) {
  const next = loopRoadPosition(map.id, at.x, at.y) ?? edgeLoop(map, at.x, at.y);
  if (!next || !vehicleFits(map, { ...next, heading }, true)) return null;
  const c = Math.abs(Math.cos(heading)),
    s = Math.abs(Math.sin(heading));
  const hw = (TILE * (c * CAR_LENGTH + s * CAR_WIDTH)) / 2,
    hh = (TILE * (s * CAR_LENGTH + c * CAR_WIDTH)) / 2;
  if (
    vehicles.some(
      (vehicle) =>
        Math.abs(next.x - vehicle.x) < hw + vehicle.hw + 0.5 &&
        Math.abs(next.y - vehicle.y) < hh + vehicle.hh + 0.5,
    )
  )
    return null;
  return next;
}
