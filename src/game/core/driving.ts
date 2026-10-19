import { CAR_LENGTH, CAR_WIDTH } from "./vehicles";
import { PLAYER_RADIUS, TILE, blocked, safeSpot, type WorldMap } from "./world";

export interface DrivingState {
  x: number;
  y: number;
  /** Radians clockwise from east. Remains stable when braking or reversing. */
  heading: number;
  /** Signed pixels per second. */
  speed: number;
}

export interface DrivingInput {
  throttle: number;
  steer: number;
  brake?: boolean;
  /** The selected car and the player's needs can limit its cruising speed. */
  maxSpeed?: number;
}

export interface VehicleObstacle { id?: string; kind?: "traffic" | "pedestrian"; x: number; y: number; hw: number; hh: number; dx?: number; dy?: number }
export interface DrivingCollision { kind: "traffic" | "pedestrian" | "obstacle"; speed: number; obstacle?: VehicleObstacle }

/**
 * Resolve foot traffic against the same road footprints used for car-to-car
 * collisions. Push to the nearest clear edge instead of teleporting through a
 * nearby wall with safeSpot. Pedestrians share this path as small circles.
 */
export function nudgePedestrianFromTraffic(
  map: WorldMap,
  position: { x: number; y: number },
  vehicles: readonly VehicleObstacle[] = [],
  pedestrians: readonly { x: number; y: number }[] = [],
  radius = PLAYER_RADIUS,
) {
  let x = position.x, y = position.y, collided = false;
  const clear = (px: number, py: number, skipVehicle?: VehicleObstacle, skipPerson?: { x: number; y: number }) =>
    !blocked(map, px, py, radius) &&
    !vehicles.some(vehicle => vehicle !== skipVehicle && Math.abs(px - vehicle.x) < vehicle.hw + radius && Math.abs(py - vehicle.y) < vehicle.hh + radius) &&
    !pedestrians.some(person => person !== skipPerson && Math.hypot(px - person.x, py - person.y) < radius + 7);

  // Four passes handle dense crossings where the first safe edge meets a
  // second body, while keeping this small and predictable per movement tick.
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const vehicle of vehicles) {
      const horizontal = Math.abs(vehicle.dx ?? 1) >= Math.abs(vehicle.dy ?? 0);
      const along = horizontal ? x - vehicle.x : y - vehicle.y;
      const across = horizontal ? y - vehicle.y : x - vehicle.x;
      const longHalf = horizontal ? vehicle.hw : vehicle.hh;
      const wideHalf = horizontal ? vehicle.hh : vehicle.hw;
      const pushLong = longHalf + radius - Math.abs(along);
      const pushWide = wideHalf + radius - Math.abs(across);
      if (pushLong <= 0 || pushWide <= 0) continue;
      collided = true;
      const side = Math.sign(across || ((vehicle.dx ?? 1) >= 0 ? 1 : -1));
      const forward = Math.sign(along || 1);
      const candidates = pushWide <= pushLong
        ? horizontal
          ? [[x, vehicle.y + side * (wideHalf + radius + 0.5)], [vehicle.x + forward * (longHalf + radius + 0.5), y]]
          : [[vehicle.x + side * (wideHalf + radius + 0.5), y], [x, vehicle.y + forward * (longHalf + radius + 0.5)]]
        : horizontal
          ? [[vehicle.x + forward * (longHalf + radius + 0.5), y], [x, vehicle.y + side * (wideHalf + radius + 0.5)]]
          : [[x, vehicle.y + forward * (longHalf + radius + 0.5)], [vehicle.x + side * (wideHalf + radius + 0.5), y]];
      const spot = candidates.find(([px, py]) => clear(px, py, vehicle));
      if (spot) { [x, y] = spot; moved = true; }
    }
    for (const person of pedestrians) {
      const dx = x - person.x, dy = y - person.y;
      const distance = Math.hypot(dx, dy), minDistance = radius + 7;
      if (distance >= minDistance) continue;
      collided = true;
      const nx = distance > 0.01 ? dx / distance : 1;
      const ny = distance > 0.01 ? dy / distance : 0;
      const px = person.x + nx * (minDistance + 0.5), py = person.y + ny * (minDistance + 0.5);
      if (clear(px, py, undefined, person)) { x = px; y = py; moved = true; }
    }
    if (!moved) break;
  }
  return { x, y, collided };
}

