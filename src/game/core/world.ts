import { COMPANIES } from "./companies";
import { buildHome, buildLondon } from "./london";

/**
 * The walkable multiplayer worlds: clean top-down pixel art in the spirit of
 * virtual offices like WorkAdventure, drawn from our own tile set (see
 * components/game/world/tiles.ts). Pure data and maths only, so the web app
 * and the native apps share it.
 *
 * Maps are tile grids (32px tiles) built by small builder functions:
 * - city:   IlluminatED City. Parody game companies along a high street.
 * - campus: Careers Campus. A doorway to every verified employer's office.
 * - office: one per verified employer: lobby, lounge, desks, glass meeting
 *           rooms, kitchen and an Advice Desk, named after the company.
 */
export const TILE = 32;
export const PLAYER_RADIUS = 11;
export const WALK_SPEED = 190; // px per second

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PortalTarget =
  | { kind: "game"; companyId: string }
  | { kind: "map"; mapId: string; label: string }
  | { kind: "desk" }
  | { kind: "link"; href: string }
  | { kind: "tube"; station: string };

export interface Portal {
  id: string;
  /** In pixels. */
  rect: Rect;
  label: string;
  to: PortalTarget;
}

/** A building drawn over a block of solid tiles (outdoor maps). In tiles. */
export interface Structure {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  accent: string;
  /** Which side the door is on. */
  door: "bottom" | "top";
  companyId?: string;
}

export interface Room {
  name: string;
  /** In pixels. */
  rect: Rect;
}

export interface WorldMap {
  id: string;
  kind: "city" | "campus" | "office" | "home";
  /** Pre-rendered 3D art (Blender) drawn instead of the tile set. */
  art?: "london" | `home-${number}`;
  name: string;
  cols: number;
  rows: number;
  width: number;
  height: number;
  /** One character per tile; see TILE_KINDS. */
  tiles: string[];
  structures: Structure[];
  portals: Portal[];
  rooms: Room[];
  spawn: { x: number; y: number };
  /** Accent used for signs and the reception desk. */
  accent: string;
  /** A sign painted on the floor or lawn (tile coordinates, centre). */
  sign?: { x: number; y: number; text: string };
}

/**
 * Tile legend. Indoor: . floor, m meeting carpet, l lounge rug, , kitchen floor,
 * e entrance mat, # wall, W window wall, G glass wall, d desk, c chair, t table,
 * s sofa, v screen, k counter, F fridge, A advice desk, r reception desk,
 * b bookshelf, p plant, o coffee table. Outdoor: g grass, f flowers, _ path,
 * - pavement, = road, : road with lane marking, T tree, B bench, L lamp,
 * w water, X building.
 */
export const SOLID = new Set(["#", "W", "G", "d", "t", "s", "v", "k", "F", "A", "r", "b", "p", "o", "T", "B", "L", "w", "X", "|"]);

class Grid {
  t: string[][];
  constructor(
    readonly cols: number,
    readonly rows: number,
    fillWith: string,
  ) {
    this.t = Array.from({ length: rows }, () => Array.from({ length: cols }, () => fillWith));
  }
  set(x: number, y: number, ch: string) {
    if (x >= 0 && y >= 0 && x < this.cols && y < this.rows) this.t[y][x] = ch;
  }
  get(x: number, y: number) {
    return this.t[y]?.[x];
  }
  fill(x: number, y: number, w: number, h: number, ch: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, ch);
  }
  border(ch: string) {
    this.fill(0, 0, this.cols, 1, ch);
    this.fill(0, this.rows - 1, this.cols, 1, ch);
    this.fill(0, 0, 1, this.rows, ch);
    this.fill(this.cols - 1, 0, 1, this.rows, ch);
  }
  rows_(): string[] {
    return this.t.map((r) => r.join(""));
  }
}

