import type { WorldMap } from "./world";

/** Road openings on a map's border, and the wrap that carries you through the tunnel to the far side. */
const ROAD = new Set(["=", ":"]);
const TILE = 32;
export type Side = "n" | "s" | "w" | "e";
export type EdgeRun = { side: Side; from: number; to: number };

const runCache = new WeakMap<object, EdgeRun[]>();
export function edgeRoadRuns(map: Pick<WorldMap, "tiles" | "cols" | "rows">): EdgeRun[] {
  const hit = runCache.get(map);
  if (hit) return hit;
  const runs: EdgeRun[] = [];
  const at = (x: number, y: number) => map.tiles[y]?.[x] ?? "";
  // Look a couple of tiles in, since some maps finish the edge row with kerb or verge.
  const cell = (pick: (d: number) => string) => [0, 1, 2].map(pick).find((c) => ROAD.has(c)) ?? "";
  const scan = (side: Side, len: number, get: (i: number) => string) => {
    let start = -1;
    for (let i = 0; i <= len; i++) {
      const road = i < len && ROAD.has(get(i));
      if (road && start < 0) start = i;
      if (!road && start >= 0) { if (i - start >= 2) runs.push({ side, from: start, to: i }); start = -1; }
    }
  };
  scan("n", map.cols, (x) => cell((d) => at(x, d)));
  scan("s", map.cols, (x) => cell((d) => at(x, map.rows - 1 - d)));
  scan("w", map.rows, (y) => cell((d) => at(d, y)));
  scan("e", map.rows, (y) => cell((d) => at(map.cols - 1 - d, y)));
  runCache.set(map, runs);
  return runs;
}

const OPPOSITE: Record<Side, Side> = { n: "s", s: "n", w: "e", e: "w" };

/**
 * Inside a tunnel mouth at the edge, carry the traveller to the matching road on the far side.
 * Positions are in pixels (32 per tile). Returns null when not in a tunnel.
 */
export function edgeLoop(map: Pick<WorldMap, "tiles" | "cols" | "rows">, x: number, y: number): { x: number; y: number } | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const width = map.cols * TILE, height = map.rows * TILE;
  const trigger = 2.5 * TILE, landing = 4 * TILE;
  const side: Side | null = x < trigger ? "w" : x > width - trigger ? "e" : y < trigger ? "n" : y > height - trigger ? "s" : null;
  if (!side) return null;
  const along = (side === "n" || side === "s" ? x : y) / TILE;
  const runs = edgeRoadRuns(map);
  if (!runs.some((r) => r.side === side && along >= r.from - 0.2 && along <= r.to + 0.2)) return null;
  const far = runs.filter((r) => r.side === OPPOSITE[side]);
  if (!far.length) return null;
  const same = far.find((r) => along >= r.from && along <= r.to);
  const target = same ? along : (() => {
    const best = far.reduce((p, q) => (Math.abs((q.from + q.to) / 2 - along) < Math.abs((p.from + p.to) / 2 - along) ? q : p));
    return (best.from + best.to) / 2;
  })();
  switch (OPPOSITE[side]) {
    case "e": return { x: width - landing, y: target * TILE };
    case "w": return { x: landing, y: target * TILE };
    case "s": return { x: target * TILE, y: height - landing };
    case "n": return { x: target * TILE, y: landing };
  }
}
