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
];

export interface Furniture {
  id: string;
  name: string;
  price: number;
  /** Footprint in tiles. */
  w: number;
  h: number;
  /** Opens a page when you walk up to it. */
  link?: { href: string; label: string };
  /** Included free with every home. */
  starter?: boolean;
}

export const FURNITURE: Furniture[] = [
  { id: "bed", name: "Double bed", price: 0, w: 4, h: 4, starter: true },
  { id: "wardrobe", name: "Wardrobe", price: 0, w: 3, h: 1, starter: true, link: { href: "/games/locker", label: "Wardrobe: change your look" } },
  { id: "shelf", name: "Bookshelf", price: 0, w: 3, h: 1, starter: true, link: { href: "/revision", label: "Bookshelf: revision notes" } },
  { id: "desk", name: "Revision desk", price: 0, w: 4, h: 2, starter: true, link: { href: "/learn", label: "Revision desk" } },
  { id: "tv", name: "TV", price: 0, w: 4, h: 1, starter: true, link: { href: "/games", label: "TV: play Promotion Panic" } },
  { id: "sofa", name: "Sofa", price: 0, w: 4, h: 2, starter: true },
  { id: "table", name: "Coffee table", price: 0, w: 3, h: 2, starter: true },
  { id: "petbed", name: "Pet bed", price: 0, w: 2, h: 2, starter: true },
  { id: "plant", name: "Pot plant", price: 0, w: 1, h: 1, starter: true },
  { id: "lamp", name: "Floor lamp", price: 0, w: 1, h: 1, starter: true },
  { id: "armchair", name: "Armchair", price: 300, w: 2, h: 2 },
  { id: "beanbag", name: "Beanbag", price: 250, w: 2, h: 2 },
  { id: "rug", name: "Round rug", price: 200, w: 3, h: 3 },
  { id: "fridge", name: "Fridge", price: 500, w: 2, h: 1 },
  { id: "fishtank", name: "Fish tank", price: 800, w: 3, h: 1 },
  { id: "gaming", name: "Gaming setup", price: 900, w: 3, h: 2, link: { href: "/games/world", label: "Gaming setup: Worlds" } },
  { id: "telescope", name: "Telescope", price: 1200, w: 1, h: 1 },
  { id: "trophies", name: "Trophy cabinet", price: 1500, w: 3, h: 1, link: { href: "/games/careers", label: "Trophy cabinet: your career" } },
  { id: "piano", name: "Piano", price: 2500, w: 3, h: 2 },
  { id: "arcade", name: "Arcade machine", price: 3000, w: 2, h: 1, link: { href: "/games", label: "Arcade: Promotion Panic" } },
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
  { key: "plant-1", item: "plant", x: 1, y: 7 },
  { key: "plant-2", item: "plant", x: 18, y: 5 },
  { key: "lamp", item: "lamp", x: 5, y: 2 },
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

/** Is a layout valid: inside the room, no overlaps, door clear? */
export function validLayout(layout: Placed[]): string | null {
  if (layout.length > ROOM.maxItems) return "Too many things in one room.";
  const taken = new Set<string>();
  for (const p of layout) {
    const f = furnitureById(p.item);
    if (!f) return "Unknown item.";
    if (!Number.isInteger(p.x) || !Number.isInteger(p.y)) return "Bad position.";
    if (p.x < ROOM.minX || p.y < ROOM.minY || p.x + f.w > ROOM.maxX || p.y + f.h > ROOM.maxY) return `${f.name} doesn't fit there.`;
    for (let y = p.y; y < p.y + f.h; y++)
      for (let x = p.x; x < p.x + f.w; x++) {
        const k = `${x},${y}`;
        if (f.id !== "rug" && taken.has(k)) return `${f.name} overlaps something.`;
        if (f.id !== "rug") taken.add(k);
      }
  }
  // Keep a path in from the front door.
  for (const x of ROOM.door) if (taken.has(`${x},${ROOM.maxY - 1}`)) return "Keep the front door clear.";
  return null;
}
