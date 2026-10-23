import { WORKPLACES } from "./careers";
import { COMPANIES } from "./companies";
import { type Placed, STARTER_LAYOUT, furnitureById, homeUse, isFloorFurniture } from "./homes";
import { buildHome, buildLondon } from "./london";
import { buildHighlands } from "./regions";
import { UNIVERSITIES, universityById } from "./universities";
import { ROOM_CAPACITY } from "./world-network";

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
export const WALK_SPEED = 96; // px per second (a gentle stroll: take a bus, bike or train for distance)

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PortalTarget =
  | { kind: "study-room" }
  | { kind: "home-use"; key: string }
  | { kind: "awards" }
  | {kind:"university"; university:string; topic:"courses"|"events"|"networking"}
  | { kind: "prison"; action: "study" | "escape" | "talk"; name?: string }
  | { kind: "game"; companyId: string }
  | { kind: "map"; mapId: string; label: string }
  | { kind: "desk" }
  | { kind: "link"; href: string }
  | { kind: "tube"; station: string }
  | { kind: "work"; workplace: string }
  | { kind: "workstation"; workplace: string; station: "reception" | "terminal" }
  | { kind: "bus"; stop: string }
  | { kind: "act"; activity: "sleep" | "eat" | "study" | "hike" }
  | { kind: "bike"; dock: string }
  | { kind: "games" }
  | { kind: "dealer" }
  | { kind: "shop"; shop: "tescow" | "bootz" }
  | { kind: "doctor" }
  | { kind: "bank" }
  | { kind: "guide"; guide: "careers" | "study" | "transport" }
  | { kind: "tutorial"; step: TutorialStation };

/** Interactive stations in the new-player training ground. */
export type TutorialStation = "interact" | "study" | "eat" | "board";

export interface Portal {
  /** On a map with a deck: 1 for portals up on the raised floor. */
  level?: 0 | 1;
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
  kind: "city" | "campus" | "office" | "home" | "station" | "hospital" | "court" | "prison";
  /** Pre-rendered 3D art (Blender) drawn instead of the tile set. */
  art?: "london" | "highlands" | `home-${number}`;
  /** Furniture placement (homes only). */
  layout?: Placed[];
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
  /** Blender furniture placed in an interior (tiles; models in /world3d/interiors). */
  props?: Prop[];
  /** Interior colours: floor (two alternating), walls and skirting. */
  theme?: { floor: [string, string]; wall: string; skirting: string };
  /** Stairs drawn in this room: going up from here, or the opening down to the floor below. */
  stairs?: { x: number; y: number; down: boolean };
  /**
   * A raised floor in the same room (a mezzanine / double-decker space). `tiles`
   * is the walkable grid up there; the ramp (a staircase, rising north) joins
   * the two levels. Tiles.
   */
  deck?: { tiles: string[]; height: number; ramp: { x: number; y: number; w: number; h: number } };
}