const px = (x: number, y: number, w = 1, h = 1): Rect => ({ x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE });
const centre = (x: number, y: number) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
/** Deterministic pseudo-random number in [0, 1) for a tile (same for every player). */
export const hash = (x: number, y: number, seed = 0) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function finish(
  base: Omit<WorldMap, "tiles" | "width" | "height" | "cols" | "rows">,
  g: Grid,
): WorldMap {
  // Doorways must always be standable, whatever was drawn there.
  for (const p of base.portals)
    for (let ty = p.rect.y / TILE; ty < (p.rect.y + p.rect.h) / TILE; ty++)
      for (let tx = p.rect.x / TILE; tx < (p.rect.x + p.rect.w) / TILE; tx++)
        if (SOLID.has(g.get(tx, ty) ?? "")) g.set(tx, ty, base.kind === "office" ? "." : "-");
  return { ...base, cols: g.cols, rows: g.rows, width: g.cols * TILE, height: g.rows * TILE, tiles: g.rows_() };
}

function scatterTrees(g: Grid, x: number, y: number, w: number, h: number, seed: number, density = 0.16) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      if (g.get(i, j) !== "g") continue;
      const r = hash(i, j, seed);
      if (r < density && (i + j) % 2 === 0) g.set(i, j, "T");
      else if (r > 0.93) g.set(i, j, "f");
    }
}

function building(g: Grid, s: Structure) {
  g.fill(s.x, s.y, s.w, s.h, "X");
}

// ─────────────────────────────────────────────────────────
// IlluminatED City
// ─────────────────────────────────────────────────────────

function cityMap(): WorldMap {
  const cols = 76;
  const rows = 40;
  const g = new Grid(cols, rows, "g");
  // High street: pavement, four lanes, pavement.
  g.fill(0, 16, cols, 1, "-");
  g.fill(0, 17, cols, 4, "=");
  g.fill(0, 18, cols, 1, ":");
  g.fill(0, 21, cols, 1, "-");
  // Parks with paths.
  g.fill(0, 5, cols, 2, "_");
  g.fill(0, 33, cols, 2, "_");
  for (const x of [12, 37, 62]) {
    g.fill(x, 0, 2, 16, "_");
    g.fill(x, 22, 2, 18, "_");
  }
  const structures: Structure[] = [];
  const portals: Portal[] = [];
  const ids = COMPANIES.map((c) => c.id);
  const place = (list: string[], y: number, door: "bottom" | "top") => {
    const w = 9;
    const gap = 1;
    const total = list.length * w + (list.length - 1) * gap;
    const x0 = Math.floor((cols - total) / 2);
    list.forEach((id, i) => {
      const c = COMPANIES.find((k) => k.id === id)!;
      const s: Structure = { x: x0 + i * (w + gap), y, w, h: 6, label: c.name, accent: c.accent, door, companyId: id };
      structures.push(s);
      building(g, s);
      const dx = s.x + Math.floor(w / 2);
      const dy = door === "bottom" ? y + 6 : y - 1;
      portals.push({ id: `game-${id}`, rect: px(dx - 1, dy, 2, 1), label: `Clock in at ${c.name}`, to: { kind: "game", companyId: id } });
    });
  };
  place(ids.slice(0, 7), 10, "bottom");
  place(ids.slice(7), 22, "top");
  // Fountain square in the south park.
  g.fill(33, 30, 10, 7, "_");
  g.fill(37, 32, 2, 2, "w");
  for (const [x, y] of [[34, 31], [41, 31], [34, 35], [41, 35]]) g.set(x, y, "B");
  for (let x = 4; x < cols; x += 8) {
    g.set(x, 16, "L");
    g.set(x + 4, 21, "L");
  }
  scatterTrees(g, 0, 0, cols, 10, 1);
  scatterTrees(g, 0, 28, cols, 12, 2);
  // Bus stop to Careers Campus at the east end of the street.
  g.fill(72, 15, 4, 1, "-");
  portals.push({
    id: "to-campus",
    rect: px(73, 15, 2, 2),
    label: "Bus to Careers Campus",
    to: { kind: "map", mapId: "campus", label: "Careers Campus" },
  });
  return finish(
    {
      id: "city",
      kind: "city",
      name: "IlluminatED City",
      structures,
      portals,
      rooms: [],
      spawn: centre(38, 21),
      accent: "#a67fff",
    },
    g,
  );
}

