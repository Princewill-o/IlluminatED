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

/** Live rescue timing (ms): crash, ambulance drives in, loading, drive towards hospital. */
export const LIVE_RESCUE_MS = 26_000;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
export function liveRescueFrame(elapsedMs: number) {
  const t = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const phase = t < 2500 ? "downed" : t < 10000 ? "approaching" : t < 14000 ? "loading" : t < 25000 ? "departing" : "arrived";
  return {
    phase,
    /** Impact: 1 at the moment of the crash, fading over two seconds. */
    crash: 1 - clamp01(t / 2000),
    approach: ease((t - 2500) / 7500),
    loading: ease((t - 10900) / 2100),
    depart: clamp01((t - 14000) / 11000),
    doors: t < 10000 ? 0 : t < 10600 ? ease((t - 10000) / 600) : t < 13300 ? 1 : t < 14000 ? 1 - ease((t - 13300) / 700) : 0,
    stretcherApproach: ease((t - 10000) / 900),
    lift: ease((t - 10900) / 700),
    playerOnGround: t < 10900,
    playerInAmbulance: t >= 13000,
    crewVisible: t >= 9800 && t < 13400,
    siren: t >= 2500 && t < 25000,
    complete: t >= LIVE_RESCUE_MS,
  };
}

/** A point along a polyline of tile coordinates [x0, y0, x1, y1, ...] at fraction f, with its heading. */
export function pathPoint(path: readonly number[], f: number) {
  const n = path.length / 2;
  if (n < 2) return { x: path[0] ?? 0, y: path[1] ?? 0, dx: 1, dy: 0 };
  let total = 0;
  for (let i = 1; i < n; i++) total += Math.hypot(path[i * 2] - path[i * 2 - 2], path[i * 2 + 1] - path[i * 2 - 1]);
  let left = clamp01(f) * total;
  for (let i = 1; i < n; i++) {
    const ax = path[i * 2 - 2], ay = path[i * 2 - 1], bx = path[i * 2], by = path[i * 2 + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (left <= len || i === n - 1) {
      const k = len ? Math.min(1, left / len) : 0;
      return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, dx: len ? (bx - ax) / len : 1, dy: len ? (by - ay) / len : 0 };
    }
    left -= len;
  }
  return { x: path[path.length - 2], y: path[path.length - 1], dx: 1, dy: 0 };
}

/** Trim a route to at most `max` tiles of driving, keeping its start. */
export function trimPath(path: readonly number[], max: number) {
  const out = path.slice(0, 2);
  let used = 0;
  for (let i = 2; i < path.length; i += 2) {
    const ax = out[out.length - 2], ay = out[out.length - 1];
    const len = Math.hypot(path[i] - ax, path[i + 1] - ay);
    if (used + len >= max) { const k = (max - used) / len; out.push(ax + (path[i] - ax) * k, ay + (path[i + 1] - ay) * k); break; }
    used += len;
    out.push(path[i], path[i + 1]);
  }
  return out.map((v) => Math.round(v * 10) / 10);
}

/**
 * The whole live rescue: where the ambulance stops, the road route it takes to reach
 * you (from about 30 tiles away), and the route it drives off along towards the
 * hospital entrance. Routes follow real road tiles via `route` (driving.roadRoute).
 */
export function rescuePlan(
  map: WorldMap,
  px: number,
  py: number,
  route: (from: { x: number; y: number }, to: { x: number; y: number }) => { x: number; y: number }[],
  /** The map the vehicle heads for: hospital for an ambulance, police-station or court for an arrest. */
  destination = "hospital",
  /** Where the vehicle already is (world px), e.g. the police car that made the arrest, or "parked" right at the kerb. */
  start?: { x: number; y: number } | "parked",
) {
  // The nearest road; failing that, the ambulance comes straight to where you are.
  const road = rescueRoad(map, px, py) ?? rescueRoad(map, px, py, 40) ?? {
    stopX: Math.max(TILE * 2, Math.min(map.width - TILE * 2, px + TILE * 1.5)), stopY: Math.max(TILE * 2, Math.min(map.height - TILE * 2, py)), axisX: 1, axisY: 0,
  };
  const stop = { x: road.stopX, y: road.stopY };
  const flat = (pts: { x: number; y: number }[]) => pts.flatMap((p) => [p.x / TILE, p.y / TILE]);
  const clampIn = (x: number, y: number) => ({ x: Math.max(TILE * 4, Math.min(map.width - TILE * 4, x)), y: Math.max(TILE * 4, Math.min(map.height - TILE * 4, y)) });
  const from = start === "parked" ? clampIn(stop.x - road.axisX * TILE * 5, stop.y - road.axisY * TILE * 5)
    : start ? clampIn(start.x, start.y) : clampIn(stop.x - road.axisX * TILE * 30, stop.y - road.axisY * TILE * 30);
  let inPath = flat(route(from, stop));
  if (start && inPath.length < 4) inPath = [from.x / TILE, from.y / TILE, stop.x / TILE, stop.y / TILE];
  if (inPath.length < 4) inPath = [stop.x / TILE - road.axisX * 14, stop.y / TILE - road.axisY * 14, stop.x / TILE, stop.y / TILE];
  // Drive the last part only (about 34 tiles), ending exactly at the stop.
  const reverse = (p: number[]) => { const o: number[] = []; for (let i = p.length - 2; i >= 0; i -= 2) o.push(p[i], p[i + 1]); return o; };
  inPath = reverse(trimPath(reverse([...inPath, stop.x / TILE, stop.y / TILE]), 34));
  const hospital = map.portals.find((p) => p.to.kind === "map" && p.to.mapId === destination);
  let outPath: number[] = [];
  if (hospital) outPath = flat(route(stop, { x: hospital.rect.x + hospital.rect.w / 2, y: hospital.rect.y + hospital.rect.h / 2 }));
  if (outPath.length < 4) outPath = [stop.x / TILE, stop.y / TILE, stop.x / TILE + road.axisX * 30, stop.y / TILE + road.axisY * 30];
  outPath = trimPath([stop.x / TILE, stop.y / TILE, ...outPath], 70);
  return { ...road, inPath: inPath.map((v) => Math.round(v * 10) / 10), outPath, toHospital: Boolean(hospital) };
}
