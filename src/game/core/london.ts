import { COMPANIES } from "./companies";

/**
 * London: the main IlluminatED world. A stylised map of central London with the
 * Thames, its bridges, the landmarks, the City (where the 13 parody companies
 * have their HQs), terraced homes in Brixton and Underground stations that work
 * as teleports.
 *
 * This file is the single source of truth: it builds the walkable tile grid the
 * game uses AND the list of 3D things Blender builds and renders
 * (scripts/world/build_london.py reads `londonScene()` as JSON), so the picture
 * and the collisions always line up. Units are tiles (32px). North is up.
 */

export const LONDON_COLS = 96;
export const LONDON_ROWS = 72;

export type Thing =
  | { kind: "building"; id: string; x: number; y: number; w: number; h: number; height: number; colour: string; roof: string; style: "terrace" | "shop" | "office" | "glass" | "brick" | "stone" | "company"; accent?: string; label?: string; companyId?: string }
  | { kind: "landmark"; id: string; name: "big-ben" | "parliament" | "eye" | "st-pauls" | "shard" | "gherkin" | "tower-bridge" | "tower" | "battersea" | "tate" | "palace" | "canary"; x: number; y: number; w: number; h: number }
  | { kind: "tree" | "lamp" | "bench" | "phonebox" | "postbox" | "busstop"; id: string; x: number; y: number }
  | { kind: "station"; id: string; name: string; x: number; y: number; w: number; h: number };

export interface Station {
  id: string;
  name: string;
  /** Exit spot in tiles (where you appear). */
  exit: { x: number; y: number };
  lines: string[];
}

/** Parody Underground lines (colours are our own). */
export const LINES: Record<string, { name: string; colour: string }> = {
  revision: { name: "Revision line", colour: "#2b5fd9" },
  careers: { name: "Careers line", colour: "#5fd3a5" },
  homeward: { name: "Homeward line", colour: "#ffb26b" },
  city: { name: "City line", colour: "#ff7a6b" },
};

interface Built {
  tiles: string[];
  things: Thing[];
  stations: Station[];
  spawn: { x: number; y: number };
  /** River centre line (tiles) for the boats. */
  river: [number, number][];
  /** Road loops for buses and cabs (tile centres). */
  routes: [number, number][][];
}

/** River centre row for a column (the Thames' bends, simplified). */
function riverY(x: number) {
  const pts: [number, number][] = [
    [0, 39], [14, 40], [24, 44], [32, 45], [40, 42], [52, 40], [64, 41], [74, 41], [82, 44], [88, 49], [96, 47],
  ];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (x <= x1) return Math.round(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
  }
  return pts[pts.length - 1][1];
}

let cache: Built | null = null;