/** One piece of interior furniture: a model fitted to a footprint (tiles). */
export interface Prop {
  model: string;
  x: number;
  y: number;
  w: number;
  d: number;
  /** Height above the floor (hanging lamps). */
  lift?: number;
  /** Quarter turns. */
  turn?: number;
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

/** Walk-in game workplaces, separate from verified employers' advice offices. */
export function hotelMap(id: string): WorldMap | null {
  const match = /^hotel-([01])(?:-floor-([12]))?$/.exec(id);
  if (!match) return null;
  const hotel = buildLondon().things.find(t => t.kind === "building" && t.id === `hotel-${match[1]}`);
  if (!hotel || hotel.kind !== "building") return null;
  const floor = Number(match[2] ?? 0);
  const base = `hotel-${match[1]}`;
  const g = new Grid(20, 16, ".");
  g.border("#");
  for (let x = 2; x < 18; x++) g.set(x, 0, "W");
  g.set(2, 2, "p"); g.set(17, 12, "p");
  g.fill(3, 6, 4, 1, floor === 0 ? "r" : "b");
  g.fill(3, 10, 4, 1, "s"); g.set(5, 12, "o");
  if (floor > 0) {
    g.fill(10, 5, 2, 1, "d");
    g.fill(10, 10, 3, 1, "s");
    g.set(12, 7, "c");
  }
  if (floor === 1) {
    g.fill(8,1,1,6,"#");
    g.fill(3,3,2,1,"d");
    g.fill(3,4,2,1,"X");
  }
  // The stair landing remains walkable; each floor is a real destination.
  g.fill(15, 2, 2, 2, "e");
  const portals: Portal[] = [];
  if (floor === 1) portals.push({id:"guest-bed",rect:px(3,5,2,1),label:"Rest in the guest room",to:{kind:"act",activity:"sleep"}});
  if (floor < 2) portals.push({id:"stairs-up",rect:px(15,4,2,1),label:`Take stairs to floor ${floor+1}`,to:{kind:"map",mapId:`${base}-floor-${floor+1}`,label:`${hotel.label} · Floor ${floor+1}`}});
  if (floor > 0) portals.push({id:"stairs-down",rect:px(15,7,2,1),label:floor===1?"Stairs to lobby":"Stairs to floor 1",to:{kind:"map",mapId:floor===1?base:`${base}-floor-1`,label:floor===1?"Hotel lobby":"First floor"}});
  if (floor === 0) portals.push({id:"exit",rect:px(9,14,2,1),label:"Leave hotel",to:{kind:"map",mapId:"city",label:"London"}});
  return finish({id,kind:"office",name:`${hotel.label} · ${floor === 0 ? "Lobby" : `Floor ${floor}`}`,structures:[],rooms:[],portals,spawn:centre(10,13),accent:hotel.accent ?? "#315b50",sign:{x:10,y:8,text:floor===0?"Reception · lounge · upstairs":floor===1?"Guest lounge · reading room":"Sky lounge · quiet workspace"}},g);
}

export function workplaceMap(id: string): WorldMap | null {
  const w = WORKPLACES.find(workplace => workplace.id === id);
  if (!w) return null;
  const g = new Grid(26, 20, ".");
  g.border("#");
  for (let x = 2; x < 24; x++) g.set(x, 0, "W");
  g.fill(3, 14, 5, 1, "r");
  g.fill(18, 14, 5, 1, "s");
  g.set(20, 12, "o");
  g.set(2, 2, "p"); g.set(23, 2, "p");
  const practical = ["pizzazz", "tescow"].includes(id);
  if (!practical) {
    // Perimeter storage and a planted break corner leave the work aisles clear.
    g.fill(4, 1, 3, 1, "b");
    g.fill(18, 1, 3, 1, "b");
    g.set(23, 11, "p");
    g.set(17, 14, "L");
    g.set(2, 10, "F");
    g.set(22, 10, "k");
    for (const x of [4, 18]) {
      g.fill(x, 10, 3, 1, "d");
      g.set(x + 1, 12, "c");
    }
  }
  for (const x of [4, 11, 18]) {
    g.fill(x, 5, 3, 1, practical ? "k" : "d");
    g.set(x + 1, 4, practical ? "b" : "v");
    g.set(x + 1, 7, "c");
  }
  return finish({id:`workplace-${id}`,kind:"office",name:w.name,structures:[],accent:w.accent,
    spawn:centre(13,17),sign:{x:13,y:10,text:`${w.name} · walk to a work station`},rooms:[],
    portals:[
      {id:"exit",rect:px(12,18,2,1),label:"Leave workplace",to:{kind:"map",mapId:"city",label:"London"}},
      {id:"recruitment",rect:px(4,15,3,1),label:"Reception · apply for a role",to:{kind:"workstation",workplace:id,station:"reception"}},
      ...[4,11,18].map((x,i):Portal=>({id:`terminal-${i}`,rect:px(x,6,3,1),label:practical?"Use work counter · start shift":"Use computer · start shift",to:{kind:"workstation",workplace:id,station:"terminal"}})),
      ...(!practical ? [4,18].map((x,i):Portal=>({id:`terminal-south-${i}`,rect:px(x,11,3,1),label:"Use computer · start shift",to:{kind:"workstation",workplace:id,station:"terminal"}})) : []),
    ]},g);
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
      accent: "#8fb4ff",
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
    { id: "career-adviser", rect: px(mid - 1, 19, 2, 1), label: "Talk to the careers adviser", to: { kind: "guide", guide: "careers" } },
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
    if (th.kind === "building" && ["district-campus-library", "district-campus-studios", "district-campus-labs", "district-wharf-gallery", "district-wharf-cafe", "district-conservatory"].includes(th.id)) {
      portals.push({id:th.id,rect:px(th.x+Math.floor(th.w/2),th.y+th.h,1,1),label:th.label ?? "Explore district",to:th.id==="district-wharf-cafe"?{kind:"act",activity:"eat"}:th.id==="district-conservatory"?{kind:"act",activity:"hike"}:{kind:"study-room"}});
    }
    if (th.kind === "building" && /^hotel-[01]$/.test(th.id)) portals.push({id:th.id,rect:px(th.x+2,th.y+th.h,2,1),label:`Enter ${th.label}`,to:{kind:"map",mapId:th.id,label:th.label ?? "Hotel"}});
    if (th.kind === "building" && th.id === "district-bank") portals.push({id:"city-bank",rect:px(th.x+Math.floor(th.w/2)-1,th.y+th.h,2,1),label:"Thames & Co Bank: loans and repayments",to:{kind:"bank"}});
    if (th.kind === "building" && th.companyId) {
      const c = COMPANIES.find((k) => k.id === th.companyId)!;
      const w = WORKPLACES.find((k) => k.companyId === c.id);
      portals.push({
        id: `hq-${c.id}`,
        rect: px(th.x + 1, th.y + th.h, 1, 1),
        label: w ? `${c.name}: jobs and Promotion Panic` : `${c.name}: Promotion Panic`,
        to: w ? { kind: "work", workplace: w.id } : { kind: "game", companyId: c.id },
      });
    }
    if (th.kind === "building" && th.id === "my-house")
      portals.push({ id: "my-house", rect: px(th.x + 1, th.y + th.h, 2, 1), label: "Your house", to: { kind: "map", mapId: "home", label: "Your house" } });
    if (th.kind === "busstop") {
      const stop = busStopFor(th.x);
      portals.push({ id: th.id, rect: px(th.x - 1, th.y - 1, 3, 3), label: `Bus stop: ${stop.name}`, to: { kind: "bus", stop: stop.id } });
    }
    if (th.kind === "station") {
      portals.push({ id: `tube-${th.id}`, rect: px(th.x, th.y + th.h, th.w, 1), label: `${th.name} station`, to: { kind: "map", mapId: `station-${th.id}`, label: th.name } });
      // A hire-bike dock beside every station.
      portals.push({ id: `bike-${th.id}`, rect: px(th.x + th.w + 1, th.y + th.h, 1, 1), label: "Hire a bike", to: { kind: "bike", dock: th.id } });
    }
    if (th.kind === "landmark" && th.name === "battersea")
      portals.push({ id: "games-hall", rect: px(th.x + 4, th.y + th.h, 2, 1), label: "Games Hall: play live with others", to: { kind: "games" } });
  }
  // Pizzazz Pizza: the first shop on the West End parade.
  const pizza = L.things.flatMap((t) => (t.kind === "building" && t.style === "shop" ? [t] : [])).sort((a, b) => a.y - b.y || a.x - b.x)[0];
  // Lyme e-bikes parked on pavements all over London (tap one to ride).
  for (let y = 1; y < L.tiles.length - 1; y++)
    for (let x = 1; x < L.tiles[0].length - 1; x++) {
      if (L.tiles[y][x] !== "-") continue;
      const kerb = "=:".includes(L.tiles[y + 1][x]) || "=:".includes(L.tiles[y - 1][x]);
      if (!kerb || (x * 7 + y * 13) % 11 !== 0 || portals.some((p) => Math.abs(p.rect.x / TILE - x) < 3 && Math.abs(p.rect.y / TILE - y) < 3)) continue;
      portals.push({ id: `lyme-${x}-${y}`, rect: px(x, y, 1, 1), label: "Lyme e-bike: hire and ride", to: { kind: "bike", dock: `lyme-${x}-${y}` } });
    }
  // Motor Mile: the car dealership, on the next shop along.
  const shops = L.things.flatMap((t) => (t.kind === "building" && t.style === "shop" ? [t] : [])).sort((a, b) => a.y - b.y || a.x - b.x);
  const dealer = shops[1];
  // Shops are walk-in: go inside to the checkout (venues.ts).
  if (shops[2]) portals.push({ id: "tescow", rect: px(shops[2].x + 1, shops[2].y + shops[2].h, 2, 1), label: "Tesco Express: drinks and meal deals", to: { kind: "map", mapId: "venue-tescow", label: "Tesco Express" } });
  if (shops[3]) portals.push({ id: "bootz", rect: px(shops[3].x + 1, shops[3].y + shops[3].h, 2, 1), label: "Bootz Pharmacy: medicine", to: { kind: "map", mapId: "venue-bootz", label: "Bootz Pharmacy" } });
  // The hospital and the Crown Court: the nearest big buildings to Waterloo and St Paul's.
  const bigs = L.things.flatMap((t) => (t.kind === "building" && !t.companyId && !t.id.startsWith("hotel-") && !t.id.startsWith("district-") && (t.style === "office" || t.style === "stone") ? [t] : []));
  const near = (x: number, y: number, not?: { id: string }) => bigs.filter((b) => b !== not).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  const hosp = near(30, 52);
  const court = near(44, 28, hosp);
  if (hosp) portals.push({ id: "hospital", rect: px(hosp.x + 1, hosp.y + hosp.h, 2, 1), label: "St Tomas' Hospital", to: { kind: "map", mapId: "hospital", label: "St Tomas' Hospital" } });
  if (court) portals.push({ id: "court", rect: px(court.x + 1, court.y + court.h, 2, 1), label: "Crown Court", to: { kind: "map", mapId: "court", label: "Crown Court" } });
  if (dealer) portals.push({ id: "dealer", rect: px(dealer.x + 1, dealer.y + dealer.h, 2, 1), label: "Motor Mile: car dealership", to: { kind: "dealer" } });
  if (pizza) portals.push({ id: "pizzazz", rect: px(pizza.x + 1, pizza.y + pizza.h, 2, 1), label: "Pizzazz Pizza: jobs", to: { kind: "work", workplace: "pizzazz" } });
  for (const venue of L.things) {
    if (venue.kind !== "building" || !["mcdonalds", "kfc", "starbucks"].includes(venue.id)) continue;
    portals.push({ id: venue.id, rect: px(venue.x + Math.floor(venue.w / 2) - 1, venue.y + venue.h, 2, 1), label: `${venue.label}: ${venue.id === "starbucks" ? "coffee break" : "grab a meal"}`, to: { kind: "map", mapId: `venue-${venue.id}`, label: venue.label ?? "Inside" } });
  }
  // The town hall's doors, on the square.
  const hall = L.things.find((t) => t.kind === "landmark" && t.name === "town-hall");
  if (hall && hall.kind === "landmark") portals.push({ id: "town-hall", rect: px(hall.x + Math.floor(hall.w / 2) - 1, hall.y + hall.h, 2, 1), label: "Town Hall: civic library and council gallery", to: { kind: "map", mapId: "venue-town-hall", label: "Town Hall" } });
  portals.push(
    {id:"universities",rect:px(92,83,2,1),label:"University Quarter: explore universities",to:{kind:"map",mapId:"universities",label:"University Quarter"}},
    {id:"makerspace",rect:px(93,70,2,1),label:"Makerspace: subject study sessions",to:{kind:"study-room"}},
    {id:"study-club",rect:px(105,70,2,1),label:"Study Quarter: study room and awards",to:{kind:"map",mapId:"study-lobby",label:"Study Quarter"}},
    {id:"reading-garden",rect:px(87,80,2,2),label:"Reading garden: restore Focus",to:{kind:"act",activity:"study"}},
  );
  const rows = L.tiles.map((r) => r.split(""));
  // Doors are always walkable (bus stops are walked up to, not into).
  for (const p of portals.filter((q) => q.to.kind !== "bus"))
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
    accent: "#2b5fd9",
  };
}

