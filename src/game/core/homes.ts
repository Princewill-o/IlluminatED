import type { Activity } from "./needs";

/**
 * Homes you can buy and furniture you can place. Prices and footprints here
 * must match the rows seeded by the careers/homes migration (tests check).
 */

export interface HomeType {
  id: string;
  name: string;
  area: string;
  price: number;
  /** Which rendered colourway/shell (public/world/home-N). */
  style: number;
  blurb: string;
}

export const HOMES: HomeType[] = [
  { id: "studio", name: "Starter studio", area: "Brixton", price: 0, style: 0, blurb: "Your first place. Small, cosy and all yours." },
  { id: "terrace", name: "Garden terrace", area: "Peckham", price: 2500, style: 1, blurb: "A bright terraced home with room to grow." },
  { id: "loft", name: "Warehouse loft", area: "Shoreditch", price: 8000, style: 2, blurb: "Exposed brick, big windows, very east London." },
  { id: "cottage", name: "Courtyard cottage", area: "Greenwich", price: 12000, style: 3, blurb: "Sage walls, warm oak and a peaceful place to unwind." },
  { id: "penthouse", name: "Skyline penthouse", area: "Canary Wharf", price: 22000, style: 4, blurb: "Midnight stone, brass details and statement furniture." },
];

export interface Furniture {
  design?: string;
  collection?: "Living" | "Bedroom" | "Kitchen" | "Bathroom" | "Decor" | "Study";
  id: string;
  name: string;
  price: number;
  /** Footprint in tiles. */
  w: number;
  h: number;
  /** Opens a page when you walk up to it. */
  link?: { href: string; label: string };
  /** Something you can do here (refills your needs). */
  act?: { activity: "sleep" | "eat" | "study"; label: string };
  /** Included free with every home. */
  starter?: boolean;
}

export const FURNITURE: Furniture[] = [
  { id: "bed", name: "Double bed", price: 0, w: 4, h: 4, starter: true, act: { activity: "sleep", label: "Bed: have a nap" } },
  { id: "wardrobe", name: "Wardrobe", price: 0, w: 3, h: 1, starter: true, link: { href: "/games/locker", label: "Wardrobe: change your look" } },
  { id: "shelf", name: "Bookshelf", price: 0, w: 3, h: 1, starter: true, link: { href: "/revision", label: "Bookshelf: revision notes" } },
  { id: "desk", name: "Revision desk", price: 0, w: 4, h: 2, starter: true, link: { href: "/learn", label: "Revision desk" } },
  { id: "tv", name: "TV", price: 0, w: 4, h: 1, starter: true, link: { href: "/games", label: "TV: play Promotion Panic" } },
  { id: "sofa", name: "Sofa", price: 0, w: 4, h: 2, starter: true },
  { id: "table", name: "Coffee table", price: 0, w: 3, h: 2, starter: true, act: { activity: "eat", label: "Coffee table: have a snack" } },
  { id: "petbed", name: "Pet bed", price: 0, w: 2, h: 2, starter: true },
  { id: "plant", name: "Pot plant", price: 0, w: 1, h: 1, starter: true },
  { id: "lamp", name: "Floor lamp", price: 0, w: 1, h: 1, starter: true },
  { id: "armchair", name: "Armchair", price: 300, w: 2, h: 2 },
  { id: "beanbag", name: "Beanbag", price: 250, w: 2, h: 2 },
  { id: "rug", name: "Round rug", price: 200, w: 3, h: 3 },
  { id: "fridge", name: "Fridge", price: 500, w: 2, h: 1, act: { activity: "eat", label: "Fridge: make some food" } },
  { id: "fishtank", name: "Fish tank", price: 800, w: 3, h: 1 },
  { id: "gaming", name: "Gaming setup", price: 900, w: 3, h: 2, link: { href: "/games/world", label: "Gaming setup: Worlds" } },
  { id: "telescope", name: "Telescope", price: 1200, w: 1, h: 1 },
  { id: "trophies", name: "Trophy cabinet", price: 1500, w: 3, h: 1, link: { href: "/games/careers", label: "Trophy cabinet: your career" } },
  { id: "piano", name: "Piano", price: 2500, w: 3, h: 2 },
  { id: "arcade", name: "Arcade machine", price: 3000, w: 2, h: 1, link: { href: "/games", label: "Arcade: Promotion Panic" } },
  { id: "shower", name: "Everyday shower", price: 0, w: 2, h: 2, starter: true, collection: "Bathroom" },
  { id: "toilet", name: "Porcelain toilet", price: 350, w: 1, h: 2, collection: "Bathroom" },
  { id: "sink", name: "Oak vanity sink", price: 450, w: 2, h: 1, collection: "Bathroom" },
  { id: "bath", name: "Freestanding bath", price: 1800, w: 3, h: 2, collection: "Bathroom" },
  { id: "rain-shower", name: "Brass rainfall shower", price: 2400, w: 2, h: 2, design: "shower", collection: "Bathroom" },
  { id: "velvet-sofa", name: "Emerald velvet sofa", price: 1600, w: 4, h: 2, design: "sofa", collection: "Living" },
  { id: "linen-bed", name: "Oak & linen bed", price: 2200, w: 4, h: 4, design: "bed", collection: "Bedroom" },
  { id: "cinema-tv", name: "Cinema media console", price: 3200, w: 4, h: 1, design: "tv", collection: "Living" },
  { id: "marble-table", name: "Travertine dining table", price: 1700, w: 3, h: 2, design: "table", collection: "Kitchen" },
  { id: "kitchen", name: "Sage kitchen & hob", price: 1400, w: 4, h: 2, collection: "Kitchen" },
  { id: "designer-chair", name: "Bouclé lounge chair", price: 1100, w: 2, h: 2, design: "armchair", collection: "Living" },
  { id: "oak-desk", name: "Architect's oak desk", price: 1300, w: 4, h: 2, design: "desk", collection: "Study" },
  { id: "monstera", name: "Monstera in ceramic pot", price: 400, w: 1, h: 1, design: "plant", collection: "Decor" },
  { id: "sculpture", name: "Gallery sculpture", price: 1900, w: 1, h: 1, collection: "Decor" },
  { id: "pendant", name: "Brass globe lamp", price: 650, w: 1, h: 1, design: "lamp", collection: "Decor" },
  { id: "woven-rug", name: "Handwoven wool rug", price: 750, w: 3, h: 3, design: "rug", collection: "Decor" },
];