export function buildLondon(): Built {
  if (cache) return cache;
  const W = LONDON_COLS;
  const H = LONDON_ROWS;
  const t = Array.from({ length: H }, () => Array.from({ length: W }, () => "g"));
  const set = (x: number, y: number, ch: string) => {
    if (x >= 0 && y >= 0 && x < W && y < H) t[y][x] = ch;
  };
  const get = (x: number, y: number) => t[y]?.[x];
  const fill = (x: number, y: number, w: number, h: number, ch: string) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, ch);
  };
  const things: Thing[] = [];
  const stations: Station[] = [];
  let n = 0;
  const id = (p: string) => `${p}-${n++}`;
  const free = (x: number, y: number, w = 1, h = 1) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!["g", "-", "_"].includes(get(i, j) ?? "#")) return false;
    return true;
  };

  // ── The Thames, with embankment walks on both banks ──────────────────────
  for (let x = 0; x < W; x++) {
    const c = riverY(x);
    for (let y = c - 3; y <= c + 2; y++) set(x, y, "w");
    set(x, c - 4, "-");
    set(x, c + 3, "-");
  }
  const north = (x: number) => riverY(x) - 5; // last row of north-bank land before the walk
  const south = (x: number) => riverY(x) + 4; // first row of south-bank land after the walk

  // ── Roads ─────────────────────────────────────────────────────────────────
  const hroad = (y: number, x0 = 0, x1 = W) => {
    fill(x0, y - 1, x1 - x0, 1, "-");
    fill(x0, y, x1 - x0, 1, "=");
    fill(x0, y + 1, x1 - x0, 1, ":");
    fill(x0, y + 2, x1 - x0, 1, "-");
  };
  const vroad = (x: number, y0: number, y1: number) => {
    for (let y = y0; y < y1; y++) {
      if (get(x, y) === "w" || get(x + 1, y) === "w") {
        // A bridge: road deck over the water, railings either side.
        set(x - 1, y, "|");
        set(x, y, "=");
        set(x + 1, y, "=");
        set(x + 2, y, "|");
      } else {
        if (get(x - 1, y) !== "=" && get(x - 1, y) !== ":") set(x - 1, y, "-");
        set(x, y, "=");
        set(x + 1, y, "=");
        if (get(x + 2, y) !== "=" && get(x + 2, y) !== ":") set(x + 2, y, "-");
      }
    }
  };
  hroad(20);
  hroad(60);
  for (const x of [15, 34, 52, 70]) vroad(x, 0, H);
  vroad(88, 0, 36);
  // Millennium-style footbridge.
  for (let y = 0; y < H; y++) if (get(44, y) === "w") {
    set(43, y, "|");
    set(44, y, "_");
    set(45, y, "|");
  }
  const routes: [number, number][][] = [
    // A bus loop: along the top road, down Tower Bridge road, along the south road, up Westminster Bridge.
    [[15.5, 20.5], [70.5, 20.5], [70.5, 60.5], [34.5, 60.5], [34.5, 20.5]].map(([x, y]) => [x, y] as [number, number]),
    [[52.5, 20.5], [88.5, 20.5], [88.5, 34], [88.5, 20.5], [52.5, 20.5]].map(([x, y]) => [x, y] as [number, number]),
    [[15.5, 2], [15.5, 60.5], [52.5, 60.5], [52.5, 2], [15.5, 2]].map(([x, y]) => [x, y] as [number, number]),
  ];

  // ── Paved districts: the West End, the City and the South Bank are streets and plazas, not lawns.
  const pave = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (get(x, y) === "g") set(x, y, "-");
  };
  pave(16, 0, 34, 37);
  pave(36, 16, 52, 37);
  pave(53, 0, 88, 37);
  pave(36, 46, 71, 58);

  // ── Hyde Park (north-west) with the Serpentine ──────────────────────────
  for (let y = 2; y < 18; y++) for (let x = 1; x < 13; x++) if (get(x, y) === "g" && (x + y) % 7 === 0) set(x, y, "f");
  fill(3, 8, 7, 3, "w");
  for (let x = 1; x < 14; x++) set(x, 14, "_");
  for (let y = 1; y < 19; y++) set(7, y, get(7, y) === "w" ? "w" : "_");
  for (const [x, y] of [[2, 3], [5, 2], [11, 3], [12, 7], [2, 13], [11, 12], [4, 17], [10, 17], [12, 16], [2, 6], [9, 5]]) {
    set(x, y, "T");
    things.push({ kind: "tree", id: id("tree"), x, y });
  }
  for (const [x, y] of [[5, 14], [9, 14]]) {
    set(x, y + 1, "B");
    things.push({ kind: "bench", id: id("bench"), x, y: y + 1 });
  }
  things.push({ kind: "landmark", id: "palace", name: "palace", x: 1, y: 23, w: 12, h: 8 });
  fill(1, 23, 12, 8, "X");
  set(7, 31, "-");

  // ── Shared helpers for blocks of buildings ───────────────────────────────
  const COLOURS = ["#e8d6b9", "#cfd8e8", "#f1c6b5", "#d9e8cf", "#efe1a8", "#e6c9e8", "#c9e4ec", "#f0d2a0"];
  const ROOFS = ["#5a4a6b", "#4a5a7a", "#6b4a4a", "#3f5a4a"];
  const land = (x: number, y: number, w = 1, h = 1) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!["g", "f", "-"].includes(get(i, j) ?? "#")) return false;
    // Keep the pavement along every road clear.
    for (let j = y - 1; j <= y + h; j++)
      for (let i = x - 1; i <= x + w; i++) if (["=", ":", "|", "w"].includes(get(i, j) ?? "")) return false;
    return true;
  };
  const building = (x: number, y: number, w: number, h: number, height: number, style: Extract<Thing, { kind: "building" }>["style"], extra: Partial<Extract<Thing, { kind: "building" }>> = {}) => {
    if (!land(x, y, w, h)) return false;
    fill(x, y, w, h, "X");
    const k = (x * 7 + y * 13) % COLOURS.length;
    things.push({ kind: "building", id: id("b"), x, y, w, h, height, colour: COLOURS[k], roof: ROOFS[(x + y) % ROOFS.length], style, ...extra });
    return true;
  };
  const station = (sid: string, name: string, x: number, y: number, lines: string[], exit: { x: number; y: number }) => {
    fill(x, y, 3, 2, "X");
    things.push({ kind: "station", id: sid, name, x, y, w: 3, h: 2 });
    stations.push({ id: sid, name, exit, lines });
  };
  const street = (x: number, y: number) => {
    const kinds = ["lamp", "lamp", "phonebox", "postbox", "busstop"] as const;
    let k: (typeof kinds)[number] = kinds[(x * 3 + y) % kinds.length];
    // Bus stops every other block, not on every corner.
    if (k === "busstop" && Math.floor(x / 10) % 2 === 1) k = "lamp";
    if (!free(x, y)) return;
    set(x, y, k === "lamp" ? "L" : "X");
    things.push({ kind: k, id: id(k), x, y });
  };

  // ── West End (north of the top road, between the park and St Paul's) ────
  for (let x = 18; x < 33; x += 4) building(x, 6, 4, 6, 3 + ((x / 4) % 2), "shop");
  for (let x = 18; x < 33; x += 5) building(x, 13, 4, 4, 2.5, "terrace");
  station("oxford", "Oxford Circus", 25, 2, ["revision", "homeward"], { x: 26.5, y: 4.6 });

  // ── Westminster: Parliament, Big Ben and the station ────────────────────
  things.push({ kind: "landmark", id: "parliament", name: "parliament", x: 18, y: north(24) - 6, w: 12, h: 4 });
  fill(18, north(24) - 6, 12, 4, "X");
  things.push({ kind: "landmark", id: "big-ben", name: "big-ben", x: 30, y: north(30) - 6, w: 2, h: 2 });
  fill(30, north(30) - 6, 2, 2, "X");
  station("westminster", "Westminster", 18, 24, ["revision", "careers"], { x: 19.5, y: 26.6 });

  // ── St Paul's and Covent Garden ──────────────────────────────────────────
  things.push({ kind: "landmark", id: "st-pauls", name: "st-pauls", x: 38, y: 5, w: 10, h: 10 });
  fill(38, 5, 10, 10, "X");
  for (let x = 37; x < 51; x += 4) building(x, 24, 3, 4, 2.5, "brick");
  for (let x = 37; x < 51; x += 5) building(x, 30, 4, 3, 2, "shop");

  // ── The City: the 13 parody company HQs ──────────────────────────────────
  // Two blocks either side of Tower Bridge Road, two rows each (13 plots).
  const slots: [number, number][] = [
    [55, 12], [59, 12], [63, 12], [66, 12], [74, 12], [78, 12], [82, 12],
    [55, 24], [59, 24], [63, 24], [66, 24], [74, 24], [84, 24],
  ];
  COMPANIES.forEach((c, i) => {
    const [x, y] = slots[i];
    if (!building(x, y, 3, 5, 4 + (i % 3), "company", { accent: c.accent, label: c.name, companyId: c.id }))
      throw new Error(`No room for ${c.id}`);
  });
  things.push({ kind: "landmark", id: "gherkin", name: "gherkin", x: 80, y: 24, w: 4, h: 4 });
  fill(80, 24, 4, 4, "X");
  station("bank", "Bank", 62, 2, ["city", "revision"], { x: 63.5, y: 4.6 });
  for (let x = 54; x < 87; x += 6) building(x, 4, 4, 5, 3.5, "stone");

  // ── Tower of London, Tower Bridge and Tower Hill ─────────────────────────
  things.push({ kind: "landmark", id: "tower", name: "tower", x: 74, y: north(76) - 6, w: 7, h: 5 });
  fill(74, north(76) - 6, 7, 5, "X");
  things.push({ kind: "landmark", id: "tower-bridge", name: "tower-bridge", x: 69, y: riverY(70) - 4, w: 4, h: 7 });
  station("tower-hill", "Tower Hill", 82, north(84) - 4, ["city", "careers"], { x: 83.5, y: north(84) - 1.4 });

  // ── South Bank: the Eye, Waterloo, the Tate, the Shard ───────────────────
  things.push({ kind: "landmark", id: "eye", name: "eye", x: 24, y: south(26), w: 6, h: 2 });
  fill(24, south(26), 6, 2, "X");
  station("waterloo", "Waterloo", 37, 50, ["revision", "homeward", "careers"], { x: 38.5, y: 52.6 });
  things.push({ kind: "landmark", id: "tate", name: "tate", x: 46, y: south(48) + 1, w: 5, h: 5 });
  fill(46, south(48) + 1, 5, 5, "X");
  things.push({ kind: "landmark", id: "shard", name: "shard", x: 58, y: 50, w: 4, h: 4 });
  fill(58, 50, 4, 4, "X");
  station("london-bridge", "London Bridge", 54, 54, ["city", "homeward"], { x: 55.5, y: 56.6 });
  for (let x = 63; x < 69; x += 4) building(x, 51, 3, 4, 3, "brick");

  // ── East: Canary Wharf towers ────────────────────────────────────────────
  things.push({ kind: "landmark", id: "canary", name: "canary", x: 76, y: 53, w: 12, h: 5 });
  fill(76, 53, 12, 5, "X");
  station("canary", "Canary Wharf", 90, 55, ["careers"], { x: 91.5, y: 57.6 });

  // ── Battersea Power Station (south-west) ─────────────────────────────────
  things.push({ kind: "landmark", id: "battersea", name: "battersea", x: 2, y: south(6) + 1, w: 10, h: 7 });
  fill(2, south(6) + 1, 10, 7, "X");

  // ── Brixton: rows of terraced homes, everyone's front door ──────────────
  for (let x = 1; x < 66; x += 3) {
    if (x >= 14 && x <= 18) continue;
    if (x >= 33 && x <= 37) continue;
    if (x >= 51 && x <= 55) continue;
    building(x, 63, 3, 4, 2.2, "terrace", { colour: COLOURS[(x * 5) % COLOURS.length] });
    building(x, 55 + (x > 40 ? 2 : 0), 3, 3, 2.2, "terrace", { colour: COLOURS[(x * 3 + 1) % COLOURS.length] });
  }
  station("brixton", "Brixton", 72, 63, ["homeward", "revision"], { x: 73.5, y: 65.6 });
  // Your front door (everyone sees their own house here).
  things.push({ kind: "building", id: "my-house", x: 8, y: 68, w: 4, h: 3, height: 2.6, colour: "#f2d9a6", roof: "#2d1b69", style: "terrace", label: "Your house" });
  fill(8, 68, 4, 3, "X");
  for (let x = 0; x < 66; x++) if (get(x, 67) === "g") set(x, 67, "-");

  // ── Street furniture and trees along the roads ───────────────────────────
  for (let x = 2; x < W - 2; x += 5) {
    street(x, 18);
    street(x, 23);
    street(x + 2, 58);
  }
  for (let x = 1; x < W - 1; x += 3) {
    const y = north(x) + 1;
    if (get(x, y) === "g" && free(x, y)) {
      set(x, y, x % 6 === 1 ? "T" : "L");
      things.push(x % 6 === 1 ? { kind: "tree", id: id("tree"), x, y } : { kind: "lamp", id: id("lamp"), x, y });
    }
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (get(x, y) === "g" && ((x * 31 + y * 17) % 23 === 0) && free(x, y)) {
        set(x, y, "T");
        things.push({ kind: "tree", id: id("tree"), x, y });
      }

  // Walkways to every door: make sure the tile in front of each building is walkable.
  for (const th of things) {
    if (th.kind === "building" || th.kind === "station") {
      const y = th.y + th.h;
      for (let x = th.x; x < th.x + th.w; x++) if (get(x, y) === "g" || get(x, y) === "f") set(x, y, "-");
    }
  }

  cache = {
    tiles: t.map((r) => r.join("")),
    things,
    stations,
    spawn: { x: 34 * 32 + 16, y: 26 * 32 },
    river: Array.from({ length: 25 }, (_, i) => [i * 4, riverY(i * 4) - 0.5] as [number, number]),
    routes,
  };
  return cache;
}