/** London's bus routes: every stop belongs to the area it's in. */
const BUS_AREAS = [
  { id: "westminster", name: "Westminster", until: 15 },
  { id: "west-end", name: "West End", until: 35 },
  { id: "st-pauls", name: "St Paul's", until: 55 },
  { id: "the-city", name: "The City", until: 75 },
  { id: "tower-bridge", name: "Tower Bridge", until: 96 },
  { id: "study-quarter", name: "Study Quarter", until: 999 },
] as const;
const busStopFor = (x: number) => BUS_AREAS.find((a) => x < a.until)!;

/** Bus destinations in London (where you get off) plus routes out of town. */
export function busStops() {
  const L = buildLondon();
  const stops = L.things.filter((t) => t.kind === "busstop");
  const city = BUS_AREAS.flatMap((a) => {
    const s = stops.find((t) => busStopFor(t.x).id === a.id);
    return s ? [{ id: a.id, name: a.name, route: ["SL6", "BL1", "SL8", "SL1", "SL4"][BUS_AREAS.indexOf(a)], exitPx: { x: s.x * TILE + TILE / 2, y: (s.y + 1) * TILE + TILE / 2 } }] : [];
  });
  return city;
}

/** Where each Underground station lets you out (pixels). */
export function tubeStations() {
  return buildLondon().stations.map((s) => ({ ...s, exitPx: { x: s.exit.x * TILE, y: s.exit.y * TILE } }));
}

