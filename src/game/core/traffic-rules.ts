import type { DrivingCollision, DrivingState } from "./driving";
import { buildLondon } from "./london";
import { CAR_LENGTH, CAR_WIDTH, ROAD_LANE_OFFSET } from "./vehicles";
import { TILE } from "./world";

export type RoadDirection = "east" | "west" | "north" | "south";
export type RoadAxis = "horizontal" | "vertical";
export type SignalColour = "red" | "amber" | "green";
export interface RoadJunction { id: string; x: number; y: number; offsetMs: number }
export interface ZebraCrossing { id: string; junctionId: string; x: number; y: number; w: number; h: number; axis: RoadAxis }
/** AI positions, dimensions and speed use tiles and tiles/second. */
export interface TrafficVehicle { id?: string; x: number; y: number; heading: number; length?: number; width?: number; speed?: number }
export interface CrossingPedestrian { id: string; x: number; y: number; heading: number; walking: boolean }
export interface RoadViolation { id: string; reason: "red-light" | "wrong-way" | "collision" | "crossing"; message: string }
export interface RoadCooldown { lastAt: number; events: Record<string, number> }

export const TRAFFIC_CYCLE_MS = 40_000;
export const JUNCTION_STOP_DISTANCE = 3.9;
export const CROSSING_DISTANCE = 3.25;
export const ROAD_OFFENCE_COOLDOWN_MS = 8_000;
export const ROAD_EVENT_COOLDOWN_MS = 20_000;
const ROAD = new Set(["=", ":"]);
const directionAxis = (direction: RoadDirection): RoadAxis => direction === "east" || direction === "west" ? "horizontal" : "vertical";
const vector = (direction: RoadDirection) => ({ x: direction === "east" ? 1 : direction === "west" ? -1 : 0, y: direction === "south" ? 1 : direction === "north" ? -1 : 0 });
const directionOf = (dx: number, dy: number): RoadDirection => Math.abs(dx) >= Math.abs(dy) ? dx >= 0 ? "east" : "west" : dy >= 0 ? "south" : "north";
let cached: { junctions: RoadJunction[]; crossings: ZebraCrossing[]; horizontal: number[]; vertical: number[] } | undefined;

/** Road centres and crossings come from the same four-tile grid as collisions. Coordinates are tiles. */
export function trafficLayout() {
  if (cached) return cached;
  const tiles = buildLondon().tiles, rows = tiles.length, cols = tiles[0].length;
  const bands = (count: number, roadCount: (i: number) => number, threshold: number) => {
    const centres: number[] = [];
    let start = -1;
    for (let i = 0; i <= count; i++) {
      if (i < count && roadCount(i) >= threshold) { if (start < 0) start = i; }
      else if (start >= 0) { if (i - start >= 4) centres.push(start + (i - start) / 2); start = -1; }
    }
    return centres;
  };
  const horizontal = bands(rows, y => [...tiles[y]].filter(ch => ROAD.has(ch)).length, cols * 0.7);
  const vertical = bands(cols, x => tiles.filter(row => ROAD.has(row[x])).length, rows / 3);
  const isRoad = (x: number, y: number) => ROAD.has(tiles[Math.floor(y)]?.[Math.floor(x)] ?? "");
  const junctions: RoadJunction[] = [];
  for (const y of horizontal) for (const x of vertical)
    if (isRoad(x, y) && isRoad(x - 7, y) && isRoad(x + 7, y) && isRoad(x, y - 7) && isRoad(x, y + 7))
      junctions.push({ id: `junction-${x}-${y}`, x, y, offsetMs: ((x * 7 + y * 11) % 4) * 3000 });
  const crossings: ZebraCrossing[] = junctions.flatMap(j => ["east", "west", "north", "south"].map(value => {
    const direction = value as RoadDirection, v = vector(direction), axis = directionAxis(direction);
    return { id: `${j.id}-${direction}`, junctionId: j.id, x: j.x - v.x * CROSSING_DISTANCE, y: j.y - v.y * CROSSING_DISTANCE, w: axis === "horizontal" ? 0.7 : 4, h: axis === "horizontal" ? 4 : 0.7, axis };
  }));
  cached = { junctions, crossings, horizontal, vertical };
  return cached;
}

/** Shared wall-clock phase: perpendicular traffic is always red before green changes. */
export function signalAt(junction: RoadJunction, timeMs: number): { horizontal: SignalColour; vertical: SignalColour; pedestrian: "walk" | "wait" } {
  const phase = ((timeMs + junction.offsetMs) % TRAFFIC_CYCLE_MS + TRAFFIC_CYCLE_MS) % TRAFFIC_CYCLE_MS;
  return { horizontal: phase < 14000 ? "green" : phase < 16000 ? "amber" : "red", vertical: phase >= 20000 && phase < 34000 ? "green" : phase >= 34000 && phase < 36000 ? "amber" : "red", pedestrian: phase >= 16000 && phase < 20000 || phase >= 36000 ? "walk" : "wait" };
}

