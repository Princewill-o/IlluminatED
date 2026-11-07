import { TILE, type Portal, type PortalTarget, type Prop, type WorldMap } from "./world";

/**
 * Walk-in venues: every café, diner, shop and the town hall has a designed
 * inside (Blender furniture from art/blender/interiors_kit.py), and the bigger
 * ones have an upstairs reached by a real staircase.
 *
 * Map ids: `venue-<id>` is the ground floor, `venue-<id>-up` the floor above.
 */
type Theme = "cafe" | "burger" | "chicken" | "pizza" | "shop" | "pharmacy" | "hall";
export interface Venue {
  id: string;
  name: string;
  theme: Theme;
  accent: string;
  /** What the counter does. */
  counter: { label: string; to: PortalTarget };
  /** The upstairs floor, when there is one. */
  upstairs?: { name: string; label: string; to: PortalTarget };
  /** A staff-only door (the restaurant's jobs). */
  staff?: { label: string; to: PortalTarget };
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
  { id: "pizzazz", name: "Pizzazz Pizza", theme: "pizza", accent: "#1f6b45",
    counter: { label: "Order at the counter: a slice and a drink", to: { kind: "act", activity: "eat" } },
    upstairs: { name: "Pizzazz Pizza · Upstairs dining room", label: "Window table: share a pizza", to: { kind: "act", activity: "eat" } },
    staff: { label: "Staff door: work at Pizzazz", to: { kind: "work", workplace: "pizzazz" } } },
  { id: "tescow", name: "Tesco Express", theme: "shop", accent: "#1f5fa8",
    counter: { label: "Checkout: drinks and meal deals", to: { kind: "shop", shop: "tescow" } } },
  { id: "bootz", name: "Bootz Pharmacy", theme: "pharmacy", accent: "#1d4e9e",
    counter: { label: "Pharmacy counter: medicine", to: { kind: "shop", shop: "bootz" } } },
  { id: "town-hall", name: "Town Hall", theme: "hall", accent: "#704c47",
    counter: { label: "Civic library: read and restore Focus", to: { kind: "act", activity: "study" } },
    upstairs: { name: "Town Hall · Council gallery", label: "Networking event: meet people from your future industry", to: { kind: "networking", venue: "town-hall" } } },
];
export const venueById = (id: string) => VENUES.find((v) => v.id === id);