/** Inside an Underground station: way out, ticket hall, barriers, platform and track. */
export const STATION_PLATFORM_Y = 12;
export function stationMap(stationId: string): WorldMap | null {
  const st = buildLondon().stations.find((s) => s.id === stationId);
  if (!st) return null;
  const cols = 30;
  const rows = 19;
  const g = new Grid(cols, rows, ".");
  g.border("#");
  for (let x = 1; x < cols - 1; x++) g.set(x, 0, "W");
  // Ticket hall: machines, a help point, benches.
  g.fill(2, 2, 3, 1, "v");
  g.fill(25, 2, 3, 1, "v");
  g.fill(3, 5, 1, 1, "p");
  g.fill(26, 5, 1, 1, "p");
  // Ticket barriers with gates in the middle.
  g.fill(1, 7, cols - 2, 1, "r");
  g.fill(12, 7, 6, 1, "e");
  // Platform (tiles) and benches.
  g.fill(1, 8, cols - 2, 7, ",");
  g.fill(4, 10, 4, 1, "s");
  g.fill(22, 10, 4, 1, "s");
  // The track: solid, drawn over by the station art.
  g.fill(1, 15, cols - 2, 3, "X");
  return finish(
    {
      id: `station-${st.id}`,
      kind: "station",
      name: `${st.name} station`,
      structures: [],
      portals: [
        { id: "way-out", rect: px(13, 1, 4, 1), label: "Way out to the street", to: { kind: "map", mapId: "city", label: "London" } },
        { id: "station-assistant", rect: px(6, 4, 2, 1), label: "Ask station staff about trains", to: { kind: "guide", guide: "transport" } },
        { id: "board", rect: px(3, 14, 24, 1), label: "Board the train", to: { kind: "tube", station: st.id } },
      ],
      rooms: [],
      spawn: centre(15, 3),
      accent: "#2b5fd9",
      sign: { x: 15, y: 4, text: st.name },
    },
    g,
  );
}