/** Eight residents use the same zebra positions, wall clock and protected phases in both renderers. */
export function crossingPedestrianPoses(timeMs: number): CrossingPedestrian[] {
  const layout = trafficLayout();
  return layout.junctions.filter((_, i) => i % 2 === 0).map((junction, i) => {
    const crossing = layout.crossings.find(c => c.junctionId === junction.id && c.axis === "horizontal" && (i % 2 ? c.x > junction.x : c.x < junction.x))!;
    const phase = ((timeMs + junction.offsetMs) % TRAFFIC_CYCLE_MS + TRAFFIC_CYCLE_MS) % TRAFFIC_CYCLE_MS;
    const returning = phase >= 36000;
    const progress = phase < 16000 ? 0 : phase < 19400 ? (phase - 16000) / 3400 : phase < 36000 ? 1 : Math.max(0, 1 - (phase - 36000) / 3400);
    return { id: `pedestrian-${crossing.id}`, x: crossing.x, y: crossing.y - 2.6 + 5.2 * progress, heading: returning ? -Math.PI / 2 : Math.PI / 2, walking: phase >= 16000 && phase < 19400 || phase >= 36000 && phase < 39400 };
  });
}

/** Left of travel: east uses the north lane, south uses the east lane. */
export function leftLanePoint(x: number, y: number, dx: number, dy: number) {
  const length = Math.hypot(dx, dy) || 1;
  return { x: x + dy / length * ROAD_LANE_OFFSET, y: y - dx / length * ROAD_LANE_OFFSET };
}

export function stopLine(junction: RoadJunction, direction: RoadDirection) {
  const v = vector(direction);
  return { ...leftLanePoint(junction.x - v.x * JUNCTION_STOP_DISTANCE, junction.y - v.y * JUNCTION_STOP_DISTANCE, v.x, v.y), axis: directionAxis(direction) };
}

const crossingOccupied = (crossing: ZebraCrossing, pedestrians: readonly { x: number; y: number }[]) => pedestrians.some(p => Math.abs(p.x - crossing.x) <= crossing.w / 2 + 0.25 && Math.abs(p.y - crossing.y) <= crossing.h / 2 + 0.25);

/** Oriented footprints catch the overlap that can occur when an axis-aligned route turns. */
function trafficOverlaps(a: TrafficVehicle, b: TrafficVehicle) {
  const axes = [a.heading, a.heading + Math.PI / 2, b.heading, b.heading + Math.PI / 2];
  return axes.every(angle => {
    const ax = Math.cos(angle), ay = Math.sin(angle);
    const radius = (car: TrafficVehicle) => Math.abs(Math.cos(car.heading - angle)) * (car.length ?? CAR_LENGTH) / 2 + Math.abs(Math.sin(car.heading - angle)) * (car.width ?? CAR_WIDTH) / 2;
    return Math.abs((b.x - a.x) * ax + (b.y - a.y) * ay) < radius(a) + radius(b) - 0.001;
  });
}

const overlapPriority = (vehicle: TrafficVehicle) => vehicle.id === "player" ? "" : vehicle.id ?? `${vehicle.x.toFixed(3)}:${vehicle.y.toFixed(3)}:${vehicle.heading.toFixed(3)}`;

/** A stopped queue inherits its front car's corner priority, avoiding cyclic pairwise waits. */
function queuePriority(vehicle: TrafficVehicle, others: readonly TrafficVehicle[]) {
  let front = vehicle;
  const visited = new Set<TrafficVehicle>();
  for (let i = 0; i < others.length; i++) {
    visited.add(front);
    const dx = Math.cos(front.heading), dy = Math.sin(front.heading);
    let leader: TrafficVehicle | undefined, nearest = Infinity;
    for (const other of others) {
      if (visited.has(other) || other.id && other.id === front.id || Math.cos(other.heading - front.heading) < 0.9) continue;
      const ahead = (other.x - front.x) * dx + (other.y - front.y) * dy;
      const side = Math.abs((other.x - front.x) * -dy + (other.y - front.y) * dx);
      const connected = ((front.length ?? CAR_LENGTH) + (other.length ?? CAR_LENGTH)) / 2 + 0.351;
      if (ahead > 0.001 && ahead <= connected && ahead < nearest && side < ((front.width ?? CAR_WIDTH) + (other.width ?? CAR_WIDTH)) / 2 + 0.12) {
        leader = other;
        nearest = ahead;
      }
    }
    if (!leader) break;
    front = leader;
  }
  return overlapPriority(front);
}

