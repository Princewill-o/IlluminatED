/** How Locker items map onto the Blender chibi kit (art/blender/chibi.py). */

/** Locker item -> Blender variant (and the colour of its second fabric). */
export const HAIR: Record<string, string | null> = {
  "hair-short": "short", "hair-curly": "curly", "hair-long": "long", "hair-bob": "bob", "hair-ponytail": "ponytail",
  "hair-buns": "buns", "hair-buzz": "buzz", "hair-bald": null, "hair-quiff": "quiff", "hair-braids": "braids",
  "hair-afro": "afro", "hair-spiky": "spiky", "hair-mohawk": "mohawk",
};
import { HEROES } from "./heroes";

export interface TopLook { v: string; second?: string; cape?: boolean; accent?: string; extras?: string[] }
export const TOP: Record<string, TopLook> = {
  "top-tee": { v: "tee" }, "top-hoodie": { v: "hoodie" }, "top-stripes": { v: "stripes", second: "#1d2a5c" },
  "top-polo": { v: "jersey", second: "#ffffff" }, "top-knit": { v: "long" }, "top-apron": { v: "apron", second: "#ffffff" },
  "top-denim": { v: "jacket", second: "#f3f3f3" }, "top-jersey": { v: "jersey", second: "#ffffff" },
  "top-suit": { v: "jacket", second: "#ffffff" }, "top-tux": { v: "jacket", second: "#ffffff" },
  "top-astronaut": { v: "suitspace", second: "#c9cbd6" }, "top-cape": { v: "tee", cape: true },
  "top-labcoat": { v: "coat", second: "#bfe3ff" }, "top-hivis": { v: "vest" }, "top-tracksuit": { v: "long" },
  "top-pumpkin": { v: "hoodie" }, "top-puffer": { v: "coat", second: "#c9d8ee" }, "top-varsity": { v: "jacket", second: "#ffffff" }, "top-festival": { v: "tee" },
};
// Lumen League suits: suit colour comes from the Locker item, trim and accent from the hero.
for (const h of HEROES)
  TOP[`top-hero-${h.id}`] = { v: "herosuit", second: h.colours.trim, accent: h.colours.accent, cape: h.cape, extras: [h.gear, `emblem-${h.emblem}`] };

export const BOTTOM: Record<string, string> = {
  "bottom-jeans": "trousers", "bottom-joggers": "joggers", "bottom-shorts": "shorts", "bottom-skirt": "skirt",
  "bottom-cargo": "cargo", "bottom-smart": "trousers", "bottom-tartan": "trousers",
};
export const SHOES: Record<string, string> = {
  "shoes-trainers": "trainers", "shoes-hightops": "hightops", "shoes-boots": "boots", "shoes-sliders": "sliders",
  "shoes-smart": "smart", "shoes-skates": "skates", "shoes-rocket": "rocket", "shoes-chunky": "chunky",
};

/** Back items -> Blender variant and their second fabric (straps, pocket, trim). */
export const BACK: Record<string, { v: string; second: string }> = {
  "back-school": { v: "backpack", second: "#ffcf4a" }, "back-mini": { v: "mini", second: "#ffffff" },
  "back-teddy": { v: "teddy", second: "#f2d9a6" }, "back-guitar": { v: "guitar", second: "#13203a" },
  "back-fairy": { v: "wings-fairy", second: "#ffffff" }, "back-bat": { v: "wings-bat", second: "#13203a" },
  "back-jetpack": { v: "jetpack", second: "#13203a" }, "back-angel": { v: "wings-angel", second: "#ffffff" },
};

/** Fictional labels for the chest logo. */
export const BRANDS: Record<string, { text: string; bg: string; fg: string; shape: "pill" | "circle" | "square" }> = {
  "brand-illuminated": { text: "iED", bg: "#5b56c8", fg: "#ffffff", shape: "circle" },
  "brand-volt": { text: "VOLT", bg: "#ffd60a", fg: "#111111", shape: "pill" },
  "brand-northwind": { text: "NW", bg: "#0f3d3e", fg: "#e9f5ef", shape: "square" },
  "brand-thamesline": { text: "THAMES", bg: "#1b4dd8", fg: "#ffffff", shape: "pill" },
  "brand-peckham": { text: "PS", bg: "#ff5d3a", fg: "#ffffff", shape: "circle" },
  "brand-camden": { text: "C&Co", bg: "#111111", fg: "#ff8fd1", shape: "square" },
  "brand-kowloon": { text: "KC", bg: "#c4433a", fg: "#ffd166", shape: "circle" },
  "brand-orbit": { text: "ORBIT", bg: "#ffffff", fg: "#24215e", shape: "pill" },
};