// ─────────────────────────────────────────────────────────
// Careers Campus
// ─────────────────────────────────────────────────────────

export interface OfficeOrg {
  slug: string;
  name: string;
  sector: string;
  accent: string;
}

export function campusMap(orgs: OfficeOrg[]): WorldMap {
  const perSide = Math.max(4, Math.ceil(orgs.length / 2));
  const cols = Math.max(56, perSide * 10 + 16);
  const rows = 36;
  const g = new Grid(cols, rows, "g");
  const mid = Math.floor(cols / 2);
  g.fill(0, 17, cols, 2, "_");
  g.fill(mid - 1, 0, 2, rows, "_");
  // Central plaza with a fountain and benches.
  g.fill(mid - 5, 14, 10, 8, "_");
  g.fill(mid - 1, 16, 2, 2, "w");
  for (const [x, y] of [[mid - 4, 15], [mid + 3, 15], [mid - 4, 20], [mid + 3, 20]]) g.set(x, y, "B");
  const structures: Structure[] = [];
  const portals: Portal[] = [];
  const slots = (side: "n" | "s") => {
    const xs: number[] = [];
    for (let x = 3; x + 8 <= cols - 3 && xs.length < perSide + 2; x += 10) {
      if (x + 8 > mid - 6 && x < mid + 6) continue;
      xs.push(x);
    }
    return xs.map((x) => ({ x, y: side === "n" ? 9 : 21, door: side === "n" ? ("bottom" as const) : ("top" as const) }));
  };
  const spots = [...slots("n"), ...slots("s")];
  orgs.slice(0, spots.length).forEach((org, i) => {
    const sp = spots[i];
    const s: Structure = { x: sp.x, y: sp.y, w: 8, h: 6, label: org.name, accent: org.accent, door: sp.door };
    structures.push(s);
    building(g, s);
    const dx = sp.x + 4;
    const dy = sp.door === "bottom" ? sp.y + 6 : sp.y - 1;
    g.fill(dx - 1, Math.min(dy, 17), 2, Math.abs(17 - dy) + 1, "_");
    portals.push({
      id: `office-${org.slug}`,
      rect: px(dx - 1, dy, 2, 1),
      label: `Enter ${org.name}`,
      to: { kind: "map", mapId: `office-${org.slug}`, label: org.name },
    });
  });
  scatterTrees(g, 0, 0, cols, 8, 3, 0.22);
  scatterTrees(g, 0, 28, cols, 8, 4, 0.22);
  g.set(2, 16, "L");
  g.set(cols - 3, 16, "L");
  portals.push(
    { id: "to-city", rect: px(0, 17, 2, 2), label: "Back to London", to: { kind: "map", mapId: "city", label: "London" } },
    { id: "employers", rect: px(cols - 2, 17, 2, 2), label: "Employers: get your own office", to: { kind: "link", href: "/employers" } },
  );
  return finish(
    {
      id: "campus",
      kind: "campus",
      name: "Careers Campus",
      structures,
      portals,
      rooms: [],
      spawn: centre(4, 18),
      accent: "#6bc6ff",
      sign: orgs.length ? undefined : { x: mid, y: 11, text: "Offices opening soon" },
    },
    g,
  );
}

// ─────────────────────────────────────────────────────────
// Employer office
// ─────────────────────────────────────────────────────────

export const MEETING_ROOMS = ["Meeting Room A", "Meeting Room B"] as const;