/** Clamp actual frame travel before stop lines, occupied zebras and lead/crossing vehicles. */
export function trafficMoveDistance(vehicle: TrafficVehicle, desiredDistance: number, timeMs: number, others: readonly TrafficVehicle[] = [], pedestrians: readonly { x: number; y: number }[] = []) {
  let allowed = Math.max(0, desiredDistance);
  const direction = directionOf(Math.cos(vehicle.heading), Math.sin(vehicle.heading)), axis = directionAxis(direction), v = vector(direction);
  const length = vehicle.length ?? CAR_LENGTH, width = vehicle.width ?? CAR_WIDTH;
  const forward = (x: number, y: number) => (x - vehicle.x) * v.x + (y - vehicle.y) * v.y;
  const lateral = (x: number, y: number) => Math.abs((x - vehicle.x) * -v.y + (y - vehicle.y) * v.x);
  const before = (x: number, y: number) => {
    const gap = forward(x, y) - length / 2;
    // Cars already across a stop line keep clearing the junction when signals change.
    if (gap >= -0.18) allowed = Math.min(allowed, Math.max(0, gap - 0.12));
  };
  const layout = trafficLayout();
  for (const j of layout.junctions) {
    if (lateral(j.x, j.y) > 2.1 || forward(j.x, j.y) <= 0 || signalAt(j, timeMs)[axis] === "green") continue;
    const line = stopLine(j, direction);
    before(line.x, line.y);
  }
  for (const crossing of layout.crossings) {
    if (crossing.axis !== axis || lateral(crossing.x, crossing.y) > 2.1 || !crossingOccupied(crossing, pedestrians)) continue;
    const half = axis === "horizontal" ? crossing.w / 2 : crossing.h / 2;
    before(crossing.x - v.x * half, crossing.y - v.y * half);
  }
  for (const other of others) {
    if (other === vehicle || vehicle.id && other.id === vehicle.id) continue;
    if (trafficOverlaps(vehicle, other)) {
      // A route corner can rotate two previously clear bodies into overlap.
      // Exactly one existing body may clear it; a new collision is still blocked below.
      const sameDirection = Math.cos(other.heading - vehicle.heading) > 0.9;
      const ahead = forward(other.x, other.y);
      if (sameDirection && Math.abs(ahead) > 0.001) {
        if (ahead < 0) continue;
        allowed = 0;
        continue;
      }
      const vehiclePriority = queuePriority(vehicle, others), otherPriority = queuePriority(other, [...others, vehicle]);
      if (vehiclePriority < otherPriority || vehiclePriority === otherPriority && overlapPriority(vehicle) < overlapPriority(other)) continue;
      allowed = 0;
      continue;
    }
    const angle = other.heading - vehicle.heading;
    const otherLong = Math.abs(Math.cos(angle)) * (other.length ?? CAR_LENGTH) / 2 + Math.abs(Math.sin(angle)) * (other.width ?? CAR_WIDTH) / 2;
    const otherWide = Math.abs(Math.sin(angle)) * (other.length ?? CAR_LENGTH) / 2 + Math.abs(Math.cos(angle)) * (other.width ?? CAR_WIDTH) / 2;
    const distance = forward(other.x, other.y);
    // At a perpendicular corner, side padding can stop two physically clear
    // cars forever. Keep comfort space for parallel lanes; use real side
    // extents when one car can safely clear across the other's nose.
    const sidePadding = Math.abs(Math.cos(angle)) > 0.9 ? 0.12 : 0;
    if (distance > 0 && lateral(other.x, other.y) < width / 2 + otherWide + sidePadding)
      allowed = Math.min(allowed, Math.max(0, distance - length / 2 - otherLong - 0.3));
  }
  return allowed < 1e-7 ? 0 : allowed;
}

export function trafficShouldStop(vehicle: TrafficVehicle, timeMs: number, others: readonly TrafficVehicle[] = [], pedestrians: readonly { x: number; y: number }[] = []) {
  return trafficMoveDistance(vehicle, 0.2, timeMs, others, pedestrians) < 0.025;
}

