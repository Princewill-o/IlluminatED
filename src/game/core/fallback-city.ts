import { buildLondon } from "./london";
import { TILE, type Rect, type WorldMap } from "./world";

export interface FallbackBuilding extends Rect {
  id: string;
  label: string;
  colour: string;
  roof: string;
  accent: string;
  ink: string;
  kind: "building" | "station" | "landmark";
  solid: Rect[];
  doors: { x: number; y: number; w: number }[];
}

/** Current geometry, never the dimensions or positions of an older baked atlas. */
export function cityFallbackPlan(map: WorldMap) {
  const buildings: FallbackBuilding[] = [];
  for (const t of buildLondon().things) {
    if (t.kind !== "building" && t.kind !== "station" && t.kind !== "landmark") continue;
    const x = t.x * TILE, y = t.y * TILE, w = t.w * TILE, h = t.h * TILE;
    const solid: Rect[] = [];
    for (let ty = t.y; ty < t.y + t.h; ty++)
      for (let tx = t.x; tx < t.x + t.w; tx++)
        if (map.tiles[ty]?.[tx] === "X") solid.push({ x: tx * TILE, y: ty * TILE, w: TILE, h: TILE });
    const entrances = map.portals.filter(p => Math.abs(p.rect.y - y - h) < 1 && p.rect.x + p.rect.w / 2 >= x && p.rect.x + p.rect.w / 2 <= x + w && p.to.kind !== "bus" && p.to.kind !== "bike");
    const brand = t.id === "mcdonalds" ? { accent: "#c92627", ink: "#ffc72c" }
      : t.id === "kfc" ? { accent: "#b72025", ink: "#fff7e9" }
        : t.id === "starbucks" ? { accent: "#006241", ink: "#ffffff" } : null;
    buildings.push({
      id: t.id, kind: t.kind, x, y, w, h, solid,
      label: t.kind === "building" ? t.label ?? entrances[0]?.label.split(":")[0] ?? "" : t.name.replaceAll("-", " "),
      colour: t.kind === "building" ? t.colour : t.kind === "station" ? "#b5463a" : "#cdbb9c",
      roof: t.kind === "building" ? t.roof : "#78818a",
      accent: brand?.accent ?? (t.kind === "building" ? t.accent ?? "#243b54" : t.kind === "station" ? "#2b5fd9" : "#675848"),
      ink: brand?.ink ?? "#ffffff",
      doors: entrances.length ? entrances.map(p => ({ x: p.rect.x + p.rect.w / 2, y: p.rect.y, w: Math.min(TILE * 1.1, p.rect.w - 4) })) : [{ x: x + w / 2, y: y + h, w: TILE * 0.7 }],
    });
  }
  const drawn = new Set(buildings.flatMap(b => b.solid.map(r => `${r.x / TILE},${r.y / TILE}`)));
  const fixtures: (Rect & { kind: string })[] = [];
  const things = buildLondon().things;
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    if (map.tiles[y][x] !== "X" || drawn.has(`${x},${y}`)) continue;
    const thing = things.find(t => t.x === x && t.y === y);
    fixtures.push({ x: x * TILE, y: y * TILE, w: TILE, h: TILE, kind: thing?.kind ?? "service-box" });
  }
  return { width: map.width, height: map.height, buildings, fixtures };
}
