import { TILE, type Portal, type PortalTarget, type Prop, type WorldMap } from "./world";

/**
 * Walk-in venues: every café, diner, shop and the town hall has a designed
 * inside (Blender furniture from art/blender/interiors_kit.py), and the bigger
 * ones have an upstairs reached by a real staircase.
 *
 * Map ids: `venue-<id>` is the ground floor, `venue-<id>-up` the floor above.
 */
type Theme = "cafe" | "burger" | "chicken" | "shop" | "pharmacy" | "hall";
export interface Venue {
  id: string;
  name: string;
  theme: Theme;
  accent: string;
  /** What the counter does. */
  counter: { label: string; to: PortalTarget };
  /** The upstairs floor, when there is one. */
  upstairs?: { name: string; label: string; to: PortalTarget };
}

export const VENUES: Venue[] = [
  { id: "starbucks", name: "Hearth & Bean", theme: "cafe", accent: "#5b3a29",
    counter: { label: "Order at the counter: coffee break", to: { kind: "act", activity: "eat" } },
    upstairs: { name: "Upstairs lounge", label: "Study corner: revise and restore Focus", to: { kind: "act", activity: "study" } } },
  { id: "mcdonalds", name: "Big Bun Burgers", theme: "burger", accent: "#d6452a",
    counter: { label: "Order at the counter: grab a meal", to: { kind: "act", activity: "eat" } },
    upstairs: { name: "Big Bun Burgers · Upstairs seating", label: "Window booth: eat with a view", to: { kind: "act", activity: "eat" } } },
  { id: "kfc", name: "Cluck & Co.", theme: "chicken", accent: "#b72025",
    counter: { label: "Order at the counter: grab a meal", to: { kind: "act", activity: "eat" } },
    upstairs: { name: "Cluck & Co. · Upstairs seating", label: "Booth: eat with friends", to: { kind: "act", activity: "eat" } } },
  { id: "tescow", name: "Tesco Express", theme: "shop", accent: "#1f5fa8",
    counter: { label: "Checkout: drinks and meal deals", to: { kind: "shop", shop: "tescow" } } },
  { id: "bootz", name: "Bootz Pharmacy", theme: "pharmacy", accent: "#1d4e9e",
    counter: { label: "Pharmacy counter: medicine", to: { kind: "shop", shop: "bootz" } } },
  { id: "town-hall", name: "Town Hall", theme: "hall", accent: "#704c47",
    counter: { label: "Civic library: read and restore Focus", to: { kind: "act", activity: "study" } },
    upstairs: { name: "Town Hall · Council gallery", label: "London through time: exhibition", to: { kind: "act", activity: "study" } } },
];
export const venueById = (id: string) => VENUES.find((v) => v.id === id);

const THEMES: Record<Theme, NonNullable<WorldMap["theme"]>> = {
  cafe: { floor: ["#8a6446", "#7f5c40"], wall: "#3d2c24", skirting: "#2a1d17" },
  burger: { floor: ["#e9e3d8", "#d6452a"], wall: "#f4efe6", skirting: "#c23a22" },
  chicken: { floor: ["#ece6da", "#9e1c22"], wall: "#f6f0e4", skirting: "#9e1c22" },
  shop: { floor: ["#e9ecef", "#dfe3e8"], wall: "#f4f6f8", skirting: "#1f5fa8" },
  pharmacy: { floor: ["#eef2f6", "#e3e9f0"], wall: "#f6f8fb", skirting: "#1d4e9e" },
  hall: { floor: ["#ece6da", "#bdb3a4"], wall: "#d9cbb3", skirting: "#4a2f22" },
};

const W = 22, H = 16;
/** The mezzanine: a raised deck along the east side, with stairs rising north onto it. */
export const DECK = { x: 14, y: 1, w: 7, h: 9, height: 1.8 } as const;
export const RAMP = { x: 14, y: 10, w: 2, h: 4 } as const;
const px = (x: number, y: number, w = 1, h = 1) => ({ x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE });

type Placed = Prop & { solid?: boolean; deck?: boolean };
/** Furniture for the ground floor and (for venues with one) the deck. */
function layout(v: Venue): Placed[] {
  const P = (model: string, x: number, y: number, w: number, d: number, extra: Partial<Placed> = {}): Placed => ({ model, x, y, w, d, solid: true, ...extra });
  const U = (model: string, x: number, y: number, w: number, d: number, extra: Partial<Placed> = {}) => P(model, x, y, w, d, { deck: true, lift: DECK.height, ...extra });
  const plants = [P("tall-plant", 1, 13, 1, 1), P("tall-plant", 20, 13, 1, 1)];
  switch (v.theme) {
    case "cafe":
      return [
        P("cafe-counter", 2, 2, 4, 1), P("tall-plant", 1, 1, 1, 1),
        ...[[3, 7], [6, 7], [3, 10], [6, 10]].flatMap(([x, y]) => [
          P("cafe-table", x, y, 1, 1), P("cafe-chair", x, y - 1, 1, 1), P("cafe-chair", x, y + 1, 1, 1, { turn: 2 }),
          P("pendant", x, y, 1, 1, { lift: 1.55, solid: false }),
        ]),
        P("cafe-armchair", 9, 8, 1, 1, { turn: 1 }), P("cafe-table", 10, 8, 1, 1), P("cafe-armchair", 11, 8, 1, 1, { turn: 3 }),
        P("cafe-sofa", 9, 11, 2, 1, { turn: 2 }), P("cafe-armchair", 18, 3, 1, 1, { turn: 3 }), P("cafe-table", 17, 3, 1, 1),
        ...plants,
        // Upstairs lounge.
        U("cafe-sofa", 17, 1, 2, 1), U("cafe-table", 17, 2, 1, 1), U("cafe-armchair", 19, 2, 1, 1, { turn: 3 }),
        U("cafe-table", 15, 4, 1, 1), U("cafe-chair", 15, 3, 1, 1), U("cafe-chair", 15, 5, 1, 1, { turn: 2 }),
        U("cafe-table", 18, 6, 1, 1), U("cafe-chair", 18, 5, 1, 1), U("cafe-chair", 18, 7, 1, 1, { turn: 2 }),
        U("tall-plant", 20, 8, 1, 1),
      ];
    case "burger":
    case "chicken": {
      const t = v.theme;
      return [
        P(`counter-${t}`, 2, 2, 4, 1), P(`counter-${t}`, 7, 2, 4, 1),
        ...[[2, 7], [5, 7], [8, 7], [2, 10], [5, 10], [8, 10]].map(([x, y]) => P(`booth-${t}`, x, y, 2, 2)),
        P(`booth-${t}`, 17, 2, 2, 2), P(`booth-${t}`, 17, 5, 2, 2),
        ...[17, 18, 19, 20].map((x) => P(`stool-${t}`, x, 12, 1, 1)),
        ...plants,
        U(`booth-${t}`, 17, 1, 2, 2), U(`booth-${t}`, 17, 4, 2, 2), U(`stool-${t}`, 20, 7, 1, 1), U(`stool-${t}`, 20, 8, 1, 1),
      ];
    }
    case "shop":
    case "pharmacy":
      return [
        ...[3, 5, 7, 9].map((x) => P("shop-fridge", x, 1, 2, 1)).slice(0, v.theme === "shop" ? 4 : 2),
        ...[3, 6, 9, 12].flatMap((x) => [P("shop-shelf", x, 5, 2, 1), P("shop-shelf", x, 8, 2, 1, { turn: 2 })]),
        P("shop-checkout", 15, 10, 2, 1), P("shop-checkout", 15, 12, 2, 1),
        P("tall-plant", 1, 13, 1, 1), P("tall-plant", 20, 1, 1, 1),
      ];
    case "hall":
      return [
        P("hall-desk", 4, 3, 4, 1),
        ...[2, 5, 8].flatMap((x) => [P("hall-bench", x, 8, 2, 1), P("hall-bench", x, 11, 2, 1)]),
        P("tall-plant", 1, 1, 1, 1), P("tall-plant", 11, 1, 1, 1), P("hall-bench", 17, 4, 2, 1), ...plants,
        U("departures", 16, 1, 3, 1), U("hall-bench", 17, 4, 2, 1), U("hall-bench", 17, 7, 2, 1), U("tall-plant", 20, 1, 1, 1),
      ];
  }
}