/** Driving states use pixels; pedestrian positions use tiles, matching trafficMoveDistance. */
export function checkRoadViolation(prev: DrivingState, next: DrivingState, timeMs: number, options: { collision?: DrivingCollision; pedestrians?: readonly { x: number; y: number }[] } = {}): RoadViolation | null {
  const collision = options.collision;
  if (collision && collision.kind !== "obstacle" && collision.speed >= 40) {
    const obstacle = collision.obstacle;
    return { id: `collision-${obstacle?.id ?? `${Math.round((obstacle?.x ?? next.x) / TILE)}-${Math.round((obstacle?.y ?? next.y) / TILE)}`}`, reason: "collision", message: collision.kind === "pedestrian" ? "You hit a pedestrian. Drive carefully around people." : "You collided with another vehicle. Leave room to stop." };
  }
  const dx = next.x - prev.x, dy = next.y - prev.y;
  const speed = Math.max(Math.abs(prev.speed), Math.abs(next.speed));
  if (Math.hypot(dx, dy) < 1e-5 || speed === 0) return null;
  const direction = directionOf(dx, dy), v = vector(direction), axis = directionAxis(direction);
  const previous = { x: prev.x / TILE, y: prev.y / TILE }, current = { x: next.x / TILE, y: next.y / TILE };
  // Use the leading edge in the direction of actual travel, including reverse.
  const extent = (heading: number) => (axis === "horizontal" ? Math.abs(Math.cos(heading)) * CAR_LENGTH + Math.abs(Math.sin(heading)) * CAR_WIDTH : Math.abs(Math.sin(heading)) * CAR_LENGTH + Math.abs(Math.cos(heading)) * CAR_WIDTH) / 2;
  const crossed = (x: number, y: number) => {
    const before = (previous.x - x) * v.x + (previous.y - y) * v.y + extent(prev.heading);
    const after = (current.x - x) * v.x + (current.y - y) * v.y + extent(next.heading);
    return before <= 0 && after > 0 && Math.abs((current.x - x) * -v.y + (current.y - y) * v.x) < 2.2;
  };
  const layout = trafficLayout();
  for (const crossing of layout.crossings) {
    if (crossing.axis !== axis || !crossingOccupied(crossing, options.pedestrians ?? [])) continue;
    const half = axis === "horizontal" ? crossing.w / 2 : crossing.h / 2;
    if (crossed(crossing.x - v.x * half, crossing.y - v.y * half)) return { id: `crossing-${crossing.id}`, reason: "crossing", message: "Give way to pedestrians using the zebra crossing." };
  }
  for (const j of layout.junctions) {
    if (signalAt(j, timeMs)[axis] !== "red") continue;
    const line = stopLine(j, direction);
    if (crossed(line.x, line.y)) return { id: `red-${j.id}-${direction}`, reason: "red-light", message: "You crossed a red light. Stop before the white line." };
  }
  // Tight turns and junctions need room to cross the centre line without penalties.
  // Reverse is for parking/manoeuvring, not a forward wrong-lane offence.
  if (speed < 40) return null;
  if (prev.speed < 0 || next.speed < 0) return null;
  if (layout.junctions.some(j => Math.abs(current.x - j.x) < 5.5 && Math.abs(current.y - j.y) < 5.5)) return null;
  const straight = Math.abs(axis === "horizontal" ? dy : dx) < Math.abs(axis === "horizontal" ? dx : dy) * 0.35;
  if (!straight) return null;
  const centres = axis === "horizontal" ? layout.horizontal : layout.vertical;
  for (const centre of centres) {
    const side = (axis === "horizontal" ? current.y : current.x) - centre;
    const previousSide = (axis === "horizontal" ? previous.y : previous.x) - centre;
    if (Math.abs(side) > 1.85 || Math.abs(side) < 0.35 || Math.abs(previousSide) < 0.35) continue;
    const expectedSign = direction === "east" || direction === "north" ? -1 : 1;
    if (Math.sign(side) !== expectedSign && Math.sign(previousSide) === Math.sign(side)) return { id: `wrong-way-${axis}-${centre}-${direction}`, reason: "wrong-way", message: "You are driving against traffic. Keep to the left lane." };
  }
  return null;
}

export const createRoadCooldown = (): RoadCooldown => ({ lastAt: -Infinity, events: {} });
/** Mutates only after accepting a distinct offence; waiting and contact frames cannot add repeated stars. */
export function acceptRoadViolation(cooldown: RoadCooldown, violation: RoadViolation | null, timeMs: number) {
  if (!violation || timeMs - cooldown.lastAt < ROAD_OFFENCE_COOLDOWN_MS) return false;
  const previous = cooldown.events[violation.id];
  if (previous !== undefined && timeMs - previous < ROAD_EVENT_COOLDOWN_MS) return false;
  cooldown.lastAt = timeMs;
  cooldown.events[violation.id] = timeMs;
  return true;
}