/** Restaurants: the kitchen floor behind the counter, the queue in front of it and the doormat. */
const KITCHEN = { x: 1, y: 1, w: 13, h: 2 }, QUEUE = { x: 1, y: 3, w: 13, h: 3 }, MAT = { x: 9, y: 13, w: 4, h: 2 };
const zones = (kitchen: [string, string], queue: [string, string]) => [{ ...KITCHEN, floor: kitchen }, { ...QUEUE, floor: queue }, { ...MAT, floor: ["#3b3b3d", "#333335"] as [string, string] }];
const THEMES: Record<Theme, NonNullable<WorldMap["theme"]>> = {
  cafe: { floor: ["#8a6446", "#7f5c40"], wall: "#3d2c24", skirting: "#2a1d17", zones: [{ x: 1, y: 1, w: 7, h: 3, floor: ["#d9d2c3", "#3d3b38"] }, { ...MAT, floor: ["#3b3b3d", "#333335"] }] },
  burger: { floor: ["#b9875a", "#ae7d52"], wall: "#f4efe6", skirting: "#c23a22", zones: zones(["#b8babc", "#aeb0b2"], ["#ece6da", "#d6452a"]) },
  chicken: { floor: ["#ece6da", "#e1d9cb"], wall: "#f6f0e4", skirting: "#9e1c22", zones: zones(["#b8babc", "#aeb0b2"], ["#ece6da", "#9e1c22"]) },
  pizza: { floor: ["#8a5a3a", "#7f5335"], wall: "#efe4cf", skirting: "#1f5e3c", zones: zones(["#e9e4d8", "#2f2f30"], ["#c9734a", "#bd6942"]) },
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
        P("bookcase", 8, 1, 2, 1), P("bookcase", 10, 1, 2, 1), P("tall-plant", 12, 1, 1, 1),
        P("bar-cafe", 2, 13, 4, 1), ...[2, 3, 4, 5].map((x) => P("stool-pizza", x, 12, 1, 1)),
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
        // Open kitchen behind the counter: fryers, grill, hood and the pass.
        P(`kitchen-${t}`, 2, 1, 4, 2), P(`kitchen-${t}`, 6, 1, 4, 2), P(`kitchen-${t}`, 10, 1, 4, 2),
        P(`counter-${t}`, 2, 3, 4, 1), P(`counter-${t}`, 6, 3, 4, 1), P(`drinks-${t}`, 10, 3, 2, 1), P("tall-plant", 13, 3, 1, 1),
        // Order kiosks by the door side wall, facing the room.
        ...[5, 6, 7].map((y) => P(`order-kiosk-${t}`, 1, y, 1, 1, { turn: 1 })),
        // Tables for four in the middle, booths along the wall, a window bar with stools.
        ...[[4, 6], [7, 6], [10, 6], [4, 9], [7, 9], [10, 9]].map(([x, y]) => P(`table-${t}`, x, y, 2, 2)),
        P(`booth-${t}`, 1, 9, 2, 2), P(`booth-${t}`, 1, 12, 2, 2),
        P(`bar-${t}`, 4, 13, 4, 1), ...[4, 5, 6, 7].map((x) => P(`stool-${t}`, x, 12, 1, 1)),
        // Under the mezzanine.
        P(`booth-${t}`, 19, 1, 2, 2), P(`booth-${t}`, 19, 4, 2, 2), P(`booth-${t}`, 19, 7, 2, 2),
        P(`table-${t}`, 16, 2, 2, 2), P(`table-${t}`, 16, 5, 2, 2),
        P(`bar-${t}`, 17, 13, 4, 1), ...[17, 18, 19, 20].map((x) => P(`stool-${t}`, x, 12, 1, 1)), P("tall-plant", 20, 10, 1, 1),
        // Upstairs seating.
        U(`booth-${t}`, 19, 1, 2, 2), U(`booth-${t}`, 19, 4, 2, 2), U(`booth-${t}`, 19, 7, 2, 2),
        U(`table-${t}`, 15, 1, 2, 2), U(`table-${t}`, 15, 4, 2, 2), U("tall-plant", 14, 8, 1, 1),
      ];
    }
    case "pizza":
      return [
        // Open kitchen: the wood-fired oven and the prep line, behind the counter.
        P("pizza-oven", 2, 1, 3, 2), P("kitchen-pizza", 5, 1, 4, 2), P("kitchen-pizza", 9, 1, 4, 2),
        P("pizza-counter", 2, 3, 4, 1), P("pizza-counter", 6, 3, 4, 1), P("drinks-burger", 10, 3, 2, 1),
        // Booths along the wall, checked-cloth tables, a window bar.
        P("booth-pizza", 1, 5, 2, 2), P("booth-pizza", 1, 8, 2, 2), P("booth-pizza", 1, 11, 2, 2),
        ...[[4, 6], [7, 6], [10, 6], [4, 9], [7, 9], [10, 9]].flatMap(([x, y]) => [P("pizza-table", x, y, 2, 2), P("pendant", x, y, 2, 2, { lift: 1.55, solid: false })]),
        P("bar-cafe", 4, 13, 4, 1), ...[4, 5, 6, 7].map((x) => P("stool-pizza", x, 12, 1, 1)),
        P("booth-pizza", 19, 1, 2, 2), P("booth-pizza", 19, 4, 2, 2), P("booth-pizza", 19, 7, 2, 2),
        P("pizza-table", 16, 2, 2, 2), P("pizza-table", 16, 5, 2, 2),
        P("bar-cafe", 17, 13, 4, 1), ...[17, 18, 19, 20].map((x) => P("stool-pizza", x, 12, 1, 1)), P("tall-plant", 20, 10, 1, 1),
        U("booth-pizza", 19, 1, 2, 2), U("booth-pizza", 19, 4, 2, 2), U("booth-pizza", 19, 7, 2, 2),
        U("pizza-table", 15, 1, 2, 2), U("pizza-table", 15, 4, 2, 2), U("tall-plant", 14, 8, 1, 1),
      ];
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
  // Restaurants: nobody but staff walks into the kitchen.
  if (["burger", "chicken", "pizza"].includes(v.theme)) for (const [x, y] of [[1, 1], [1, 2], [1, 3], [12, 3], [13, 1], [13, 2], [13, 3]]) t[y][x] = "X";
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
  if (v.staff) portals.push({ id: "staff", rect: px(12, 4, 1, 1), label: v.staff.label, to: v.staff.to });
  if (v.upstairs) portals.push({ id: "upstairs", level: 1, rect: px(15, 7, 2, 1), label: v.upstairs.label, to: v.upstairs.to });
  // The café lounge also hosts networking meet-ups by the window.
  if (v.id === "starbucks") portals.push({ id: "networking", level: 1, rect: px(19, 4, 2, 1), label: "Networking meet-up: swap cards over coffee", to: { kind: "networking", venue: "starbucks" } });
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