/** A venue as a walkable map; venues with an upstairs get a mezzanine deck in the same room. */
export function venueMap(mapId: string): WorldMap | null {
  const v = venueById(mapId.replace(/^venue-/, ""));
  if (!v || !mapId.startsWith("venue-")) return null;
  const blank = () => Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? "#" : ".")));
  const t: string[][] = blank();
  for (let x = 2; x < W - 2; x++) t[0][x] = "W";
  const props = layout(v);
  const deck = Boolean(v.upstairs);
  // Upstairs grid: only the deck and the stairs are walkable.
  const u: string[][] = blank().map((row, y) => row.map((c, x) => (x >= DECK.x && x < DECK.x + DECK.w && y >= DECK.y && y < DECK.y + DECK.h ? "." : "#")));
  for (const p of props) {
    if (!p.solid) continue;
    const grid = p.deck ? u : t;
    for (let y = p.y; y < p.y + p.d; y++) for (let x = p.x; x < p.x + p.w; x++) grid[y][x] = "t";
  }
  if (deck) {
    for (let y = RAMP.y; y < RAMP.y + RAMP.h; y++) {
      for (let x = RAMP.x; x < RAMP.x + RAMP.w; x++) { t[y][x] = "."; u[y][x] = "."; }
      // Balustrades either side of the flight, on both levels.
      for (const x of [RAMP.x - 1, RAMP.x + RAMP.w]) { t[y][x] = "X"; u[y][x] = "#"; }
    }
    // Under the top of the stairs: a closed cupboard, so you can't walk into the flight from behind.
    for (let x = RAMP.x; x < RAMP.x + RAMP.w; x++) { t[RAMP.y - 1][x] = "X"; u[RAMP.y - 1][x] = "."; }
  }
  const portals: Portal[] = [];
  t[H - 1][10] = t[H - 1][11] = "e";
  t[H - 2][10] = t[H - 2][11] = "e";
  portals.push({ id: "exit", rect: px(10, H - 2, 2, 1), label: `Leave ${v.name}`, to: { kind: "map", mapId: "city", label: "London" } });
  const first = props.find((p) => !p.deck && (p.model.includes("counter") || p.model === "shop-checkout" || p.model === "hall-desk"));
  if (first) {
    const spot = first.model === "shop-checkout" ? { x: first.x - 1, y: first.y, w: 1 } : { x: first.x, y: first.y + first.d, w: Math.min(first.w, 3) };
    portals.push({ id: "counter", rect: px(spot.x, spot.y, spot.w, 1), label: v.counter.label, to: v.counter.to });
  }
  if (v.upstairs) portals.push({ id: "upstairs", level: 1, rect: px(15, 7, 2, 1), label: v.upstairs.label, to: v.upstairs.to });
  return {
    id: mapId, kind: "office", name: v.name,
    cols: W, rows: H, width: W * TILE, height: H * TILE,
    tiles: t.map((r) => r.join("")),
    structures: [], rooms: [], portals,
    spawn: { x: 11 * TILE, y: (H - 3) * TILE },
    accent: v.accent,
    sign: { x: 6, y: 13, text: v.name },
    props: props.map((p) => ({ model: p.model, x: p.x, y: p.y, w: p.w, d: p.d, lift: p.lift, turn: p.turn })),
    theme: THEMES[v.theme],
    deck: deck ? { tiles: u.map((r) => r.join("")), height: DECK.height, ramp: RAMP } : undefined,
  };
}