/** St Tomas' Hospital: reception, a doctor's desk and a ward of beds. */
export function hospitalMap(): WorldMap {
  const g = new Grid(26, 16, ".");
  g.border("#");
  for (let x = 1; x < 25; x++) g.set(x, 0, "W");
  g.fill(10, 11, 6, 1, "r");
  g.fill(3, 2, 8, 1, "b");
  for (const x of [2, 6, 17, 21]) g.fill(x, 4, 3, 2, "d");
  g.set(1, 1, "p");
  g.set(24, 1, "p");
  g.fill(17, 9, 4, 1, "s");
  return finish(
    {
      id: "hospital",
      kind: "hospital",
      name: "St Tomas' Hospital",
      structures: [],
      portals: [
        { id: "doctor", rect: px(12, 12, 2, 1), label: "See a doctor (free, takes a moment)", to: { kind: "doctor" } },
        { id: "exit", rect: px(12, 15, 2, 1), label: "Back out to London", to: { kind: "map", mapId: "city", label: "London" } },
      ],
      rooms: [],
      spawn: centre(13, 13),
      accent: "#15987f",
      sign: { x: 13, y: 8, text: "St Tomas' Hospital" },
    },
    g,
  );
}

/** The Crown Court: judge's bench, the dock and the public gallery. */
export function courtMap(): WorldMap {
  const g = new Grid(22, 16, ".");
  g.border("#");
  for (let x = 1; x < 21; x++) g.set(x, 0, "W");
  g.fill(6, 2, 10, 1, "A");
  g.fill(8, 7, 6, 1, "r");
  for (const y of [10, 12]) {
    g.fill(2, y, 7, 1, "s");
    g.fill(13, y, 7, 1, "s");
  }
  g.set(1, 1, "p");
  g.set(20, 1, "p");
  return finish(
    {
      id: "court",
      kind: "court",
      name: "Crown Court",
      structures: [],
      portals: [{ id: "exit", rect: px(10, 15, 2, 1), label: "Leave the court", to: { kind: "map", mapId: "city", label: "London" } }],
      rooms: [],
      spawn: centre(11, 8),
      accent: "#7a4f32",
      sign: { x: 11, y: 4, text: "Crown Court" },
    },
    g,
  );
}

/** HMP Thames: a row of cells with bars, a landing and the guards' desk. No way out until you're released. */
export function prisonMap(): WorldMap {
  const g = new Grid(48, 34, ".");
  g.border("#");
  // Open cells: bars have actual door gaps into the communal corridor.
  for (let c = 0; c < 5; c++) {
    const x = 1 + c * 5;
    g.fill(x + 4, 1, 1, 6, "#"); g.fill(x, 7, 5, 1, "G");
    g.set(x + 2, 7, "."); g.set(x + 1, 2, "b");
  }
  g.fill(2, 13, 5, 1, "t"); g.fill(11, 13, 5, 1, "t");
  g.fill(2, 22, 5, 1, "b");
  // A connected service maze: alternating wall gaps make a genuine escape route.
  g.fill(26, 1, 1, 32, "#"); g.set(26, 18, ".");
  for (const [x, gap] of [[30, 27], [34, 9], [38, 27], [42, 9]]) {
    g.fill(x, 3, 1, 28, "#"); g.set(x, gap, "."); g.set(x, gap + 1, ".");
  }
  const portals: Portal[] = [
    { id: "prison-study", rect: px(8, 23, 3, 2), label: "Study desk: earn your release", to: { kind: "prison", action: "study" } },
    { id: "inmate-sam", rect: px(8, 10, 2, 2), label: "Talk to Sam", to: { kind: "prison", action: "talk", name: "Sam" } },
    { id: "inmate-riley", rect: px(18, 16, 2, 2), label: "Talk to Riley", to: { kind: "prison", action: "talk", name: "Riley" } },
    { id: "prison-escape", rect: px(44, 30, 2, 2), label: "Service exit: escape", to: { kind: "prison", action: "escape" } },
  ];
  return finish({ id: "prison", kind: "prison", name: "HMP Thames", structures: [], portals, rooms: [], spawn: centre(3, 4), accent: "#e98a1f", sign: { x: 15, y: 10, text: "Study, socialise and explore" } }, g);
}