export function officeMap(org: OfficeOrg): WorldMap {
  const cols = 40;
  const rows = 26;
  const g = new Grid(cols, rows, ".");
  g.border("#");
  for (let x = 1; x < cols - 1; x++) if (x % 4 !== 0) g.set(x, 0, "W");

  // Glass meeting rooms, top right.
  g.fill(21, 1, 9, 8, "m");
  g.fill(31, 1, 8, 8, "m");
  g.fill(20, 1, 1, 9, "G");
  g.fill(30, 1, 1, 9, "G");
  g.fill(20, 9, 19, 1, "G");
  g.set(25, 9, "m");
  g.set(35, 9, "m");
  g.fill(23, 4, 5, 2, "t");
  g.fill(23, 3, 5, 1, "c");
  g.fill(23, 6, 5, 1, "c");
  g.fill(33, 4, 4, 2, "t");
  g.fill(33, 3, 4, 1, "c");
  g.fill(33, 6, 4, 1, "c");
  g.set(25, 1, "v");
  g.set(34, 1, "v");
  g.set(21, 8, "p");
  g.set(38, 8, "p");

  // Open-plan desks, top left.
  for (const x0 of [2, 7, 12]) {
    for (const y0 of [2, 6]) {
      g.fill(x0, y0, 3, 1, "c");
      g.fill(x0, y0 + 1, 3, 1, "d");
    }
  }
  g.fill(17, 2, 1, 3, "b");
  g.set(1, 1, "p");
  g.set(18, 8, "p");

  // Lounge, bottom left.
  g.fill(2, 15, 10, 7, "l");
  g.fill(3, 15, 6, 1, "v");
  g.fill(3, 20, 7, 1, "s");
  g.fill(1, 16, 1, 4, "s");
  g.fill(5, 17, 3, 2, "o");
  g.set(1, 14, "p");
  g.set(12, 22, "p");
  g.fill(1, 23, 4, 1, "b");

  // Reception and entrance, bottom middle.
  g.fill(14, 20, 5, 1, "r");
  g.fill(18, 24, 4, 1, "e");
  g.set(13, 24, "p");
  g.set(26, 24, "p");

  // Advice Desk, centre.
  g.fill(19, 13, 6, 1, "A");
  g.set(18, 13, "p");
  g.set(25, 13, "p");

  // Kitchen, bottom right.
  g.fill(29, 14, 10, 11, ",");
  g.fill(38, 15, 1, 9, "k");
  g.set(38, 14, "F");
  g.fill(29, 24, 6, 1, "k");
  g.fill(31, 18, 3, 2, "o");
  g.fill(31, 17, 3, 1, "c");
  g.fill(31, 20, 3, 1, "c");
  g.set(29, 14, "p");

  // Corridor plants.
  g.set(1, 11, "p");
  g.set(38, 11, "p");

  return finish(
    {
      id: `office-${org.slug}`,
      kind: "office",
      name: org.name,
      structures: [],
      portals: [
        { id: "advice", rect: px(20, 14, 4, 1), label: "Advice Desk: talk to the team", to: { kind: "desk" } },
        { id: "exit", rect: px(19, 24, 2, 1), label: "Back to Careers Campus", to: { kind: "map", mapId: "campus", label: "Careers Campus" } },
      ],
      rooms: [
        { name: MEETING_ROOMS[0], rect: px(21, 1, 9, 8) },
        { name: MEETING_ROOMS[1], rect: px(31, 1, 8, 8) },
      ],
      spawn: centre(20, 22),
      accent: org.accent,
      sign: { x: 20, y: 17, text: org.name },
    },
    g,
  );
}

/** London: the main world (3D art from Blender, layout from ./london.ts). */
export function londonMap(): WorldMap {
  const L = buildLondon();
  const portals: Portal[] = [];
  for (const th of L.things) {
    if (th.kind === "building" && th.companyId) {
      const c = COMPANIES.find((k) => k.id === th.companyId)!;
      portals.push({ id: `hq-${c.id}`, rect: px(th.x + 1, th.y + th.h, 1, 1), label: `${c.name}: Promotion Panic`, to: { kind: "game", companyId: c.id } });
    }
    if (th.kind === "building" && th.id === "my-house")
      portals.push({ id: "my-house", rect: px(th.x + 1, th.y + th.h, 2, 1), label: "Your house", to: { kind: "map", mapId: "home", label: "Your house" } });
    if (th.kind === "station")
      portals.push({ id: `tube-${th.id}`, rect: px(th.x, th.y + th.h, th.w, 1), label: `${th.name} station`, to: { kind: "tube", station: th.id } });
  }
  const rows = L.tiles.map((r) => r.split(""));
  // Doors are always walkable.
  for (const p of portals)
    for (let y = p.rect.y / TILE; y < (p.rect.y + p.rect.h) / TILE; y++)
      for (let x = p.rect.x / TILE; x < (p.rect.x + p.rect.w) / TILE; x++) if (SOLID.has(rows[y]?.[x] ?? "")) rows[y][x] = "-";
  const cols = L.tiles[0].length;
  return {
    id: "city",
    kind: "city",
    art: "london",
    name: "London",
    cols,
    rows: L.tiles.length,
    width: cols * TILE,
    height: L.tiles.length * TILE,
    tiles: rows.map((r) => r.join("")),
    structures: [],
    portals,
    rooms: [],
    spawn: L.spawn,
    accent: "#7c4dff",
  };
}

