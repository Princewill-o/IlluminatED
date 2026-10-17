/**
 * Regions beyond London. Each is laid out here as tiles + things (like
 * london.ts), rendered in Blender by scripts/world/build_london.py, and joined
 * to London by train.
 *
 * The Highlands: a big open valley with snow-capped mountains, a loch, pine
 * forests, a village with a cafe and a lodge, a campsite and hiking trails.
 */
export type RegionThing =
  | { kind: "building"; id: string; x: number; y: number; w: number; h: number; height: number; colour: string; roof: string; style: "terrace" | "shop"; label?: string }
  | { kind: "station"; id: string; name: string; x: number; y: number; w: number; h: number }
  | { kind: "mountain"; id: string; x: number; y: number; w: number; h: number; peak: number }
  | { kind: "pine" | "rock" | "flower" | "tent" | "campfire" | "lamp" | "bench"; id: string; x: number; y: number };

export interface Region {
  id: string;
  name: string;
  cols: number;
  rows: number;
  tiles: string[];
  things: RegionThing[];
  spawn: { x: number; y: number };
  /** Where you step out of the station (tiles). */
  stationExit: { x: number; y: number };
  /** Hike spots: viewpoints along the trails (tiles). */
  viewpoints: { id: string; name: string; x: number; y: number }[];
}