/**
 * Flight School: the new-player training ground. Four halls joined by doorways;
 * the guide (Ava) walks ahead and the player follows her from station to station,
 * ending at the departure gate for the flight to London.
 */
export const TUTORIAL_MAP_ID = "tutorial";
export function tutorialMap(): WorldMap {
  const g = new Grid(44, 18, ".");
  g.border("#");
  for (let x = 2; x < 42; x += 3) g.set(x, 0, "W");
  // Partitions with doorways that alternate, so you follow Ava across the hall.
  g.fill(10, 1, 1, 16, "#"); g.fill(10, 7, 1, 4, ".");
  g.fill(20, 1, 1, 16, "#"); g.fill(20, 11, 1, 4, ".");
  g.fill(30, 1, 1, 16, "#"); g.fill(30, 4, 1, 4, ".");
  // Hall 1: arrivals.
  for (const [x, y] of [[2, 2], [8, 2], [2, 15], [8, 15]]) g.set(x, y, "p");
  // Hall 2: help desk.
  g.fill(13, 2, 5, 1, "r");
  g.fill(12, 14, 3, 1, "s"); g.fill(16, 14, 3, 1, "s");
  // Hall 3: practice desks.
  g.fill(22, 2, 6, 1, "t"); g.fill(22, 8, 2, 1, "t"); g.fill(26, 8, 2, 1, "t");
  g.set(28, 15, "b"); g.set(22, 15, "b");
  // Hall 4: café and departure gate.
  g.fill(32, 14, 5, 1, "r");
  g.fill(40, 2, 3, 1, "A");
  for (const [x, y] of [[32, 2], [42, 15]]) g.set(x, y, "p");
  const portals: Portal[] = [
    { id: "tut-desk", rect: px(14, 3, 3, 1), label: "Help desk: interact", to: { kind: "tutorial", step: "interact" } },
    { id: "tut-study", rect: px(23, 3, 4, 1), label: "Practice desk: answer a question", to: { kind: "tutorial", step: "study" } },
    { id: "tut-cafe", rect: px(33, 13, 3, 1), label: "Café: grab a snack", to: { kind: "tutorial", step: "eat" } },
    { id: "tut-gate", rect: px(40, 3, 3, 2), label: "Gate 1: board your flight to London", to: { kind: "tutorial", step: "board" } },
  ];
  return finish(
    {
      id: TUTORIAL_MAP_ID,
      kind: "office",
      name: "Flight School",
      structures: [],
      portals,
      rooms: [
        { name: "Arrivals · learn to move", rect: px(1, 1, 9, 16) },
        { name: "Help desk · learn to interact", rect: px(11, 1, 9, 16) },
        { name: "Practice desks · learn to study", rect: px(21, 1, 9, 16) },
        { name: "Café and Gate 1 · ready for London", rect: px(31, 1, 12, 16) },
      ],
      spawn: centre(3, 9),
      accent: "#2b5fd9",
      sign: { x: 5, y: 4, text: "Flight School · follow Ava" },
    },
    g,
  );
}

/** A shared learning space: real subject practice, simulated careers and earned awards. */
export function studyLobbyMap(): WorldMap {
  const g = new Grid(26, 22, "."); g.border("#");
  for(let x=2;x<24;x+=4)g.set(x,0,"W");
  g.fill(7,7,13,12,"m");
  g.fill(2,3,4,1,"s");g.fill(20,3,4,1,"s");
  g.fill(7,11,3,1,"s");g.fill(17,11,3,1,"s");
  g.fill(11,8,4,1,"t");g.fill(11,7,4,1,"c");
  g.fill(11,5,4,1,"r");
  for(const [x,y] of [[6,8],[20,8],[6,18],[20,18]])g.set(x,y,"p");
  g.fill(3,9,1,4,"b");
  g.fill(2,16,4,1,"t");g.fill(20,16,4,1,"t");
  for(const [x,y] of [[1,1],[24,1],[1,20],[24,20]])g.set(x,y,"p");
  return finish({id:"study-lobby",kind:"office",name:"Study Quarter",structures:[],portals:[
    {id:"lobby-games",rect:px(11,3,4,2),label:"Games table: play with friends",to:{kind:"games"}},
    {id:"lobby-study",rect:px(3,17,3,2),label:"Ask the study mentor: choose a subject",to:{kind:"guide",guide:"study"}},
    {id:"lobby-careers",rect:px(20,17,3,2),label:"Ask the careers adviser about simulations",to:{kind:"guide",guide:"careers"}},
    {id:"lobby-awards",rect:px(4,5,2,2),label:"Awards cabinet: your learning milestones",to:{kind:"awards"}},
    {id:"lobby-exit",rect:px(11,20,4,1),label:"Back to Study Quarter",to:{kind:"map",mapId:"city",label:"London"}},
  ],rooms:[{name:"Study desks · choose a subject and earn XP",rect:px(1,15,7,5)},{name:"Careers desk · practise workplace skills",rect:px(18,15,7,5)}],spawn:centre(13,14),accent:"#2b5fd9",sign:{x:13,y:6,text:"Study Quarter · learn, work, grow"}},g);
}