/** Where each Underground station lets you out (pixels). */
export function tubeStations() {
  return buildLondon().stations.map((s) => ({ ...s, exitPx: { x: s.exit.x * TILE, y: s.exit.y * TILE } }));
}

/** Your home: a private room (single player). style picks the colourway. */
export function homeMap(style: number): WorldMap {
  const h = buildHome();
  const link = (id: string, x: number, y: number, w: number, label: string, href: string): Portal => ({ id, rect: px(x, y, w, 1), label, to: { kind: "link", href } });
  return {
    id: "home",
    kind: "home",
    art: `home-${style}`,
    name: "Your house",
    cols: h.cols,
    rows: h.rows,
    width: h.cols * TILE,
    height: h.rows * TILE,
    tiles: h.tiles,
    structures: [],
    portals: [
      { id: "front-door", rect: px(9, 13, 2, 1), label: "Back out to Brixton", to: { kind: "map", mapId: "city", label: "London" } },
      link("desk", 14, 4, 4, "Revision desk", "/learn"),
      link("wardrobe", 6, 3, 3, "Wardrobe: change your look", "/games/locker"),
      link("shelf", 10, 3, 3, "Bookshelf: revision notes", "/revision"),
      link("tv", 14, 8, 4, "TV: play Promotion Panic", "/games"),
    ],
    rooms: [],
    spawn: { x: 10 * TILE, y: 11.5 * TILE },
    accent: "#7c4dff",
  };
}

/** The old 2D IlluminatED City is kept for reference; London replaced it. */
export const CLASSIC_CITY = cityMap();
export const CITY = londonMap();

// ─────────────────────────────────────────────────────────
// Movement and collisions
// ─────────────────────────────────────────────────────────

export const tileAt = (map: WorldMap, tx: number, ty: number) => map.tiles[ty]?.[tx] ?? "#";

export function hitsRect(x: number, y: number, r: number, rect: Rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return (x - cx) ** 2 + (y - cy) ** 2 < r * r;
}

/** Is a player (a circle at their feet) overlapping anything solid? */
export function blocked(map: WorldMap, x: number, y: number, r = PLAYER_RADIUS) {
  if (x < r || y < r || x > map.width - r || y > map.height - r) return true;
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++)
      if (SOLID.has(tileAt(map, tx, ty)) && hitsRect(x, y, r, { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE })) return true;
  return false;
}

/** Moves by direction (dx, dy) for `seconds`, sliding along walls instead of stopping dead. */
export function step(map: WorldMap, pos: { x: number; y: number }, dx: number, dy: number, seconds: number) {
  const len = Math.hypot(dx, dy);
  if (len < 0.01) return pos;
  const dist = WALK_SPEED * Math.min(seconds, 0.1) * Math.min(1, len);
  const nx = pos.x + (dx / len) * dist;
  const ny = pos.y + (dy / len) * dist;
  if (!blocked(map, nx, ny)) return { x: nx, y: ny };
  if (!blocked(map, nx, pos.y)) return { x: nx, y: pos.y };
  if (!blocked(map, pos.x, ny)) return { x: pos.x, y: ny };
  return pos;
}

export const portalAt = (map: WorldMap, x: number, y: number) =>
  map.portals.find((p) => hitsRect(x, y, PLAYER_RADIUS, p.rect)) ?? null;

export const roomAt = (map: WorldMap, x: number, y: number) =>
  map.rooms.find((r) => x > r.rect.x && x < r.rect.x + r.rect.w && y > r.rect.y && y < r.rect.y + r.rect.h)?.name ?? null;