export const furnitureById = (id: string) => FURNITURE.find((f) => f.id === id) ?? null;
export const homeById = (id: string) => HOMES.find((h) => h.id === id) ?? null;

export interface Placed {
  key: string;
  item: string;
  x: number;
  y: number;
}

/** The default room layout every new home starts with (matches buildHome()). */
export const STARTER_LAYOUT: Placed[] = [
  { key: "bed", item: "bed", x: 1, y: 2 },
  { key: "wardrobe", item: "wardrobe", x: 6, y: 2 },
  { key: "shelf", item: "shelf", x: 10, y: 2 },
  { key: "desk", item: "desk", x: 14, y: 2 },
  { key: "tv", item: "tv", x: 14, y: 7 },
  { key: "sofa", item: "sofa", x: 14, y: 10 },
  { key: "table", item: "table", x: 7, y: 7 },
  { key: "petbed", item: "petbed", x: 2, y: 10 },
  { key: "plant-1", item: "plant", x: 6, y: 5 },
  { key: "plant-2", item: "plant", x: 18, y: 5 },
  { key: "lamp", item: "lamp", x: 5, y: 2 },
  { key: "shower", item: "shower", x: 1, y: 7 },
];

/** Where each shop item sits in the Blender catalogue render (scripts/world/build_home.py). */
export const CATALOGUE_LAYOUT: Placed[] = [
  { key: "armchair", item: "armchair", x: 1, y: 2 },
  { key: "beanbag", item: "beanbag", x: 5, y: 2 },
  { key: "rug", item: "rug", x: 9, y: 2 },
  { key: "fridge", item: "fridge", x: 14, y: 2 },
  { key: "fishtank", item: "fishtank", x: 1, y: 7 },
  { key: "gaming", item: "gaming", x: 6, y: 7 },
  { key: "telescope", item: "telescope", x: 11, y: 7 },
  { key: "trophies", item: "trophies", x: 14, y: 7 },
  { key: "piano", item: "piano", x: 1, y: 11 },
  { key: "arcade", item: "arcade", x: 6, y: 11 },
];

/** The furniture scene for Blender. */
export const catalogueScene = () => ({
  cols: 20,
  rows: 14,
  things: CATALOGUE_LAYOUT.map((p) => {
    const f = FURNITURE.find((k) => k.id === p.item)!;
    return { id: p.item, name: p.item, x: p.x, y: p.y, w: f.w, h: f.h };
  }),
});

export const ROOM = { cols: 20, rows: 14, minX: 1, minY: 2, maxX: 19, maxY: 13, door: [9, 10] as const, maxItems: 40 };