/** Your home: a private room (single player). style picks the colourway. */
export function homeMap(style: number, layout: Placed[] = STARTER_LAYOUT): WorldMap {
  const h = buildHome();
  // The room shell, then your furniture wherever you put it.
  const t = h.tiles.map((r) => r.split("").map((c) => (c === "X" ? "." : c)));
  const links: Portal[] = [];
  for (const p of layout) {
    const f = furnitureById(p.item);
    if (!f) continue;
    if (!isFloorFurniture(f.id))
      for (let y = p.y; y < p.y + f.h; y++) for (let x = p.x; x < p.x + f.w; x++) if (t[y]?.[x] !== undefined) t[y][x] = "X";
    links.push({ id: `f-${p.key}`, rect: px(p.x, Math.min(12, p.y + f.h), f.w, 1), label: `${f.name}: ${homeUse(f.id).label.toLowerCase()}`, to: { kind: "home-use", key: p.key } });
  }
  return {
    id: "home",
    kind: "home",
    art: `home-${style}`,
    name: "Your house",
    cols: h.cols,
    rows: h.rows,
    width: h.cols * TILE,
    height: h.rows * TILE,
    tiles: t.map((r) => r.join("")),
    structures: [],
    portals: [{ id: "front-door", rect: px(9, 13, 2, 1), label: "Back out to London", to: { kind: "map", mapId: "city", label: "London" } }, ...links],
    layout,
    rooms: [],
    spawn: { x: 10 * TILE, y: 11.5 * TILE },
    accent: "#2b5fd9",
  };
}

