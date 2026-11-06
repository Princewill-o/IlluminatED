import { TILE, type WorldMap } from "./world";

const ROAD = new Set(["=", ":"]);
/**
 * Where an ambulance can pull up beside the player: the nearest road tile, and
 * which way that road runs (the longer straight run of road tiles through it).
 * Returns null when there's no road nearby (then the rescue plays as a scene).
 */
export function rescueRoad(map: WorldMap, px: number, py: number, radius = 14) {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  const at = (x: number, y: number) => ROAD.has(map.tiles[y]?.[x] ?? "");
  let best: { x: number; y: number; d: number } | null = null;
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      const x = tx + dx, y = ty + dy, d = Math.hypot(dx, dy);
      if (d <= radius && at(x, y) && (!best || d < best.d)) best = { x, y, d };
    }
  if (!best) return null;
  const run = (sx: number, sy: number) => { let n = 0; for (let k = 1; k < 20 && at(best!.x + sx * k, best!.y + sy * k); k++) n++; return n; };
  const horizontal = run(1, 0) + run(-1, 0), vertical = run(0, 1) + run(0, -1);
  const axis = horizontal >= vertical ? { x: 1, y: 0 } : { x: 0, y: 1 };
  return { stopX: (best.x + 0.5) * TILE, stopY: (best.y + 0.5) * TILE, axisX: axis.x, axisY: axis.y };
}
