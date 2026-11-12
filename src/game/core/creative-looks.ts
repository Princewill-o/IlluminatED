import { BLENDER_PRESETS } from "./adventurers";
import { blockyOutfitFor, blockyPieceOutfit } from "./blocky-outfits";
import { cosmeticById, type Avatar } from "./cosmetics";
import { heroById } from "./heroes";
import { outfitColours } from "./outfits";

/**
 * Every character is built from one kit (public/world3d/creative-characters):
 * a rigged body, three faces, two haircuts, tops, bottoms, shoes, hats and
 * glasses, all sharing one gradient palette so any piece can be dyed.
 * This file only decides which kit pieces and colours an avatar wears.
 */
export const CREATIVE_KIT = "/world3d/creative-characters/creative-kit.glb";
/** Pre-rendered pictures of characters (by head id) and outfits (by outfit id) for the Locker. */
export const kitThumb = (id: string) => `/world3d/creative-characters/thumbs/${id}.webp`;

export type KitTop = "T_Shirt_009" | "Outerwear_029" | "Outerwear_036";
export type KitBottom = "Pants_010" | "Pants_014" | "Shorts_003";
export type KitShoes = "Shoe_Sneakers_009" | "Shoe_Slippers_002" | "Shoe_Slippers_005";
export type KitHair = "Hairstyle_male_010" | "Hairstyle_male_012";
export type KitFace = "Male_emotion_usual_001" | "Male_emotion_happy_002" | "Male_emotion_angry_003";
/** Extra hair shapes built on top of (or instead of) a kit haircut. */
export type HairExtra = "long" | "bob" | "ponytail" | "buns" | "braids" | "afro" | "spiky" | "mohawk";

export interface KitLook {
  skin: string;
  face: KitFace;
  hair: KitHair | null;
  hairExtra: HairExtra | null;
  hairColour: string;
  top: { mesh: KitTop; colour: string };
  bottom: { mesh: KitBottom; colour: string };
  shoes: { mesh: KitShoes; colour: string };
  /** Long socks show with shorts and sliders. */
  socks: string | null;
  /** Kit-made headwear and glasses; anything else is drawn by accessories3d. */
  kitHat: "Hat_010" | "Hat_057" | "Headphones_002" | null;
  kitGlasses: "Glasses_004" | "Glasses_006" | null;
  gloves: string | null;
  moustache: "Moustache_001" | "Moustache_002" | null;
  /** A cape behind the shoulders, in this colour. */
  cape: string | null;
  /** A round chest emblem (hero suits). */
  emblem: { letter: string; bg: string; fg: string } | null;
}

/** Which kit garment each Blender outfit family turns into. */
const FAMILY: Record<string, [KitTop, KitBottom, KitShoes]> = {
  casual: ["T_Shirt_009", "Pants_010", "Shoe_Sneakers_009"],
  hoodie: ["Outerwear_036", "Pants_014", "Shoe_Sneakers_009"],
  business: ["Outerwear_029", "Pants_014", "Shoe_Slippers_005"],
  workwear: ["Outerwear_029", "Pants_010", "Shoe_Slippers_005"],
  sport: ["Outerwear_029", "Pants_014", "Shoe_Sneakers_009"],
  police: ["Outerwear_029", "Pants_014", "Shoe_Slippers_005"],
  pharmacy: ["T_Shirt_009", "Pants_014", "Shoe_Slippers_002"],
  paramedic: ["Outerwear_029", "Pants_010", "Shoe_Slippers_005"],
  chef: ["T_Shirt_009", "Pants_010", "Shoe_Slippers_002"],
  student: ["Outerwear_036", "Pants_014", "Shoe_Sneakers_009"],
  raincoat: ["Outerwear_029", "Pants_010", "Shoe_Slippers_002"],
  explorer: ["Outerwear_036", "Pants_010", "Shoe_Slippers_005"],
};

const CLASSIC_TOPS: Record<string, KitTop> = {
  "top-tee": "T_Shirt_009", "top-hoodie": "Outerwear_036", "top-stripes": "T_Shirt_009", "top-polo": "T_Shirt_009",
  "top-knit": "Outerwear_036", "top-apron": "T_Shirt_009", "top-denim": "Outerwear_029", "top-jersey": "T_Shirt_009",
  "top-suit": "Outerwear_029", "top-tux": "Outerwear_029", "top-astronaut": "Outerwear_029", "top-cape": "T_Shirt_009",
  "top-labcoat": "Outerwear_029", "top-hivis": "Outerwear_029", "top-tracksuit": "Outerwear_029",
};
const CLASSIC_BOTTOMS: Record<string, KitBottom> = {
  "bottom-jeans": "Pants_010", "bottom-joggers": "Pants_014", "bottom-shorts": "Shorts_003", "bottom-skirt": "Shorts_003",
  "bottom-cargo": "Pants_010", "bottom-smart": "Pants_014", "bottom-tartan": "Pants_010",
};
const CLASSIC_SHOES: Record<string, KitShoes> = {
  "shoes-trainers": "Shoe_Sneakers_009", "shoes-hightops": "Shoe_Sneakers_009", "shoes-boots": "Shoe_Slippers_005",
  "shoes-sliders": "Shoe_Slippers_002", "shoes-smart": "Shoe_Slippers_005", "shoes-skates": "Shoe_Sneakers_009", "shoes-rocket": "Shoe_Sneakers_009",
};