/** The Highlands: an open valley of mountains, a loch and a village, by train from London. */
export function highlandsMap(): WorldMap {
  const r = buildHighlands();
  const rows = r.tiles.map((row) => row.split(""));
  const portals: Portal[] = [];
  const st = r.things.find((t) => t.kind === "station");
  if (st) portals.push({ id: "glen-station", rect: px(st.x, st.y + st.h, st.w, 1), label: "Glen Lorne station: trains to London", to: { kind: "tube", station: "highlands" } });
  for (const t of r.things) {
    if (t.kind !== "building" || !t.label) continue;
    const rect = px(t.x + 2, t.y + t.h, 2, 1);
    if (t.label === "Highland Cafe") portals.push({ id: "cafe", rect, label: "Highland Cafe: grab a bite", to: { kind: "act", activity: "eat" } });
    if (t.label === "Mountain Lodge") portals.push({ id: "lodge", rect, label: "Mountain Lodge: Games Hall", to: { kind: "games" } });
  }
  for (const v of r.viewpoints) portals.push({ id: `view-${v.id}`, rect: px(v.x - 1, v.y - 1, 3, 3), label: `${v.name}: take in the view`, to: { kind: "act", activity: "hike" } });
  for (const p of portals)
    for (let y = p.rect.y / TILE; y < (p.rect.y + p.rect.h) / TILE; y++)
      for (let x = p.rect.x / TILE; x < (p.rect.x + p.rect.w) / TILE; x++) if (SOLID.has(rows[y]?.[x] ?? "")) rows[y][x] = "_";
  return {
    id: "highlands",
    kind: "city",
    art: "highlands",
    name: "The Highlands",
    cols: r.cols,
    rows: r.rows,
    width: r.cols * TILE,
    height: r.rows * TILE,
    tiles: rows.map((row) => row.join("")),
    structures: [],
    portals,
    rooms: [],
    spawn: r.spawn,
    accent: "#15987f",
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
export function step(map: WorldMap, pos: { x: number; y: number }, dx: number, dy: number, seconds: number, speed = 1) {
  const len = Math.hypot(dx, dy);
  if (len < 0.01) return pos;
  const dist = WALK_SPEED * speed * Math.min(seconds, 0.1) * Math.min(1, len);
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
 * (eu-west-2). Offices use the same regional room instances and admission limits.
 */
export const SERVER_CAPACITY = ROOM_CAPACITY;

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
  const open = SERVERS.filter((s) => s.region === region && n(s) < SERVER_CAPACITY);
  if (open.length) return open.sort((a, b) => n(b) - n(a) || a.id.localeCompare(b.id))[0];
  return SERVERS.filter(s => s.region === region).sort((a, b) => n(a) - n(b) || a.id.localeCompare(b.id))[0];
}

/** Room namespace. The admission RPC supplies its authorized epoch suffix. */
export const channelFor = (mapId: string, serverId: string) =>
  `world:room:${mapId}:${serverId}`;

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

/** Walkable fictional district, not a geographical replica of the universities. */
export function universityDistrictMap(): WorldMap {
 const g=new Grid(48,38,"g");g.border("T");g.fill(1,17,46,6,"-");g.fill(22,1,5,36,"-");
 const structures:Structure[]=[],portals:Portal[]=[];
 UNIVERSITIES.forEach((u,i)=>{
  const x=i%2?30:6,y=i<2?5:26;
  g.fill(x,y,12,6,"#");g.fill(x+4,y+6,3,i<2?7:1,"-");
  if(i>=2)g.fill(x+4,22,3,4,"-");
  structures.push({x,y,w:12,h:6,label:u.fullName,accent:u.colour,door:"bottom"});
  portals.push({id:`enter-${u.id}`,rect:px(x+4,y+6,3,1),label:`Enter ${u.fullName}`,to:{kind:"map",mapId:`university-${u.id}`,label:u.fullName}});
 });
 for(const x of [4,20,28,44]) for(const y of [3,14,24,35])g.set(x,y,"T");
 portals.push({id:"london",rect:px(1,18,2,2),label:"Return to London",to:{kind:"map",mapId:"city",label:"London"}});
 return finish({id:"universities",kind:"campus",name:"University Quarter",structures,portals,rooms:[],spawn:centre(4,20),accent:"#7153b9",sign:{x:24,y:19,text:"Explore your next chapter"}},g);
}
export function universityInteriorMap(id:string): WorldMap|null {
 const u=universityById(id);if(!u)return null;
 const g=new Grid(26,23,".");g.border("#");
 const portals:Portal[]=[{id:"exit",rect:px(12,21,2,1),label:"Back to University Quarter",to:{kind:"map",mapId:"universities",label:"University Quarter"}},
 ...(["courses","events","networking"] as const).map((topic,i)=>({id:`${id}-${topic}`,rect:px(5+i*7,8,2,2),label:`Talk: ${topic==="courses"?"subject guide":topic==="events"?"events ambassador":"networking mentor"}`,to:{kind:"university" as const,university:id,topic}}))];
 return finish({id:`university-${id}`,kind:"office",name:`${u.name} · discovery lounge`,structures:[],portals,rooms:[{name:"Courses and questions",rect:px(2,3,7,10)},{name:"Open days and events",rect:px(10,3,7,10)},{name:"Networking safely",rect:px(18,3,6,10)}],spawn:centre(13,18),accent:u.colour,sign:{x:13,y:3,text:`${u.name}: ask, explore, plan`}},g);
}
export function supermarketMap():WorldMap {
 const g=new Grid(30,25,".");g.border("#");
 for(const x of [8,15,22])g.fill(x,6,2,10,"#");
 return finish({id:"supermarket",kind:"office",name:"Tesco · practice store",structures:[],portals:[{id:"exit",rect:px(14,23,2,1),label:"Back to London",to:{kind:"map",mapId:"city",label:"London"}}],rooms:[],spawn:centre(14,21),accent:"#2b5fd9",sign:{x:15,y:2,text:"Stock shelves · serve customers · learn"}},g);
}


// ── Two-level rooms (mezzanines) ───────────────────────────────────────────
const LEVEL_MAPS = new WeakMap<WorldMap, WorldMap>();
/** The map as seen from one level: the deck's own walkable grid and its portals. */
export function levelMap(map: WorldMap, level: number): WorldMap {
  if (!map.deck) return map;
  if (level !== 1) {
    let ground = LEVEL_MAPS.get(map);
    if (!ground) {
      ground = { ...map, portals: map.portals.filter((p) => (p.level ?? 0) === 0) };
      LEVEL_MAPS.set(map, ground);
    }
    return ground;
  }
  const deck = map.deck;
  let upper = LEVEL_MAPS.get(deck as unknown as WorldMap);
  if (!upper) {
    upper = { ...map, tiles: deck.tiles, portals: map.portals.filter((p) => p.level === 1) };
    LEVEL_MAPS.set(deck as unknown as WorldMap, upper);
  }
  return upper;
}

/**
 * Height and level at a point. On the stairs, height follows how far up you
 * are; past halfway you count as upstairs. Elsewhere you stay on your level.
 */
export function elevationAt(map: WorldMap, x: number, y: number, level: number) {
  const deck = map.deck;
  if (!deck) return { z: 0, level: 0 };
  const r = deck.ramp, tx = x / TILE, ty = y / TILE;
  if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
    const t = Math.max(0, Math.min(1, (r.y + r.h - ty) / r.h));
    return { z: t * deck.height, level: t > 0.5 ? 1 : 0 };
  }
  return { z: level === 1 ? deck.height : 0, level: level === 1 ? 1 : 0 };
}
