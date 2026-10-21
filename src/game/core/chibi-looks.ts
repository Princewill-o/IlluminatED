/** How Locker items map onto the Blender chibi kit (art/blender/chibi.py). */

/** Locker item -> Blender variant (and the colour of its second fabric). */
export const HAIR: Record<string, string | null> = {
  "hair-short": "short", "hair-curly": "curly", "hair-long": "long", "hair-bob": "bob", "hair-ponytail": "ponytail",
  "hair-buns": "buns", "hair-buzz": "buzz", "hair-bald": null, "hair-quiff": "quiff", "hair-braids": "braids",
  "hair-afro": "afro", "hair-spiky": "spiky", "hair-mohawk": "mohawk",
};
export const TOP: Record<string, { v: string; second?: string; cape?: boolean }> = {
  "top-tee": { v: "tee" }, "top-hoodie": { v: "hoodie" }, "top-stripes": { v: "stripes", second: "#1d2a5c" },
  "top-polo": { v: "jersey", second: "#ffffff" }, "top-knit": { v: "long" }, "top-apron": { v: "apron", second: "#ffffff" },
  "top-denim": { v: "jacket", second: "#f3f3f3" }, "top-jersey": { v: "jersey", second: "#ffffff" },
  "top-suit": { v: "jacket", second: "#ffffff" }, "top-tux": { v: "jacket", second: "#ffffff" },
  "top-astronaut": { v: "suitspace", second: "#c9cbd6" }, "top-cape": { v: "tee", cape: true },
  "top-labcoat": { v: "coat", second: "#bfe3ff" }, "top-hivis": { v: "vest" }, "top-tracksuit": { v: "long" },
};
export const BOTTOM: Record<string, string> = {
  "bottom-jeans": "trousers", "bottom-joggers": "joggers", "bottom-shorts": "shorts", "bottom-skirt": "skirt",
  "bottom-cargo": "cargo", "bottom-smart": "trousers", "bottom-tartan": "trousers",
};
export const SHOES: Record<string, string> = {
  "shoes-trainers": "trainers", "shoes-hightops": "hightops", "shoes-boots": "boots", "shoes-sliders": "sliders",
  "shoes-smart": "smart", "shoes-skates": "skates", "shoes-rocket": "rocket",
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

