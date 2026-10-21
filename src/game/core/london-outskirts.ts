import type { Built, Thing } from "./london";

/**
 * The open world beyond the districts: woods, a lake park, rolling downs and
 * two villages, joined by country lanes. Everything already built keeps its
 * tile coordinates (saved homes, jobs, stations and portals stay put); the
 * city's roads and river simply carry on out to the new edges.
 */
export const OUTSKIRTS = [
  { name: "Thamesmead Woods", x: 178, y: 0, w: 78, h: 42, focus: [214, 22] },
  { name: "Lakeside Park", x: 178, y: 56, w: 78, h: 80, focus: [216, 95] },
  { name: "Greenfield Downs", x: 0, y: 140, w: 130, h: 60, focus: [62, 168] },
  { name: "Ashby Village", x: 132, y: 140, w: 124, h: 60, focus: [190, 176] },
] as const;

export function expandOutskirts(core: Built, width: number, height: number): Built {
  const oldW = core.tiles[0].length, oldH = core.tiles.length;
  const grid = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => core.tiles[y]?.[x] ?? "g"));
  const things: Thing[] = [...core.things];
  const routes = [...core.routes];
  const outside = (x: number, y: number) => x >= oldW || y >= oldH;
  const get = (x: number, y: number) => grid[y]?.[x];
  const set = (x: number, y: number, v: string) => { if (outside(x, y) && grid[y]?.[x] !== undefined) grid[y][x] = v; };
  const fill = (x: number, y: number, w: number, h: number, v: string) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, v); };
  const isRoad = (c?: string) => c === "=" || c === ":";

  // Carry every road, promenade and the river straight on to the new edges.
  for (let y = 0; y < oldH; y++) {
    const c = get(oldW - 1, y)!;
    const nearRoad = [-2, -1, 0, 1, 2, 3].some((d) => isRoad(get(oldW - 1, y + d)));
    if ("w_|".includes(c) || isRoad(c) || (c === "-" && nearRoad)) for (let x = oldW; x < width; x++) set(x, y, c);
  }
  for (let x = 0; x < width; x++) {
    const c = get(x, oldH - 1)!;
    const nearRoad = [-2, -1, 0, 1, 2, 3].some((d) => isRoad(get(x + d, oldH - 1)));
    if (isRoad(c) || (c === "-" && nearRoad) || c === "_") for (let y = oldH; y < height; y++) set(x, y, c);
  }

  // Country lanes: one around the south, one up the east side.
  const road = (x: number, y: number, length: number, vertical = false) => {
    for (let a = 0; a < length; a++) for (let across = -2; across <= 3; across++) {
      const xx = x + (vertical ? across : a), yy = y + (vertical ? a : across);
      const edge = across === -2 || across === 3;
      if (!outside(xx, yy)) continue;
      if (edge && (isRoad(get(xx, yy)) || get(xx, yy) === "w")) continue;
      if (get(xx, yy) === "w") { set(xx, yy, edge ? "|" : across === 0 ? ":" : "="); continue; }
      set(xx, yy, edge ? "-" : across === 0 ? ":" : "=");
    }
  };
  road(0, 172, width);
  road(232, 0, height, true);
  routes.push([[133, 105], [233, 105], [233, 173], [133, 173], [133, 105]]);

  const path = (x: number, y: number, w: number, h: number) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if ("gf".includes(get(i, j) ?? "#")) set(i, j, "_");
  };
  let pid = 0;
  const clearOf = (x: number, y: number, pad = 1) => {
    for (let j = y - pad; j <= y + pad; j++) for (let i = x - pad; i <= x + pad; i++) if (!"gf".includes(get(i, j) ?? "#")) return false;
    return true;
  };
  const prop = (kind: "tree" | "bench" | "lamp", x: number, y: number) => {
    if (!outside(x, y) || !clearOf(x, y, kind === "tree" ? 1 : 0)) return;
    set(x, y, kind === "tree" ? "T" : kind === "bench" ? "B" : "L");
    things.push({ kind, id: `outskirts-${kind}-${pid++}`, x, y });
  };
  // A cheap deterministic scatter so the woods look natural but never change.
  const hash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };

  // ── Thamesmead Woods: dense trees with winding trails and clearings.
  for (let x = 178; x < width; x++) {
    path(x, 18 + Math.round(Math.sin(x / 7) * 3), 1, 2);
  }
  for (let y = 0; y < 40; y++) path(205 + Math.round(Math.sin(y / 5) * 2), y, 2, 1);
  for (const [cx, cy, r] of [[196, 8, 4], [214, 30, 5], [248, 10, 4]]) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r && get(x, y) === "g") set(x, y, (x + y) % 3 ? "g" : "f");
    prop("bench", cx, cy);
  }
  for (let y = 1; y < 40; y += 3) for (let x = 179; x < width - 1; x += 3) if (hash(x, y) > 0.5) prop("tree", x + (hash(y, x) > 0.5 ? 1 : 0), y);

  // ── Lakeside Park: a big lake with an island, a shore walk and meadows.
  const [lx, ly, rx, ry] = [208, 80, 20, 12];
  for (let y = ly - ry - 3; y <= ly + ry + 3; y++) for (let x = lx - rx - 3; x <= lx + rx + 3; x++) {
    const d = ((x - lx) / rx) ** 2 + ((y - ly) / ry) ** 2;
    if (d < 1) set(x, y, "w");
    else if (d < 1.28 && "gf".includes(get(x, y) ?? "#")) set(x, y, "_");
  }
  fill(lx - 3, ly - 2, 6, 4, "f");
  for (let y = 60; y < 134; y++) for (let x = 180; x < 230; x++) if (get(x, y) === "g" && hash(x, y) > 0.86) set(x, y, "f");
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    prop(a % 3 ? "tree" : "bench", Math.round(lx + Math.cos(t) * (rx + 5)), Math.round(ly + Math.sin(t) * (ry + 5)));
    if (a % 4 === 0) prop("lamp", Math.round(lx + Math.cos(t) * (rx + 3)), Math.round(ly + Math.sin(t) * (ry + 3)));
  }
  path(180, 70, 50, 2); path(180, 122, 50, 2);

  // ── Greenfield Downs: open meadows, hedged fields and lone trees.
  for (let y = 140; y < height - 1; y++) for (let x = 1; x < 130; x++) {
    if (get(x, y) !== "g") continue;
    const field = Math.floor(x / 22) + Math.floor(y / 15);
    if (field % 3 === 0 && (y % 2 === 0)) set(x, y, "f");
  }
  for (let x = 0; x < 130; x++) path(x, 156 + Math.round(Math.sin(x / 11) * 4), 1, 2);
  for (let y = 140; y < height - 2; y += 3) for (let x = 2; x < 130; x += 3) if (hash(x, y) > 0.93) prop("tree", x, y);

  // ── Ashby Village: cottages around a green, a pub and a church.
  type Building = Extract<Thing, { kind: "building" }>;
  const building = (id: string, label: string, x: number, y: number, w: number, h: number, height: number, style: Building["style"], colour: string, roof: string) => {
    for (let j = y; j < y + h + 1; j++) for (let i = x; i < x + w; i++) if (!outside(i, j) || !"gf_".includes(get(i, j) ?? "#")) return;
    fill(x, y, w, h, "X");
    things.push({ kind: "building", id: `outskirts-${id}`, label, x, y, w, h, height, style, colour, roof });
    path(x - 1, y + h, w + 2, 2);
  };
  const COTTAGE = ["#e9dcc0", "#d9b8a0", "#cfd6c4", "#f0e2c8", "#c9a58a"];
  const ROOF = ["#6b4a3a", "#4c5a6b", "#7a3f34", "#5a5048"];
  for (const [vx, vy] of [[150, 146], [196, 146], [150, 180], [196, 182], [60, 182], [14, 182]] as const) {
    for (let i = 0; i < 4; i++) {
      const x = vx + i * 9, k = (vx + vy + i) % 5;
      building(`cottage-${vx}-${vy}-${i}`, "Village cottage", x, vy, 6, 5, 2.6 + (i % 2) * 0.5, "terrace", COTTAGE[k], ROOF[k % 4]);
      prop("tree", x + 7, vy + 1);
    }
  }
  building("pub", "The Red Lion", 176, 160, 9, 6, 3, "brick", "#a0523c", "#3f3a36");
  building("church", "St Mary's", 238, 150, 8, 12, 5.2, "stone", "#d8d0bd", "#5f6a70");
  building("farm", "Greenfield Farm", 40, 146, 10, 7, 3.4, "brick", "#b5583f", "#4b3b2f");
  for (let y = 162; y < 170; y++) for (let x = 150; x < 172; x++) if (get(x, y) === "g" && (x + y) % 5 === 0) set(x, y, "f");
  for (const [x, y] of [[152, 163], [168, 163], [160, 168]]) prop("bench", x, y);

  return { ...core, tiles: grid.map((r) => r.join("")), things, routes };
}