const HAIR: Record<string, [KitHair | null, HairExtra | null]> = {
  "hair-short": ["Hairstyle_male_012", null], "hair-curly": ["Hairstyle_male_010", null], "hair-quiff": ["Hairstyle_male_010", null],
  "hair-long": ["Hairstyle_male_012", "long"], "hair-bob": ["Hairstyle_male_012", "bob"], "hair-ponytail": ["Hairstyle_male_012", "ponytail"],
  "hair-buns": ["Hairstyle_male_012", "buns"], "hair-braids": ["Hairstyle_male_010", "braids"], "hair-afro": [null, "afro"],
  "hair-spiky": ["Hairstyle_male_012", "spiky"], "hair-mohawk": [null, "mohawk"], "hair-buzz": [null, null], "hair-bald": [null, null],
};

/** Helmets for the costume characters that used to wear one. */
const HELMET_HEADS = /knight|astronaut|robot/;

export function kitLook(a: Avatar): KitLook {
  const colours = outfitColours(a);
  const set = blockyOutfitFor(a.top);
  const hero = a.top.startsWith("top-hero-");
  const top: KitTop = set ? FAMILY[set.family]?.[0] ?? "T_Shirt_009" : hero ? "Outerwear_029" : CLASSIC_TOPS[a.top] ?? "T_Shirt_009";
  const bottomSet = blockyPieceOutfit(a.bottom);
  const bottom: KitBottom = bottomSet ? FAMILY[bottomSet.family]?.[1] ?? "Pants_010" : CLASSIC_BOTTOMS[a.bottom] ?? "Pants_010";
  const shoeSet = blockyPieceOutfit(a.shoes);
  const shoes: KitShoes = shoeSet ? FAMILY[shoeSet.family]?.[2] ?? "Shoe_Sneakers_009" : CLASSIC_SHOES[a.shoes] ?? "Shoe_Sneakers_009";
  const [hair, hairExtra] = HAIR[a.hair] ?? HAIR["hair-short"];
  const heroLook = hero ? heroById(a.top.slice(9)) : undefined;
  const helmet = HELMET_HEADS.test(a.head) || a.top === "top-astronaut" || heroLook?.gear === "goggles" || heroLook?.gear === "flaskhelm";
  const kitHat = helmet ? "Hat_057" : a.hat === "hat-explorer" ? "Hat_010" : a.hat === "hat-headphones" ? "Headphones_002" : null;
  const visor = heroLook && ["visor", "pixelvisor", "mask"].includes(heroLook.gear);
  const face: KitFace = a.brows === "brows-fierce" ? "Male_emotion_angry_003"
    : ["mouth-grin", "mouth-laugh", "mouth-cheeky"].includes(a.mouth) || a.eyes === "eyes-sparkle" ? "Male_emotion_happy_002" : "Male_emotion_usual_001";
  return {
    skin: colours.skin,
    face,
    // A helmet covers the hair completely.
    hair: kitHat === "Hat_057" ? null : hair,
    hairExtra: kitHat === "Hat_057" ? null : hairExtra,
    hairColour: colours.hair,
    top: { mesh: top, colour: heroLook?.colours.suit ?? colours.top },
    // A hero suit is one colour head to toe, with trim-coloured gloves and boots in the accent.
    bottom: { mesh: hero ? "Pants_014" : bottom, colour: heroLook?.colours.suit ?? colours.bottom },
    shoes: { mesh: hero ? "Shoe_Sneakers_009" : shoes, colour: heroLook?.colours.accent ?? colours.shoes },
    socks: a.shoes === "shoes-sliders" ? "#f3f6fb" : null,
    kitHat,
    kitGlasses: visor || a.face === "face-shades" ? "Glasses_004" : a.face === "face-round" ? "Glasses_006" : null,
    gloves: heroLook ? heroLook.colours.trim : null,
    moustache: /^head-preset-\d*[05]$/.test(a.head) || /pirate/.test(a.head) ? "Moustache_002" : null,
    cape: a.cape !== "cape-none" ? cosmeticById(a.cape)?.color ?? null : heroLook?.cape ? heroLook.colours.accent : a.top === "top-cape" ? colours.top : null,
    emblem: heroLook ? { letter: heroLook.name.replace(/^Captain /, "").charAt(0), bg: heroLook.colours.trim, fg: heroLook.colours.accent } : null,
  };
}

