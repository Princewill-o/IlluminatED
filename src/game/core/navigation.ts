import { roadRoute } from "./driving";
import { walkingRoute, type Place } from "./map-guide";
import { TILE, type WorldMap } from "./world";

export type RoutePoint = { x: number; y: number };
export interface WorldNavigation {
  target: Place;
  points: RoutePoint[];
  driving: boolean;
  metres: number;
}
export function routeMetres(points: RoutePoint[]) {
  return Math.round(
    (points
      .slice(1)
      .reduce(
        (total, p, i) =>
          total + Math.hypot(p.x - points[i].x, p.y - points[i].y),
        0,
      ) /
      TILE) *
      8,
  );
}
/** Keep road corners intact and subdivide long straights for the curved-world shader. */
export function denseRoute(points: RoutePoint[]) {
  const dense: RoutePoint[] = [];
  points.forEach((p, i) => {
    if (!i) {
      dense.push(p);
      return;
    }
    const a = points[i - 1],
      steps = Math.max(1, Math.ceil(Math.hypot(p.x - a.x, p.y - a.y) / TILE));
    for (let n = 1; n <= steps; n++)
      dense.push({
        x: a.x + ((p.x - a.x) * n) / steps,
        y: a.y + ((p.y - a.y) * n) / steps,
      });
  });
  return dense;
}
/** Reuse the untravelled path; rebuild only when the player actually leaves it. */
export function remainingRoute(points: RoutePoint[], player: RoutePoint) {
  let nearest = -1,
    distance = Infinity;
  points.forEach((point, i) => {
    const d = Math.hypot(point.x - player.x, point.y - player.y);
    if (d < distance) {
      nearest = i;
      distance = d;
    }
  });
  return distance <= TILE * 1.5 ? points.slice(Math.max(0, nearest)) : null;
}
export function navigationRoute(
  map: WorldMap,
  from: RoutePoint,
  target: Place,
  driving = false,
): WorldNavigation {
  const points = denseRoute(
    driving ? roadRoute(map, from, target) : walkingRoute(map, from, target),
  );
  return { target, points, driving, metres: routeMetres(points) };
}
