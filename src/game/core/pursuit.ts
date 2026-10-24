import { TILE, blocked, safeSpot, step, type WorldMap } from "./world";
export interface Point {
  x: number;
  y: number;
}
export const SEARCH_RADIUS = TILE * 14;
export const ESCAPE_SECONDS = 6;
/** If traffic boxes the police car in this long, the officers get out and run. */
export const BLOCKED_SECONDS = 4;
/** Another vehicle on the road, as a centred box in pixels (half-width, half-height). */
export interface VehicleBox {
  x: number;
  y: number;
  hw: number;
  hh: number;
  id?: string;
}
/** The police car's own footprint (a car, in pixels) for a direction of travel. */
export function policeCarBox(at: Point, dir: Point): VehicleBox {
  const horizontal = Math.abs(dir.x) >= Math.abs(dir.y);
  const long = TILE * 0.95, wide = TILE * 0.5;
  return { x: at.x, y: at.y, hw: horizontal ? long : wide, hh: horizontal ? wide : long, id: "police" };
}
const overlaps = (a: VehicleBox, b: VehicleBox) => Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh;
export interface Pursuit {
  origin: Point;
  radius: number;
  car: Point;
  route: Point[];
  officers: Point[];
  stage: "arriving" | "chasing" | "tased" | "challenge";
  outsideSince: number | null;
  /** When the police car first got stuck behind another vehicle. */
  blockedSince?: number | null;
  escaped: boolean;
}
const ROAD = new Set(["=", ":"]);
/** Breadth-first routes use the same collision map as the player. */
export function walkRoute(
  map: WorldMap,
  from: Point,
  to: Point,
  roadOnly = false,
): Point[] {
  const sx = Math.max(0, Math.min(map.cols - 1, Math.floor(from.x / TILE)));
  const sy = Math.max(0, Math.min(map.rows - 1, Math.floor(from.y / TILE)));
  const gx = Math.max(0, Math.min(map.cols - 1, Math.floor(to.x / TILE)));
  const gy = Math.max(0, Math.min(map.rows - 1, Math.floor(to.y / TILE)));
  const start = sy * map.cols + sx,
    goal = gy * map.cols + gx;
  const queue = [start],
    parent = new Map<number, number>([[start, -1]]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const at = queue[cursor];
    if (at === goal) break;
    const x = at % map.cols,
      y = Math.floor(at / map.cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        key = ny * map.cols + nx;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= map.cols ||
        ny >= map.rows ||
        parent.has(key)
      )
        continue;
      if (
        roadOnly
          ? !ROAD.has(map.tiles[ny][nx])
          : blocked(map, (nx + 0.5) * TILE, (ny + 0.5) * TILE)
      )
        continue;
      parent.set(key, at);
      queue.push(key);
    }
  }
  if (!parent.has(goal)) return [];
  const route: Point[] = [];
  for (let at = goal; at !== start; at = parent.get(at)!)
    route.unshift({
      x: ((at % map.cols) + 0.5) * TILE,
      y: (Math.floor(at / map.cols) + 0.5) * TILE,
    });
  return route;
}
export function startPursuit(map: WorldMap, player: Point): Pursuit {
  const roads: Point[] = [];
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++)
      if (ROAD.has(map.tiles[y][x]))
        roads.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
  roads.sort(
    (a, b) =>
      Math.hypot(a.x - player.x, a.y - player.y) -
      Math.hypot(b.x - player.x, b.y - player.y),
  );
  const target = roads[0] ?? safeSpot(map, player.x, player.y);
  let car = target,
    route: Point[] = [];
  for (const candidate of roads
    .filter((p) => Math.hypot(p.x - target.x, p.y - target.y) >= TILE * 9)
    .slice(0, 24)) {
    const path = walkRoute(map, candidate, target, true);
    if (path.length) {
      car = candidate;
      route = path;
      break;
    }
  }
  return {
    origin: { ...player },
    radius: SEARCH_RADIUS,
    car: { ...car },
    route,
    officers: [],
    stage: "arriving",
    outsideSince: null,
    escaped: false,
  };
}
export function tickPursuit(
  state: Pursuit,
  map: WorldMap,
  player: Point,
  now: number,
  dt: number,
  /** Every other vehicle: the police car can't drive through any of them. */
  traffic: readonly VehicleBox[] = [],
  driving = false,
): Pursuit {
  if (state.stage === "tased" || state.stage === "challenge" || state.escaped) return state;
  const outside =
    Math.hypot(player.x - (driving ? state.car.x : state.origin.x), player.y - (driving ? state.car.y : state.origin.y)) >
    state.radius;
  const outsideSince = outside ? (state.outsideSince ?? now) : null;
  if (outsideSince !== null && now - outsideSince >= ESCAPE_SECONDS * 1000)
    return { ...state, outsideSince, escaped: true };
  if (driving && state.stage === "chasing" && Math.hypot(player.x - state.car.x, player.y - state.car.y) > TILE * 3) {
    return { ...state, stage: "arriving", officers: [], blockedSince: null, outsideSince };
  }
  if (state.stage === "arriving") {
    // A moving suspect needs a moving destination, not the original offence spot.
    const destination = driving ? traffic.find(v => v.id === "player") ?? player : player;
    const roadTarget = { x: (Math.floor(destination.x / TILE) + 0.5) * TILE, y: (Math.floor(destination.y / TILE) + 0.5) * TILE };
    const route = driving ? walkRoute(map, state.car, roadTarget, true) : [...state.route];
    let car = { ...state.car },
      budget = Math.min(dt, 0.5) * TILE * (driving ? 6.5 : 5),
      blocked = false;
    const others = traffic.filter((v) => v.id !== "police");
    while (budget > 0 && route.length) {
      const next = route[0],
        distance = Math.hypot(next.x - car.x, next.y - car.y);
      // Move in small slices so the car stops nose-to-tail, never inside another vehicle.
      const slice = Math.min(budget, distance, TILE * 0.25);
      const dir = { x: next.x - car.x, y: next.y - car.y };
      const ahead = distance ? { x: car.x + (dir.x * slice) / distance, y: car.y + (dir.y * slice) / distance } : next;
      if (others.some((v) => overlaps(policeCarBox(ahead, dir), v))) { blocked = true; break; }
      car = ahead;
      budget -= slice;
      if (Math.hypot(next.x - car.x, next.y - car.y) < 0.5) { car = next; route.shift(); }
    }
    const blockedSince = blocked ? (state.blockedSince ?? now) : null;
    // Stuck in traffic: the officers leave the car and continue on foot.
    const bail = blockedSince !== null && now - blockedSince >= BLOCKED_SECONDS * 1000;
    const nearDriver = Math.hypot(player.x - car.x, player.y - car.y) < TILE * 2.2;
    const arrived = driving ? (nearDriver && bail) : !route.length || bail;
    return {
      ...state,
      car,
      route: bail ? [] : route,
      outsideSince,
      blockedSince: arrived ? null : blockedSince,
      stage: arrived ? "chasing" : "arriving",
      officers: !arrived
        ? []
        : [
            safeSpot(map, car.x + TILE, car.y),
            safeSpot(map, car.x - TILE, car.y),
          ],
    };
  }
  const officers = state.officers.map((officer) => {
    const path = walkRoute(map, officer, player),
      target = path[0] ?? player;
    // step caps frame duration; divide a tick into collision-safe slices.
    let at = officer;
    for (let t = 0; t < dt; t += 0.1)
      at = step(
        map,
        at,
        target.x - at.x,
        target.y - at.y,
        Math.min(0.1, dt - t),
        0.8,
      );
    return at;
  });
  const caught = officers.some(
    (p) => Math.hypot(p.x - player.x, p.y - player.y) < TILE * 0.8,
  );
  return {
    ...state,
    officers,
    outsideSince,
    stage: caught ? "tased" : "chasing",
  };
}
export const POLICE_QUESTIONS = [
  {
    prompt: "Which of these numbers is prime?",
    options: ["121", "143", "137", "169"],
    answer: 2,
    explain: "137 has no divisors other than 1 and itself.",
  },
  {
    prompt:
      "A price rises by 20%, then falls by 20%. What is the overall change?",
    options: ["No change", "4% decrease", "4% increase", "2% decrease"],
    answer: 1,
    explain: "1.2 × 0.8 = 0.96: a 4% decrease.",
  },
  {
    prompt: "Which particle has a negative electric charge?",
    options: ["Proton", "Neutron", "Electron", "Photon"],
    answer: 2,
    explain: "Electrons carry negative charge; protons carry positive charge.",
  },
  {
    prompt:
      "Which treaty was signed with Germany in 1919 after the First World War?",
    options: [
      "Treaty of Paris (1783)",
      "Treaty of Versailles",
      "Treaty of Rome",
      "Treaty of Maastricht",
    ],
    answer: 1,
    explain: "The Treaty of Versailles was signed on 28 June 1919.",
  },
  {
    prompt: "What is the sum of the interior angles of a hexagon?",
    options: ["540°", "600°", "720°", "900°"],
    answer: 2,
    explain: "(6 − 2) × 180° = 720°.",
  },
  {
    prompt: "Which organelle is the main site of aerobic respiration?",
    options: ["Ribosome", "Nucleus", "Mitochondrion", "Chloroplast"],
    answer: 2,
    explain: "Mitochondria are the main site of aerobic respiration in cells.",
  },
] as const;

export function prisonGuardPositions(seconds: number) {
  return [28.5, 36.5].map((x, i) => {
    const t = (seconds * 0.7 + i * 17) % 44;
    return {
      x: x * TILE,
      y: (5.5 + (t < 22 ? t : 44 - t)) * TILE,
      angle: t < 22 ? 0 : Math.PI,
    };
  });
}
export function caughtByPrisonGuard(
  map: WorldMap,
  player: Point,
  seconds: number,
) {
  if (player.x < 26 * TILE) return false;
  return prisonGuardPositions(seconds).some((guard) => {
    if (Math.hypot(guard.x - player.x, guard.y - player.y) > TILE * 1.35)
      return false;
    for (let t = 0; t <= 1; t += 0.2)
      if (
        blocked(
          map,
          guard.x + (player.x - guard.x) * t,
          guard.y + (player.y - guard.y) * t,
          1,
        )
      )
        return false;
    return true;
  });
}