const ROAD = new Set(["=", ":"]);
const PAVEMENT = new Set(["-", "_"]);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const approach = (value: number, target: number, amount: number) => value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);

/** Separating-axis rectangle test, so noses and rotated corners cannot clip a kerb. */
function overlaps(state: Pick<DrivingState, "x" | "y" | "heading">, x: number, y: number, hw: number, hh: number) {
  const c = Math.cos(state.heading), s = Math.sin(state.heading);
  const l = CAR_LENGTH * TILE / 2, w = CAR_WIDTH * TILE / 2;
  const dx = x - state.x, dy = y - state.y;
  const ac = Math.abs(c), as = Math.abs(s), e = 0.015;
  return Math.abs(dx) < ac * l + as * w + hw - e &&
    Math.abs(dy) < as * l + ac * w + hh - e &&
    Math.abs(dx * c + dy * s) < l + hw * ac + hh * as - e &&
    Math.abs(-dx * s + dy * c) < w + hw * as + hh * ac - e;
}

/** Spawning needs a whole road footprint. Driving permits clear paved kerbs on tight turns. */
export function vehicleFits(map: WorldMap, state: Pick<DrivingState, "x" | "y" | "heading">, turningClearance = false) {
  const c = Math.abs(Math.cos(state.heading)), s = Math.abs(Math.sin(state.heading));
  const hw = (c * CAR_LENGTH + s * CAR_WIDTH) * TILE / 2;
  const hh = (s * CAR_LENGTH + c * CAR_WIDTH) * TILE / 2;
  if (![state.x, state.y, state.heading].every(Number.isFinite) || state.x - hw < 0 || state.y - hh < 0 || state.x + hw > map.width || state.y + hh > map.height) return false;
  if (turningClearance && !ROAD.has(map.tiles[Math.floor(state.y / TILE)]?.[Math.floor(state.x / TILE)] ?? "")) return false;
  for (let y = Math.floor((state.y - hh) / TILE); y <= Math.floor((state.y + hh) / TILE); y++)
    for (let x = Math.floor((state.x - hw) / TILE); x <= Math.floor((state.x + hw) / TILE); x++)
      if (!ROAD.has(map.tiles[y]?.[x] ?? "") && !(turningClearance && map.tiles[y]?.[x] === "-") && overlaps(state, (x + 0.5) * TILE, (y + 0.5) * TILE, TILE / 2, TILE / 2)) return false;
  return true;
}