const hash = (x: number, y: number, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

let cache: Region | null = null;

export function buildHighlands(): Region {
  if (cache) return cache;
  const W = 120;
  const H = 90;
  const t = Array.from({ length: H }, () => Array.from({ length: W }, () => "g"));
  const set = (x: number, y: number, ch: string) => {
    if (x >= 0 && y >= 0 && x < W && y < H) t[y][x] = ch;
  };
  const get = (x: number, y: number) => t[y]?.[x];
  const things: RegionThing[] = [];
  let n = 0;
  const id = (p: string) => `${p}-${n++}`;
  const inEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

  // ── Mountains around the valley (solid), with snow on the high ones ──────
  const peaks = [
    { x: 4, y: 2, w: 26, h: 16, peak: 7 },
    { x: 34, y: 0, w: 28, h: 13, peak: 8 },
    { x: 70, y: 1, w: 30, h: 15, peak: 9 },
    { x: 102, y: 6, w: 17, h: 22, peak: 7 },
    { x: 104, y: 40, w: 15, h: 22, peak: 6 },
    { x: 2, y: 62, w: 24, h: 18, peak: 6 },
    { x: 44, y: 76, w: 34, h: 13, peak: 7 },
    { x: 86, y: 72, w: 26, h: 16, peak: 8 },
  ];
  for (const p of peaks) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) if (inEllipse(x + 0.5, y + 0.5, cx, cy, p.w / 2, p.h / 2)) set(x, y, "k");
    things.push({ kind: "mountain", id: id("mountain"), ...p });
  }

  // ── Loch Lorne, with a shingle shore ─────────────────────────────────────
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (inEllipse(x + 0.5, y + 0.5, 74, 44, 17, 9) || inEllipse(x + 0.5, y + 0.5, 86, 52, 8, 5)) set(x, y, "w");
      else if ((inEllipse(x + 0.5, y + 0.5, 74, 44, 19, 11) || inEllipse(x + 0.5, y + 0.5, 86, 52, 10, 7)) && get(x, y) === "g") set(x, y, "_");
    }

  // ── The glen road from the station through the village ──────────────────
  for (let x = 6; x < 60; x++) {
    set(x, 38, "=");
    set(x, 39, ":");
    if (get(x, 37) === "g") set(x, 37, "-");
    if (get(x, 40) === "g") set(x, 40, "-");
  }
  // Village square.
  for (let y = 41; y < 49; y++) for (let x = 30; x < 46; x++) set(x, y, "-");

  // ── Hiking trails: to the loch, up the glens, round the campsite ────────
  const trail = (pts: [number, number][]) => {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(x0 + ((x1 - x0) * s) / steps);
        const y = Math.round(y0 + ((y1 - y0) * s) / steps);
        if (get(x, y) === "g" || get(x, y) === "f") set(x, y, "_");
        if (get(x + 1, y) === "g" || get(x + 1, y) === "f") set(x + 1, y, "_");
      }
    }
  };
  trail([[46, 44], [55, 44], [56, 33]]);
  trail([[38, 37], [38, 24], [48, 18], [52, 14]]);
  trail([[20, 37], [18, 26], [20, 19]]);
  trail([[58, 39], [60, 58], [74, 60], [92, 62], [100, 55]]);
  trail([[38, 49], [36, 62], [44, 70], [60, 72]]);
  trail([[92, 38], [100, 30], [100, 24]]);

  // ── Things that need free ground ─────────────────────────────────────────
  const free = (x: number, y: number, w = 1, h = 1) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (get(i, j) !== "g" && get(i, j) !== "f") return false;
    return true;
  };
  const solid = (x: number, y: number, w: number, h: number) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, "X");
  };

  // Station at the west end of the glen road.
  solid(6, 34, 3, 2);
  things.push({ kind: "station", id: "highlands", name: "Glen Lorne", x: 6, y: 34, w: 3, h: 2 });
  for (let x = 6; x < 9; x++) set(x, 36, "-");
  set(7, 37, "-");

  // Village: cottages either side of the road, the cafe and the lodge on the square.
  const COLOURS = ["#f2ead8", "#e8dcc2", "#f4f0ea", "#d9c7a6"];
  const house = (x: number, y: number, w: number, h: number, style: "terrace" | "shop", label?: string) => {
    solid(x, y, w, h);
    things.push({ kind: "building", id: id("cottage"), x, y, w, h, height: 2.6, colour: COLOURS[(x + y) % 4], roof: "#4a5568", style, label });
  };
  for (const x of [14, 19, 24, 48, 53]) house(x, 33, 4, 3, "terrace");
  for (const x of [14, 19, 24, 48]) house(x, 41, 4, 3, "terrace");
  house(31, 41, 6, 3, "terrace", "Highland Cafe");
  house(39, 41, 6, 3, "terrace", "Mountain Lodge");
  for (let y = 44; y < 45; y++) for (let x = 31; x < 45; x++) set(x, y, "-");
  for (const [x, y] of [[30, 47], [45, 47], [12, 37], [28, 37], [44, 37], [58, 37]]) {
    set(x, y, "L");
    things.push({ kind: "lamp", id: id("lamp"), x, y });
  }
  for (const [x, y] of [[34, 47], [40, 47], [60, 47], [68, 56]]) {
    if (get(x, y) === "g" || get(x, y) === "-" || get(x, y) === "_") {
      set(x, y, "k");
      things.push({ kind: "bench", id: id("bench"), x, y });
    }
  }

  // Campsite on the south shore.
  for (const [x, y] of [[66, 64], [70, 66], [76, 65]]) {
    if (free(x, y, 2, 2)) {
      for (let j = y; j < y + 2; j++) for (let i = x; i < x + 2; i++) set(i, j, "k");
      things.push({ kind: "tent", id: id("tent"), x, y });
    }
  }
  if (free(72, 62)) {
    set(72, 62, "k");
    things.push({ kind: "campfire", id: id("campfire"), x: 72, y: 62 });
  }

  // Pine forests (dense in the glens, thin in the valley), rocks and wildflowers.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!free(x, y)) continue;
      const forest = inEllipse(x, y, 20, 52, 14, 8) || inEllipse(x, y, 58, 22, 10, 6) || inEllipse(x, y, 96, 34, 8, 9) || inEllipse(x, y, 30, 22, 8, 5) || inEllipse(x, y, 90, 64, 9, 5);
      const r = hash(x, y, 7);
      const nearRoad = y > 31 && y < 50 && x < 62;
      if (forest && r < 0.42 && (x + y) % 2 === 0 && !nearRoad) {
        set(x, y, "T");
        things.push({ kind: "pine", id: id("pine"), x, y });
      } else if (!nearRoad && r > 0.985) {
        set(x, y, "k");
        things.push({ kind: "rock", id: id("rock"), x, y });
      } else if (r > 0.94 && r < 0.97) {
        things.push({ kind: "flower", id: id("flower"), x, y });
      } else if (forest || r < 0.12) set(x, y, "f");
    }

  cache = {
    id: "highlands",
    name: "The Highlands",
    cols: W,
    rows: H,
    tiles: t.map((r) => r.join("")),
    things,
    spawn: { x: 7.5 * 32, y: 37.5 * 32 },
    stationExit: { x: 7.5, y: 37.5 },
    viewpoints: [
      { id: "loch", name: "Loch Lorne shore", x: 56, y: 33 },
      { id: "ridge", name: "Ben Lorne ridge", x: 52, y: 15 },
      { id: "falls", name: "Corrie Falls", x: 20, y: 20 },
      { id: "east", name: "East Glen lookout", x: 100, y: 25 },
    ],
  };
  return cache;
}

/** What Blender needs (same shape as londonScene). */
export function highlandsScene() {
  const r = buildHighlands();
  return { region: "highlands", cols: r.cols, rows: r.rows, tiles: r.tiles, things: r.things, stations: [] };
}
