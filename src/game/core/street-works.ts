import type { WorldMap } from "./world";

/**
 * Work going on around the city streets, planned from the map so it never blocks a door:
 *
 * - Building sites: scaffolding up the front of an unnamed block, builders working on the
 *   scaffold boards and the pavement, a skip and a pickup at the kerb.
 * - Delivery stops: a van parked at the kerb outside a shop, with the driver carrying
 *   parcels between the van and the shop door.
 *
 * Everything is in tiles (x across, z down the map). Workers either work on the spot or walk
 * a short beat and work at each end, like the crews in city-workers.
 */
export type StreetWorkPose = "hammer" | "carry" | "clipboard" | "sweep";

export interface StreetWorker {
  id: string;
  role: "builder" | "delivery-driver" | "roadworker";
  pose: StreetWorkPose;
  x: number;
  z: number;
  /** Height they stand at (a scaffold board), in tiles. */
  y: number;
  facing: number;
  beat?: { x: number; z: number };
}

export interface StreetWork {
  id: string;
  kind: "scaffold" | "delivery";
  /** The building face the work is on: x0..x1 along z = front. */
  x0: number;
  x1: number;
  front: number;
  /** A parked vehicle at the kerb, nose along +x (heading 0) or -x (heading π). */
  vehicle?: { kind: string; x: number; z: number; heading: number };
  workers: StreetWorker[];
}

/** Scaffold board heights (tiles above the pavement). */
export const SCAFFOLD_LEVELS = [1.15, 2.3, 3.45];

const PAVEMENT = "-_";
const ROAD = "=:";
type Plot = { id: string; kind: string; x: number; y: number; w: number; h: number; label?: string; companyId?: string; style?: string };
type Placed = { id: string; kind: string; x: number; y: number; w?: number; h?: number; label?: string; companyId?: string };

const seedOf = (id: string) => Array.from(id).reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 0);

/** The plot's front row is pavement all the way along, with road straight after it. */
function kerbside(map: WorldMap, t: Plot) {
  const front = t.y + t.h;
  for (let x = t.x; x < t.x + t.w; x++) {
    if (!PAVEMENT.includes(map.tiles[front]?.[x] ?? "#")) return false;
    if (!ROAD.includes(map.tiles[front + 1]?.[x] ?? "#")) return false;
  }
  return true;
}

/** Keep sites apart so they read as separate jobs, not one long works zone. */
function spaced(chosen: Plot[], t: Plot, gap: number) {
  return chosen.every((c) => Math.hypot(c.x - t.x, c.y - t.y) > gap);
}

export function streetWorks(map: WorldMap, things: readonly Placed[], limits = { sites: 4, deliveries: 4 }): StreetWork[] {
  const plots = things.filter((t): t is Plot => t.kind === "building" && t.w !== undefined && t.h !== undefined).filter((t) => kerbside(map, t)).sort((a, b) => seedOf(a.id) - seedOf(b.id));
  const out: StreetWork[] = [];

  // Building sites on unnamed blocks.
  const sites: Plot[] = [];
  for (const t of plots) {
    if (sites.length >= limits.sites) break;
    if (t.label || t.companyId || t.w < 3 || !spaced(sites, t, 14)) continue;
    sites.push(t);
  }
  for (const t of sites) {
    const front = t.y + t.h, x0 = t.x + 0.1, x1 = t.x + t.w - 0.1, mid = (x0 + x1) / 2;
    const board = front + 0.3;
    const workers: StreetWorker[] = [
      // Up on the scaffold, working on the facade.
      { id: `${t.id}-high`, role: "builder", pose: "hammer", x: x0 + 0.6, z: board, y: SCAFFOLD_LEVELS[1], facing: Math.PI },
      { id: `${t.id}-mid`, role: "builder", pose: "hammer", x: x1 - 0.6, z: board, y: SCAFFOLD_LEVELS[0], facing: Math.PI },
      // A labourer walks materials along the board.
      { id: `${t.id}-board`, role: "builder", pose: "carry", x: x0 + 0.5, z: board, y: SCAFFOLD_LEVELS[0], facing: Math.PI / 2, beat: { x: x1 - 1.4, z: board } },
      // On the pavement: the site manager, and someone fetching from the pickup.
      { id: `${t.id}-boss`, role: "builder", pose: "clipboard", x: mid, z: front + 0.75, y: 0, facing: Math.PI },
      { id: `${t.id}-fetch`, role: "builder", pose: "carry", x: x1 - 0.3, z: front + 0.75, y: 0, facing: -Math.PI / 2, beat: { x: x0 + 0.3, z: front + 0.75 } },
    ];
    if (t.w >= 4) workers.push({ id: `${t.id}-top`, role: "builder", pose: "hammer", x: mid, z: board, y: SCAFFOLD_LEVELS[2], facing: Math.PI });
    out.push({ id: `site-${t.id}`, kind: "scaffold", x0, x1, front, vehicle: { kind: "pickup@#f2a31b", x: mid, z: front + 1.55, heading: seedOf(t.id) % 2 ? 0 : Math.PI }, workers });
  }

  // Delivery stops outside named shops and businesses.
  const stops: Plot[] = [];
  for (const t of plots) {
    if (stops.length >= limits.deliveries) break;
    if (!t.label || sites.includes(t) || !spaced([...stops, ...sites], t, 10)) continue;
    stops.push(t);
  }
  stops.forEach((t, i) => {
    const front = t.y + t.h, mid = t.x + t.w / 2;
    const van = ["box-van@#f4f4f0", "box-van@#2b6fe0", "box-van@#c8322d", "box-van@#2fa865"][i % 4];
    out.push({
      id: `delivery-${t.id}`, kind: "delivery", x0: t.x, x1: t.x + t.w, front,
      vehicle: { kind: van, x: mid + 1.2, z: front + 1.55, heading: i % 2 ? 0 : Math.PI },
      workers: [
        { id: `${t.id}-driver`, role: "delivery-driver", pose: "carry", x: mid + 0.9, z: front + 0.7, y: 0, facing: Math.PI, beat: { x: mid - 0.4, z: front + 0.2 } },
      ],
    });
  });
  return out;
}