export type HomeAnimation = "sleep" | "eat" | "watch" | "shower" | "wash" | "sit" | "read" | "play" | "water" | "admire";
export interface HomeUse { animation: HomeAnimation; label: string; effect: Activity; duration: number }
export interface HomeAction extends HomeUse { item: string; x: number; y: number; w: number; h: number; started: number; seat?: { x: number; y: number; w: number; h: number } }
export function furnitureCollection(item: Furniture): string {
  if (item.collection) return item.collection;
  if (["bed", "wardrobe"].includes(item.id)) return "Bedroom";
  if (["fridge", "table"].includes(item.id)) return "Kitchen";
  if (["desk", "shelf", "gaming"].includes(item.id)) return "Study";
  if (["sofa", "armchair", "beanbag", "tv", "piano", "arcade"].includes(item.id)) return "Living";
  return "Decor";
}
export function homeUse(item: string): HomeUse {
  const design = furnitureById(item)?.design ?? item;
  const uses: Record<string, [HomeAnimation, string, Activity, number]> = {
    bed: ["sleep", "Sleep", "sleep", 8000], table: ["eat", "Enjoy a meal", "eat", 6000], fridge: ["eat", "Prepare a snack", "eat", 5000], kitchen: ["eat", "Cook and eat", "meal", 7000],
    tv: ["watch", "Watch TV", "watch", 8000], sofa: ["sit", "Relax on the sofa", "relax", 6000], armchair: ["sit", "Take a seat", "relax", 6000], beanbag: ["sit", "Put your feet up", "relax", 6000],
    shower: ["shower", "Take a shower", "shower", 7000], bath: ["shower", "Take a relaxing bath", "shower", 8000], sink: ["wash", "Wash your hands", "shower", 4000], toilet: ["sit", "Use the bathroom", "bathroom", 5000],
    desk: ["read", "Study at your desk", "study", 7000], shelf: ["read", "Read a book", "study", 6000], gaming: ["play", "Play a game", "arcade", 6000], arcade: ["play", "Play the arcade", "arcade", 6000], piano: ["play", "Play the piano", "music", 7000],
    plant: ["water", "Water your plant", "relax", 4000], wardrobe: ["admire", "Choose an outfit", "relax", 4000], fishtank: ["admire", "Feed the fish", "relax", 5000], lamp: ["admire", "Enjoy the warm light", "relax", 4000],
    telescope: ["admire", "Look at the stars", "relax", 6000], trophies: ["admire", "Admire your achievements", "relax", 4000], petbed: ["sit", "Relax with your companion", "relax", 5000],
  };
  const [animation, label, effect, duration] = uses[design] ?? ["admire", "Enjoy your decor", "relax", 4000];
  return { animation, label, effect, duration };
}

export const isFloorFurniture = (item: string) => ["rug", "woven-rug", "petbed", "beanbag"].includes(item);

/** Is a layout valid: inside the room, no overlaps, door clear? */
export function validLayout(layout: Placed[]): string | null {
  if (layout.length > ROOM.maxItems) return "Too many things in one room.";
  const taken = new Set<string>();
  const keys = new Set<string>();
  for (const p of layout) {
    const f = furnitureById(p.item);
    if (!f) return "Unknown item.";
    if (!p.key || p.key.length > 40 || keys.has(p.key)) return "Each item needs a unique key.";
    keys.add(p.key);
    if (!Number.isInteger(p.x) || !Number.isInteger(p.y)) return "Bad position.";
    if (p.x < ROOM.minX || p.y < ROOM.minY || p.x + f.w > ROOM.maxX || p.y + f.h > ROOM.maxY) return `${f.name} doesn't fit there.`;
    for (let y = p.y; y < p.y + f.h; y++)
      for (let x = p.x; x < p.x + f.w; x++) {
        const k = `${x},${y}`;
        if (!isFloorFurniture(f.id) && taken.has(k)) return `${f.name} overlaps something.`;
        if (!isFloorFurniture(f.id)) taken.add(k);
      }
  }
  // Keep a path in from the front door.
  for (const x of ROOM.door) if (taken.has(`${x},${ROOM.maxY - 1}`)) return "Keep the front door clear.";
  const reachable = new Set<string>(ROOM.door.map(x => `${x},${ROOM.maxY - 1}`));
  const queue = ROOM.door.map(x => [x, ROOM.maxY - 1]);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const key = `${nx},${ny}`;
      if (nx < ROOM.minX || nx >= ROOM.maxX || ny < ROOM.minY || ny >= ROOM.maxY || taken.has(key) || reachable.has(key)) continue;
      reachable.add(key); queue.push([nx, ny]);
    }
  }
  for (const p of layout) {
    const f = furnitureById(p.item)!;
    if (!isFloorFurniture(f.id) && !Array.from({ length: f.w }, (_, i) => `${p.x + i},${p.y + f.h}`).some(key => reachable.has(key))) return `Leave space in front of ${f.name}.`;
  }
  return null;
}
