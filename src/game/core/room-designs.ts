/**
 * Room designs for your home: cosy cutaway rooms in the style of the two
 * reference bedrooms (a dusty-blue study bedroom on a brick plinth, and a
 * leaf-wallpaper retreat with white panelling and star lights), plus eight
 * more worked out from them. Players can start from a design and then change
 * the paint, wallpaper, floor and lights themselves.
 */
export type WallPattern = "plain" | "leaf" | "stripe" | "panel" | "check" | "grid";
export type RoomLights = "none" | "fairy" | "stars" | "neon";
export interface RoomStyle {
  design: string;
  wall: string;
  /** The second wall (the cutaway's side wall); defaults to the main wall. */
  side?: string;
  pattern: WallPattern;
  /** Lower panelling colour, or null for none. */
  wainscot: string | null;
  floor: string;
  trim: string;
  lights: RoomLights;
  /** A brick plinth under the room, like a dollhouse. */
  plinth: boolean;
}
export interface RoomDesign extends RoomStyle { name: string; blurb: string }

export const ROOM_DESIGNS: RoomDesign[] = [
  { design: "mocha-study", name: "Mocha study", blurb: "Dusty blue walls, walnut floor, open clothes rail and a desk setup.", wall: "#5f7d95", side: "#e8e4de", pattern: "plain", wainscot: null, floor: "#5a4438", trim: "#f4f1ec", lights: "fairy", plinth: true },
  { design: "jungle-retreat", name: "Jungle retreat", blurb: "Leaf wallpaper, white panelling, pale boards and star lights.", wall: "#2f6b3a", pattern: "leaf", wainscot: "#ecebe6", floor: "#d6d1c8", trim: "#3b4f8a", lights: "stars", plinth: false },
  { design: "sage-cottage", name: "Sage cottage", blurb: "Soft sage, white panelling and warm oak.", wall: "#9bb59a", pattern: "plain", wainscot: "#f3efe6", floor: "#b48a5e", trim: "#f3efe6", lights: "fairy", plinth: true },
  { design: "midnight-gamer", name: "Midnight gamer", blurb: "Deep navy, dark boards and neon light strips.", wall: "#1f2a44", side: "#27365a", pattern: "grid", wainscot: null, floor: "#2b2b33", trim: "#3a4a70", lights: "neon", plinth: false },
  { design: "blush-loft", name: "Blush loft", blurb: "Blush stripes over light oak, with a brick base.", wall: "#e8b9b0", pattern: "stripe", wainscot: null, floor: "#c9a27a", trim: "#fff4ef", lights: "fairy", plinth: true },
  { design: "ocean-calm", name: "Ocean calm", blurb: "Sea-glass blue, white panelling and pale boards.", wall: "#9cc6cf", pattern: "plain", wainscot: "#f6f4ee", floor: "#e2ddd2", trim: "#2f5d73", lights: "stars", plinth: false },
  { design: "sunny-studio", name: "Sunny studio", blurb: "Butter yellow and honey floorboards.", wall: "#f3d58a", side: "#f7e7bd", pattern: "plain", wainscot: null, floor: "#c08a4e", trim: "#fffaf0", lights: "none", plinth: true },
  { design: "lavender-dream", name: "Lavender dream", blurb: "Lilac leaf print, white boards and star lights.", wall: "#8f7bbf", pattern: "leaf", wainscot: "#f2eef8", floor: "#ece8e2", trim: "#5e4f8c", lights: "stars", plinth: false },
  { design: "terracotta-boho", name: "Terracotta boho", blurb: "Warm clay walls, dark oak and fairy lights.", wall: "#c96f4a", side: "#e7c3a5", pattern: "panel", wainscot: null, floor: "#8a5a3c", trim: "#f5e6d6", lights: "fairy", plinth: true },
  { design: "minimal-mono", name: "Minimal mono", blurb: "Grey panels, concrete floor, nothing extra.", wall: "#d4d4d2", pattern: "panel", wainscot: null, floor: "#9a9a97", trim: "#2c2c2c", lights: "none", plinth: false },
];
export const DEFAULT_ROOM: RoomStyle = ROOM_DESIGNS[0];

export const WALL_PAINTS = ["#5f7d95", "#2f6b3a", "#9bb59a", "#1f2a44", "#e8b9b0", "#9cc6cf", "#f3d58a", "#8f7bbf", "#c96f4a", "#d4d4d2", "#e8e4de", "#3f3a36"];
export const FLOORS: { colour: string; name: string }[] = [
  { colour: "#5a4438", name: "Walnut" }, { colour: "#b48a5e", name: "Oak" }, { colour: "#d6d1c8", name: "Whitewash" }, { colour: "#c08a4e", name: "Honey" },
  { colour: "#2b2b33", name: "Charcoal" }, { colour: "#8a5a3c", name: "Dark oak" }, { colour: "#9a9a97", name: "Concrete" }, { colour: "#c9a27a", name: "Light oak" },
];
export const PATTERNS: { id: WallPattern; name: string }[] = [
  { id: "plain", name: "Paint" }, { id: "leaf", name: "Leaf wallpaper" }, { id: "stripe", name: "Stripes" }, { id: "panel", name: "Panels" }, { id: "check", name: "Checks" }, { id: "grid", name: "Grid" },
];
export const LIGHTS: { id: RoomLights; name: string }[] = [
  { id: "none", name: "No lights" }, { id: "fairy", name: "Fairy lights" }, { id: "stars", name: "Star lights" }, { id: "neon", name: "Neon strip" },
];

const HEX = /^#[0-9a-f]{6}$/i;
/** Reads a stored room style, falling back to the design's own values. */
export function readRoomStyle(raw: unknown): RoomStyle {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const base = ROOM_DESIGNS.find((d) => d.design === r.design) ?? DEFAULT_ROOM;
  const colour = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v : fallback);
  return {
    design: base.design,
    wall: colour(r.wall, base.wall),
    side: colour(r.side, base.side ?? colour(r.wall, base.wall)),
    pattern: PATTERNS.some((p) => p.id === r.pattern) ? (r.pattern as WallPattern) : base.pattern,
    wainscot: r.wainscot === null ? null : colour(r.wainscot, base.wainscot ?? "") || base.wainscot,
    floor: colour(r.floor, base.floor),
    trim: colour(r.trim, base.trim),
    lights: LIGHTS.some((l) => l.id === r.lights) ? (r.lights as RoomLights) : base.lights,
    plinth: typeof r.plinth === "boolean" ? r.plinth : base.plinth,
  };
}