/** Everyday residents: a stable, varied look for resident number i. */
const SKINS = ["skin-1", "skin-2", "skin-7", "skin-3", "skin-4", "skin-5", "skin-6", "skin-8"];
const HAIRS = ["hair-short", "hair-curly", "hair-long", "hair-bob", "hair-ponytail", "hair-buzz", "hair-afro", "hair-braids", "hair-quiff", "hair-buns", "hair-bald"];
const HAIR_COLOURS = ["haircol-black", "haircol-brown", "haircol-blonde", "haircol-ginger", "haircol-auburn", "haircol-black", "haircol-brown"];
const EVERYDAY_FAMILIES = ["casual", "hoodie", "business", "sport", "student", "explorer", "casual", "hoodie"];
const PALETTES = ["navy", "teal", "emerald", "coral", "amber", "lavender", "sky", "rose", "sand", "slate"];
export function residentLook(i: number): Partial<Avatar> {
  const n = Math.abs(Math.floor(i));
  const pick = <T,>(list: T[], salt: number) => list[(n * 7 + salt * 13 + Math.floor(n / list.length) * salt) % list.length];
  const family = pick(EVERYDAY_FAMILIES, 1), palette = pick(PALETTES, 2), legs = pick(PALETTES, 3), feet = pick(PALETTES, 5);
  const id = (slot: string, p: string) => `${slot}-blocky-${family}-${p}`;
  const has = (key: string) => Boolean(cosmeticById(key));
  return {
    skin: pick(SKINS, 4), hair: pick(HAIRS, 6), hairColor: pick(HAIR_COLOURS, 8),
    mouth: n % 3 === 0 ? "mouth-grin" : "mouth-smile",
    top: has(id("top", palette)) ? id("top", palette) : "top-tee",
    bottom: has(id("bottom", legs)) ? id("bottom", legs) : "bottom-jeans",
    shoes: has(id("shoes", feet)) ? id("shoes", feet) : "shoes-trainers",
    face: n % 9 === 4 ? "face-round" : "face-none",
    // Trousers in everyday colours rather than all-dark uniform pairs.
    bottomColor: `botcol-${pick(["navy", "blue", "grey", "black", "beige", "brown", "teal", "navy", "sky"], 9)}`,
    head: n % 17 === 5 ? "head-preset-010" : "head-blocky-hero",
  };
}

/** Free skin and hair that best match a hex skin tone and a preset's hairstyle name. */
const SKIN_IDS = ["skin-1", "skin-2", "skin-7", "skin-3", "skin-4", "skin-5", "skin-6", "skin-8"];
const PRESET_HAIR: Record<string, string> = {
  Quiff: "hair-short", Curls: "hair-curly", Ponytail: "hair-ponytail", Braids: "hair-long", Bob: "hair-bob",
  Cap: "hair-short", Beanie: "hair-buzz", Headphones: "hair-curly", Coils: "hair-curly", Bun: "hair-buns",
};
const FREE_HAIR_COLOURS = ["haircol-black", "haircol-brown", "haircol-blonde", "haircol-ginger", "haircol-auburn"];
/** The six original characters, re-drawn on the new kit with free pieces only. */
const CHARACTER_PRESETS: Record<string, Partial<Avatar>> = {
  hero: { skin: "skin-3", hair: "hair-short", hairColor: "haircol-black", mouth: "mouth-smile" },
  knight: { skin: "skin-2", hair: "hair-short", hairColor: "haircol-brown", topColor: "topcol-grey", bottomColor: "botcol-grey" },
  wizard: { skin: "skin-1", hair: "hair-long", hairColor: "haircol-auburn", topColor: "topcol-purple", bottomColor: "botcol-navy" },
  pirate: { skin: "skin-5", hair: "hair-curly", hairColor: "haircol-black", topColor: "topcol-red", bottomColor: "botcol-black" },
  astronaut: { skin: "skin-7", hair: "hair-buzz", hairColor: "haircol-black", topColor: "topcol-white", bottomColor: "botcol-white" },
  robot: { skin: "skin-4", hair: "hair-bald", hairColor: "haircol-black", topColor: "topcol-grey", bottomColor: "botcol-black" },
  zombie: { skin: "skin-6", hair: "hair-curly", hairColor: "haircol-brown", topColor: "topcol-green", bottomColor: "botcol-brown", brows: "brows-fierce" },
  princess: { skin: "skin-8", hair: "hair-buns", hairColor: "haircol-black", topColor: "topcol-teal", bottomColor: "botcol-teal", mouth: "mouth-grin" },
};
/**
 * What picking a character in the Locker sets: skin tone, hair and colours. Characters are a
 * quick starting point; every piece can still be changed separately afterwards.
 */
export function characterPreset(head: string): Partial<Avatar> {
  const preset = BLENDER_PRESETS.find((p) => p.id === head);
  if (preset) {
    const n = Number(head.replace(/\D/g, "")) || 0;
    const tone = ["#fbe0cf", "#f1c09a", "#e3ac7c", "#d09460", "#b07548", "#8a5636", "#64402b", "#42291c"].indexOf(preset.skinTone.toLowerCase());
    return { skin: SKIN_IDS[Math.max(0, tone)], hair: PRESET_HAIR[preset.hair] ?? "hair-short", hairColor: FREE_HAIR_COLOURS[n % FREE_HAIR_COLOURS.length], top: preset.outfit, mouth: n % 3 ? "mouth-smile" : "mouth-grin" };
  }
  const key = Object.keys(CHARACTER_PRESETS).find((k) => head.includes(k));
  return key ? CHARACTER_PRESETS[key] : {};
}