/** Nearest free spot to a point (so a returning player never lands inside a wall). */
export function safeSpot(map: WorldMap, x: number, y: number) {
  if (!blocked(map, x, y)) return { x, y };
  for (let r = 8; r < 400; r += 8)
    for (let a = 0; a < 16; a++) {
      const px2 = x + Math.cos((a / 16) * Math.PI * 2) * r;
      const py2 = y + Math.sin((a / 16) * Math.PI * 2) * r;
      if (!blocked(map, px2, py2)) return { x: px2, y: py2 };
    }
  return map.spawn;
}

// ─────────────────────────────────────────────────────────
// Servers
// ─────────────────────────────────────────────────────────

/**
 * Public maps are split into servers grouped by region, so you meet people
 * near you. Every server runs on IlluminatED's realtime service in London
 * (eu-west-2), so ping stays low across the UK. Offices are one shared room.
 */
export const SERVER_CAPACITY = 40;

export const REGIONS = [
  { id: "lse", name: "London & South East", servers: 3 },
  { id: "sw", name: "South West", servers: 2 },
  { id: "mid", name: "Midlands", servers: 2 },
  { id: "north", name: "North of England", servers: 2 },
  { id: "scot", name: "Scotland", servers: 2 },
  { id: "wales", name: "Wales", servers: 2 },
  { id: "ni", name: "Northern Ireland", servers: 2 },
  { id: "intl", name: "International", servers: 2 },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export interface ServerInfo {
  id: string;
  region: RegionId;
  name: string;
}

export const SERVERS: ServerInfo[] = REGIONS.flatMap((r) =>
  Array.from({ length: r.servers }, (_, i) => ({ id: `${r.id}-${i + 1}`, region: r.id, name: `${r.name} ${i + 1}` })),
);

export const serverById = (id: string) => SERVERS.find((s) => s.id === id);
export const isRegion = (id: string): id is RegionId => REGIONS.some((r) => r.id === id);

/** A starting region from the browser's time zone (players can change it). */
export function guessRegion(timeZone: string | undefined): RegionId {
  if (!timeZone) return "lse";
  return timeZone === "Europe/London" || timeZone === "Europe/Belfast" ? "lse" : "intl";
}

/** Busiest server in the region that still has room (so players meet), else the emptiest anywhere. */
export function pickServer(region: RegionId, counts: Record<string, number>): ServerInfo {
  const n = (s: ServerInfo) => counts[s.id] ?? 0;
  const open = SERVERS.filter((s) => s.region === region && n(s) < SERVER_CAPACITY - 2);
  if (open.length) return open.sort((a, b) => n(b) - n(a) || a.id.localeCompare(b.id))[0];
  return [...SERVERS].sort((a, b) => n(a) - n(b))[0];
}

/** Realtime channel name for a map on a server. Offices are one room each. */
export const channelFor = (mapId: string, serverId: string) =>
  mapId.startsWith("office-") ? `world:${mapId}` : `world:${mapId}:${serverId}`;

// ─────────────────────────────────────────────────────────
// Safe chat in the world: emotes and preset phrases only (no typing)
// ─────────────────────────────────────────────────────────

export const EMOTES = [
  { id: "wave", label: "Hey!" },
  { id: "laugh", label: "Haha" },
  { id: "fire", label: "Let's go" },
  { id: "clap", label: "Nice one" },
  { id: "think", label: "Hmm…" },
  { id: "party", label: "Woo!" },
] as const;

export const PHRASES = [
  { id: "hi", text: "Hi!" },
  { id: "gg", text: "GG!" },
  { id: "race", text: "Race you to CEO!" },
  { id: "beat", text: "Beat my score" },
  { id: "gl", text: "Good luck!" },
  { id: "join", text: "Come to my shift?" },
  { id: "advice", text: "Could I get some advice?" },
  { id: "thanks", text: "Thank you!" },
  { id: "revise", text: "Revision time" },
  { id: "brb", text: "BRB" },
] as const;

export const chatText = (id: string) =>
  EMOTES.find((e) => e.id === id)?.label ?? PHRASES.find((p) => p.id === id)?.text ?? null;
