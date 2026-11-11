import { TILE, type WorldMap } from "./world";

/**
 * People at work around the city, outside their own workplaces: street sweepers
 * on the pavement, builders on site, gardeners in the parks, couriers carrying
 * parcels, guards on patrol, market traders serving. Each worker either works
 * on the spot or walks a short beat and works at each end.
 */
export type WorkPose = "sweep" | "hammer" | "carry" | "clipboard" | "direct" | "serve";

export interface CityWorker {
  id: string;
  /** Role whose uniform they wear (ROLE_UNIFORMS keys). */
  role: string;
  pose: WorkPose;
  /** Where they work, in tiles. */
  x: number;
  z: number;
  /** A short beat to walk between jobs, in tiles (both ends walkable). */
  beat?: { x: number; z: number };
  /** Which way they face while working (radians, 0 = +z). */
  facing: number;
}

/** Who works outside each workplace door, and how. */
const CREWS: Record<string, { role: string; pose: WorkPose; walk?: number; side?: number }[]> = {
  cleaner: [{ role: "cleaner", pose: "sweep", walk: 6 }, { role: "cleaner", pose: "sweep", walk: -5 }],
  builder: [{ role: "builder", pose: "hammer", side: -1 }, { role: "builder", pose: "carry", walk: 4 }, { role: "builder", pose: "clipboard", side: 1 }],
  gardener: [{ role: "gardener", pose: "sweep", side: -2 }, { role: "gardener", pose: "carry", walk: 5 }],
  "delivery-driver": [{ role: "delivery-driver", pose: "carry", walk: 7 }],
  warehouse: [{ role: "warehouse", pose: "carry", walk: -6 }],
  security: [{ role: "security", pose: "clipboard", walk: 5 }],
  police: [{ role: "police", pose: "direct", side: 2 }],
  fisher: [{ role: "fisher", pose: "serve", side: 1 }],
  mechanic: [{ role: "mechanic", pose: "hammer", side: 1 }],
  firefighter: [{ role: "firefighter", pose: "carry", walk: 4 }],
  stocker: [{ role: "stocker", pose: "carry", walk: -4 }],
  teacher: [{ role: "teacher", pose: "clipboard", side: 1 }],
  "pizza-chef": [{ role: "pizza-chef", pose: "serve", side: 1 }],
};

const WALKABLE = "-_gf";

/** Find a walkable tile on the pavement row in front of a door, `dx` tiles along. */
function along(map: WorldMap, x: number, y: number, dx: number) {
  const step = Math.sign(dx) || 1;
  let reach = 0;
  for (let i = 1; i <= Math.abs(dx); i++) {
    if (!WALKABLE.includes(map.tiles[y]?.[x + i * step] ?? "#")) break;
    reach = i;
  }
  return x + reach * step;
}

export function cityWorkers(map: WorldMap, limit = 24): CityWorker[] {
  const out: CityWorker[] = [];
  for (const door of map.portals) {
    const m = /^role-door-(.+)$/.exec(door.id);
    if (!m) continue;
    const crew = CREWS[m[1]];
    if (!crew) continue;
    const dx = Math.floor(door.rect.x / TILE), dy = Math.floor(door.rect.y / TILE);
    // Stand on the pavement just in front of the door (one row down if that's walkable too).
    const row = WALKABLE.includes(map.tiles[dy + 1]?.[dx] ?? "#") ? dy + 1 : dy;
    crew.forEach((c, i) => {
      if (out.length >= limit) return;
      const x0 = along(map, dx, row, c.side ?? (i % 2 ? 1 : -1));
      if (!WALKABLE.includes(map.tiles[row]?.[x0] ?? "#")) return;
      const beatX = c.walk ? along(map, x0, row, c.walk) : x0;
      out.push({
        id: `${m[1]}-${i}`, role: c.role, pose: c.pose,
        x: x0 + 0.5, z: row + 0.5,
        beat: beatX !== x0 ? { x: beatX + 0.5, z: row + 0.5 } : undefined,
        // Face the street while working, or the door for builders and traders.
        facing: c.pose === "serve" || c.pose === "hammer" ? Math.PI : 0,
      });
    });
  }
  return out;
}