/** What Blender needs to build the 3D city (scripts/world/export-london.mjs writes it out). */
export function londonScene() {
  const b = buildLondon();
  return { cols: LONDON_COLS, rows: LONDON_ROWS, tiles: b.tiles, things: b.things, stations: b.stations };
}

// ─────────────────────────────────────────────────────────────────────────────
// Your home: a private room everyone has. Rendered in Blender in three
// colourways (scripts/world/build_home.py); single player, nobody else can enter.
// ─────────────────────────────────────────────────────────────────────────────

export const HOME_COLS = 20;
export const HOME_ROWS = 14;
export const HOME_STYLES = 3;

export type HomeThing = { id: string; name: "bed" | "desk" | "wardrobe" | "shelf" | "tv" | "sofa" | "plant" | "petbed" | "lamp" | "table"; x: number; y: number; w: number; h: number };

export function buildHome() {
  const W = HOME_COLS;
  const H = HOME_ROWS;
  const t = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x): string => (y < 2 || x === 0 || x === W - 1 || y === H - 1 ? "#" : ".")),
  );
  const things: HomeThing[] = [
    { id: "bed", name: "bed", x: 1, y: 2, w: 4, h: 4 },
    { id: "wardrobe", name: "wardrobe", x: 6, y: 2, w: 3, h: 1 },
    { id: "shelf", name: "shelf", x: 10, y: 2, w: 3, h: 1 },
    { id: "desk", name: "desk", x: 14, y: 2, w: 4, h: 2 },
    { id: "tv", name: "tv", x: 14, y: 7, w: 4, h: 1 },
    { id: "sofa", name: "sofa", x: 14, y: 10, w: 4, h: 2 },
    { id: "table", name: "table", x: 7, y: 7, w: 3, h: 2 },
    { id: "petbed", name: "petbed", x: 2, y: 10, w: 2, h: 2 },
    { id: "plant-1", name: "plant", x: 1, y: 7, w: 1, h: 1 },
    { id: "plant-2", name: "plant", x: 18, y: 5, w: 1, h: 1 },
    { id: "lamp", name: "lamp", x: 5, y: 2, w: 1, h: 1 },
  ];
  for (const th of things) for (let y = th.y; y < th.y + th.h; y++) for (let x = th.x; x < th.x + th.w; x++) t[y][x] = th.name === "petbed" ? "." : "X";
  // Rug and the front door.
  for (let y = 6; y < 11; y++) for (let x = 6; x < 12; x++) if (t[y][x] === ".") t[y][x] = "l";
  t[H - 1][9] = "e";
  t[H - 1][10] = "e";
  return { cols: W, rows: H, tiles: t.map((r) => r.join("")), things };
}

/** Which colourway a player's home uses (stable per player). */
export function homeStyle(userId: string) {
  let h = 0;
  for (const c of userId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % HOME_STYLES;
}