/** Accelerate, coast, brake/reverse and steer. Small swept steps prevent tunnelling. */
export function driveStep(map: WorldMap, state: DrivingState, input: DrivingInput, seconds: number, traffic: readonly VehicleObstacle[] = [], onCollision?: (collision: DrivingCollision) => void): DrivingState {
  let next = { ...state };
  if (!vehicleFits(map, next, true)) return { ...next, speed: 0 };
  const dt = clamp(seconds, 0, 0.1);
  const count = Math.max(1, Math.ceil(dt / (1 / 120)));
  const tick = dt / count;
  const throttle = clamp(input.throttle, -1, 1), steer = clamp(input.steer, -1, 1);
  const maxSpeed = clamp(input.maxSpeed ?? 260, 90, 380);
  for (let i = 0; i < count; i++) {
    const reversingPedal = throttle !== 0 && Math.sign(throttle) !== Math.sign(next.speed) && Math.abs(next.speed) > 2;
    const speed = input.brake || reversingPedal ? approach(next.speed, 0, 280 * tick)
      : throttle ? clamp(next.speed + throttle * 150 * tick, -maxSpeed * 0.35, maxSpeed)
      : approach(next.speed, 0, 85 * tick);
    const heading = next.heading + steer * 1.7 * Math.min(Math.abs(speed) / 70, 1) * Math.sign(speed) * tick;
    const candidate = { x: next.x + Math.cos(heading) * speed * tick, y: next.y + Math.sin(heading) * speed * tick, heading, speed };
    const hitsTraffic = traffic.find(t => overlaps(candidate, t.x, t.y, t.hw, t.hh) && !overlaps(next, t.x, t.y, t.hw, t.hh));
    if (!vehicleFits(map, candidate, true) || hitsTraffic) {
      onCollision?.({ kind: hitsTraffic?.kind ?? (hitsTraffic ? "traffic" : "obstacle"), speed: Math.abs(speed), obstacle: hitsTraffic });
      return { ...next, speed: 0 };
    }
    next = candidate;
  }
  return next;
}

/** Walkable connected tiles keep car collection/parking on the same side of water. */
function reachable(map: WorldMap, position: { x: number; y: number }, radius: number) {
  const start = safeSpot(map, position.x, position.y);
  const sx = Math.floor(start.x / TILE), sy = Math.floor(start.y / TILE);
  const queue: { x: number; y: number; distance: number }[] = [{ x: sx, y: sy, distance: 0 }];
  const seen = new Set([`${sx},${sy}`]);
  for (let i = 0; i < queue.length; i++) {
    const q = queue[i];
    if (q.distance >= radius) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = q.x + dx, y = q.y + dy, id = `${x},${y}`;
      if (seen.has(id) || blocked(map, (x + 0.5) * TILE, (y + 0.5) * TILE)) continue;
      seen.add(id);
      queue.push({ x, y, distance: q.distance + 1 });
    }
  }
  return queue;
}

/** Closest reachable road lane with enough room for a car, never a footbridge or lawn. */
export function nearestDrivingSpot(map: WorldMap, position: { x: number; y: number }, obstacles: readonly VehicleObstacle[] = []): DrivingState | null {
  let best: DrivingState | null = null, score = Infinity;
  for (const q of reachable(map, position, 36)) {
    if (!ROAD.has(map.tiles[q.y]?.[q.x] ?? "")) continue;
    // Integer cross-street positions are the centres of two-tile lanes.
    for (const heading of [0, -Math.PI / 2]) {
      const candidate = { x: (q.x + (heading === 0 ? 0.5 : 0)) * TILE, y: (q.y + (heading === 0 ? 0 : 0.5)) * TILE, heading, speed: 0 };
      const distance = q.distance * TILE + Math.hypot(candidate.x - position.x, candidate.y - position.y) * 0.05;
      if (distance >= score || !vehicleFits(map, candidate) || obstacles.some(t => overlaps(candidate, t.x, t.y, t.hw, t.hh))) continue;
      // Keep left: eastbound on the north lane, northbound on the west lane.
      const otherSide = heading === 0 ? map.tiles[q.y - 2]?.[q.x] : map.tiles[q.y]?.[q.x - 2];
      if (ROAD.has(otherSide ?? "")) candidate.heading += Math.PI;
      best = candidate;
      score = distance;
    }
  }
  return best;
}

/** A nearby reachable pavement for getting out, with a pedestrian-sized clear space. */
export function nearestParkingSpot(map: WorldMap, position: { x: number; y: number }): { x: number; y: number } | null {
  for (const q of reachable(map, position, 8)) {
    if (!PAVEMENT.has(map.tiles[q.y]?.[q.x] ?? "")) continue;
    return { x: (q.x + 0.5) * TILE, y: (q.y + 0.5) * TILE };
  }
  return null;
}
