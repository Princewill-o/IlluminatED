/**
 * How Locker items map onto the Kenney mini-character pieces rendered by
 * scripts/characters/build_kenney.py (assets/kenney, CC0). Every Kenney
 * character shares one rig, so heads, hair, tops, bottoms and shoes from
 * different characters can be mixed, and each piece is tinted at runtime.
 */

/** Hair style -> which Kenney head it comes from ("custom" = our own blocky hair sheet). */
export const HAIR_LOOK: Record<string, { head: string; hair: string | null }> = {
  "hair-short": { head: "male-a", hair: "kh-male-a-hair" },
  "hair-curly": { head: "male-e", hair: "kh-male-e-hair" },
  "hair-long": { head: "female-f", hair: "kh-female-f-hair" },
  "hair-bob": { head: "female-c", hair: "kh-female-c-hair" },
  "hair-ponytail": { head: "female-a", hair: "kh-female-a-hair" },
  "hair-buns": { head: "female-b", hair: "kh-female-b-hair" },
  "hair-buzz": { head: "male-f", hair: "kh-male-f-hair" },
  "hair-bald": { head: "male-b", hair: null },
  "hair-quiff": { head: "female-d", hair: "kh-female-d-hair" },
  "hair-braids": { head: "female-e", hair: "kh-female-e-hair" },
  "hair-afro": { head: "male-a", hair: "hair-afro" },
  "hair-spiky": { head: "male-d", hair: "kh-male-d-hair" },
  "hair-mohawk": { head: "male-a", hair: "hair-mohawk" },
};

/** Clothes -> the Kenney character whose top / bottom / shoes they use. */
export const TOP_LOOK: Record<string, string> = {
  "top-tee": "male-a",
  "top-hoodie": "male-f",
  "top-stripes": "female-b",
  "top-polo": "male-b",
  "top-knit": "female-a",
  "top-apron": "female-f",
  "top-denim": "female-e",
  "top-jersey": "male-c",
  "top-suit": "male-d",
  "top-tux": "male-d",
  "top-astronaut": "female-e",
  "top-cape": "male-a",
  "top-labcoat": "female-d",
  "top-hivis": "male-e",
  "top-tracksuit": "male-f",
};

export const BOTTOM_LOOK: Record<string, string> = {
  "bottom-jeans": "male-a",
  "bottom-joggers": "female-a",
  "bottom-shorts": "male-b",
  "bottom-skirt": "female-c",
  "bottom-cargo": "male-e",
  "bottom-smart": "male-d",
  "bottom-tartan": "female-f",
};

export const SHOES_LOOK: Record<string, string> = {
  "shoes-trainers": "male-a",
  "shoes-hightops": "female-b",
  "shoes-boots": "male-c",
  "shoes-sliders": "female-a",
  "shoes-smart": "male-d",
  "shoes-skates": "female-e",
  "shoes-rocket": "male-e",
};

/** Free colours you can dye any top, bottoms or shoes. */
export const DYES: [string, string, string][] = [
  ["navy", "Navy", "#1b2c48"],
  ["blue", "Blue", "#2b5fd9"],
  ["sky", "Sky", "#6bc6ff"],
  ["teal", "Teal", "#15987f"],
  ["green", "Green", "#4f9a46"],
  ["yellow", "Yellow", "#ffd166"],
  ["orange", "Orange", "#e98a1f"],
  ["red", "Red", "#c8322d"],
  ["pink", "Pink", "#ff8fd1"],
  ["purple", "Purple", "#7a5ce6"],
  ["white", "White", "#f3f6fb"],
  ["grey", "Grey", "#8d93a0"],
  ["black", "Black", "#1b1622"],
  ["beige", "Beige", "#e3cfa3"],
  ["brown", "Brown", "#7a4f32"],
];
