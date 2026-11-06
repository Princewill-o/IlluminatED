/**
 * Car parks laid into spare grass beside the roads.
 *
 * Tiles: P is the car-park surface (drive and walk on it), U an empty bay you can
 * park in, Q a bay with a parked car (solid). A dropped kerb of P joins the lot to
 * the road across the pavement, so cars can drive straight in.
 */
export const CAR_PARK_SURFACE = new Set(["P", "U"]);
export const PARKED_BAY = "Q";

export type Lot = { x: number; y: number; w: number; h: number; facing: "n" | "s" | "w" | "e" };
const GRASS = new Set(["g", "f"]);
const ROAD = new Set(["=", ":"]);

/** Deterministic little hash, so the same bays are full every visit. */
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/**
 * Finds up to `max` lots (10 or 6 along the road, 8 deep) of untouched grass whose front
 * faces a pavement with a road just beyond it, then paints them into the tiles.
 */
export function addCarParks(tiles: string[], max = 40, avoid: { x: number; y: number; w: number; h: number }[] = []): { tiles: string[]; lots: Lot[] } {
  const g = tiles.map((r) => [...r]);
  const rows = g.length, cols = g[0]?.length ?? 0;
  const at = (x: number, y: number) => g[y]?.[x] ?? "#";
  const taken = (x: number, y: number, w: number, h: number) =>
    avoid.some((a) => x < a.x + a.w + 1 && x + w + 1 > a.x && y < a.y + a.h + 1 && y + h + 1 > a.y);
  const allGrass = (x: number, y: number, w: number, h: number) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!GRASS.has(at(i, j))) return false;
    return true;
  };
  const lots: Lot[] = [];
  // Big lots first, then smaller corner lots to fill the gaps.
  for (const [LONG, DEEP] of [[10, 8], [6, 8]] as const) {
  // Scan in a coarse grid so lots spread across the whole map rather than bunching.
  for (let y = 2; y < rows - 2 && lots.length < max; y += 3) {
    for (let x = 2; x < cols - 2 && lots.length < max; x += 3) {
      const options: Lot[] = [
        { x, y, w: LONG, h: DEEP, facing: "s" },
        { x, y, w: LONG, h: DEEP, facing: "n" },
        { x, y, w: DEEP, h: LONG, facing: "e" },
        { x, y, w: DEEP, h: LONG, facing: "w" },
      ];
      for (const lot of options) {
        if (lot.x + lot.w >= cols - 1 || lot.y + lot.h >= rows - 1) continue;
        if (!allGrass(lot.x, lot.y, lot.w, lot.h) || taken(lot.x, lot.y, lot.w, lot.h)) continue;
        if (lots.some((l) => lot.x < l.x + l.w + 4 && lot.x + lot.w + 4 > l.x && lot.y < l.y + l.h + 4 && lot.y + lot.h + 4 > l.y)) continue;
        // The kerb row outside the front must be pavement, with road beyond, across the entrance.
        const mid = lot.facing === "n" || lot.facing === "s" ? lot.x + Math.floor(lot.w / 2) : lot.y + Math.floor(lot.h / 2);
        const front = (k: number) => {
          switch (lot.facing) {
            case "s": return [at(mid - 1, lot.y + lot.h + k), at(mid, lot.y + lot.h + k), at(mid + 1, lot.y + lot.h + k)];
            case "n": return [at(mid - 1, lot.y - 1 - k), at(mid, lot.y - 1 - k), at(mid + 1, lot.y - 1 - k)];
            case "e": return [at(lot.x + lot.w + k, mid - 1), at(lot.x + lot.w + k, mid), at(lot.x + lot.w + k, mid + 1)];
            case "w": return [at(lot.x - 1 - k, mid - 1), at(lot.x - 1 - k, mid), at(lot.x - 1 - k, mid + 1)];
          }
        };
        let gap = -1;
        for (let k = 0; k < 3; k++) {
          const row = front(k);
          if (row.every((c) => ROAD.has(c))) { gap = k; break; }
          if (!row.every((c) => c === "-" || c === "_" || GRASS.has(c))) break;
        }
        if (gap < 1) continue;
        paint(lot, gap, mid);
        lots.push(lot);
        break;
      }
    }
  }
  }
  function paint(lot: Lot, gap: number, mid: number) {
    const tile = (u: number, v: number) => lotTile(lot, u, v);
    const { long, deep } = lotSize(lot);
    for (let v = 0; v < deep; v++)
      for (let u = 0; u < long; u++) {
        const [tx, ty] = tile(u, v);
        // Front four rows: the aisle (room to turn a car). Back four: bays two tiles wide.
        if (v < 4) g[ty][tx] = "P";
        else g[ty][tx] = hash(lot.x + Math.floor(u / 2), lot.y) < 0.62 ? PARKED_BAY : "U";
      }
    // Dropped kerb across the pavement to the road, three tiles wide.
    for (let k = 0; k < gap; k++)
      for (const d of [-1, 0, 1]) {
        if (lot.facing === "s") g[lot.y + lot.h + k][mid + d] = "P";
        if (lot.facing === "n") g[lot.y - 1 - k][mid + d] = "P";
        if (lot.facing === "e") g[mid + d][lot.x + lot.w + k] = "P";
        if (lot.facing === "w") g[mid + d][lot.x - 1 - k] = "P";
      }
  }
  return { tiles: g.map((r) => r.join("")), lots };
}

/** A lot's length along the road and depth back from it. */
export const lotSize = (lot: Lot) => lot.facing === "n" || lot.facing === "s" ? { long: lot.w, deep: lot.h } : { long: lot.h, deep: lot.w };
/** Local (u along the front, v back from it) to tile coordinates. */
export function lotTile(lot: Lot, u: number, v: number): [number, number] {
  switch (lot.facing) {
    case "s": return [lot.x + u, lot.y + lot.h - 1 - v];
    case "n": return [lot.x + u, lot.y + v];
    case "e": return [lot.x + lot.w - 1 - v, lot.y + u];
    case "w": return [lot.x + v, lot.y + u];
  }
}
