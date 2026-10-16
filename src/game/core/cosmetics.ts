import { DYES } from "./looks";

/**
 * The Locker: every way a character can look. 15 categories, 4 rarities, sets.
 * Prices, rarities and unlock rules here must match the cosmetic_items rows in
 * the games migrations (tests/game-core.test.mjs checks this).
 *
 * unlock: "ceo:<company>" | "level:<n>" | "streak:<n>". Price 0 and no unlock = free.
 * See docs/gamification/promotion-panic-design.md §5.
 */
export type Slot =
  | "skin"
  | "head"
  | "eyes"
  | "brows"
  | "mouth"
  | "extras"
  | "hair"
  | "hairColor"
  | "top"
  | "bottom"
  | "shoes"
  | "topColor"
  | "bottomColor"
  | "shoesColor"
  | "hat"
  | "face"
  | "held"
  | "pet";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Cosmetic {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  rarity: Rarity;
  unlock?: string;
  set?: string;
  /** Main colour used by the renderer. */
  color?: string;
}

type Extra = Partial<Pick<Cosmetic, "unlock" | "set" | "color">>;

const make =
  (rarity: Rarity) =>
  (id: string, slot: Slot, name: string, price = 0, extra: Extra = {}): Cosmetic => ({
    id,
    slot,
    name,
    price,
    rarity,
    ...extra,
  });
const C = make("common");
const R = make("rare");
const E = make("epic");
const L = make("legendary");

export const COSMETICS: Cosmetic[] = [
  // ── Body ───────────────────────────────────────────────
  C("skin-1", "skin", "Tone 1", 0, { color: "#fbe0cf" }),
  C("skin-2", "skin", "Tone 2", 0, { color: "#f1c09a" }),
  C("skin-7", "skin", "Tone 3", 0, { color: "#e3ac7c" }),
  C("skin-3", "skin", "Tone 4", 0, { color: "#d09460" }),
  C("skin-4", "skin", "Tone 5", 0, { color: "#b07548" }),
  C("skin-5", "skin", "Tone 6", 0, { color: "#8a5636" }),
  C("skin-6", "skin", "Tone 7", 0, { color: "#64402b" }),
  C("skin-8", "skin", "Tone 8", 0, { color: "#42291c" }),

  C("head-human", "head", "Human"),
  E("head-dog", "head", "Good-boy head", 1500, { color: "#c9a46b" }),
  E("head-cow", "head", "Moo head", 1500, { color: "#f3f6fb" }),
  L("head-robot", "head", "Robot head", 3000, { set: "space", color: "#b3abc4" }),
  L("head-alien", "head", "Alien head", 3000, { set: "space", color: "#8de08a" }),
  L("head-lion", "head", "Lion head", 0, { unlock: "streak:14", color: "#e39b2d" }),

  // ── Face ───────────────────────────────────────────────
  C("eyes-round", "eyes", "Round"),
  C("eyes-sparkle", "eyes", "Sparkle"),
  C("eyes-sleepy", "eyes", "Sleepy"),
  C("eyes-wink", "eyes", "Wink"),
  C("eyes-focused", "eyes", "Focused"),
  C("eyes-dots", "eyes", "Dots"),

  C("brows-soft", "brows", "Soft"),
  C("brows-bold", "brows", "Bold"),
  C("brows-raised", "brows", "Raised"),
  C("brows-fierce", "brows", "Fierce"),
  C("brows-none", "brows", "None"),

  C("mouth-smile", "mouth", "Smile"),
  C("mouth-grin", "mouth", "Grin"),
  C("mouth-laugh", "mouth", "Laugh"),
  C("mouth-smirk", "mouth", "Smirk"),
  C("mouth-cheeky", "mouth", "Cheeky"),
  C("mouth-small", "mouth", "Small"),

  C("extras-none", "extras", "None"),
  C("extras-freckles", "extras", "Freckles"),
  C("extras-rosy", "extras", "Rosy cheeks"),
  R("extras-star", "extras", "Star sticker", 200, { set: "party" }),
  R("extras-plaster", "extras", "Plaster", 200),
  E("extras-paint", "extras", "Face paint", 600, { set: "sporty" }),

  // ── Hair ───────────────────────────────────────────────
  C("hair-short", "hair", "Short"),
  C("hair-curly", "hair", "Curly"),
  C("hair-long", "hair", "Long"),
  C("hair-bob", "hair", "Bob"),
  C("hair-ponytail", "hair", "Ponytail"),
  C("hair-buns", "hair", "Space buns"),
  C("hair-buzz", "hair", "Buzz cut"),
  C("hair-bald", "hair", "Bald"),
  C("hair-quiff", "hair", "Quiff", 120),
  C("hair-braids", "hair", "Braids", 150),
  C("hair-afro", "hair", "Afro", 150),
  R("hair-spiky", "hair", "Anime spikes", 250),
  R("hair-mohawk", "hair", "Mohawk", 300),

  C("haircol-black", "hairColor", "Black", 0, { color: "#13203a" }),
  C("haircol-brown", "hairColor", "Brown", 0, { color: "#5a3824" }),
  C("haircol-blonde", "hairColor", "Blonde", 0, { color: "#e8c46a" }),
  C("haircol-ginger", "hairColor", "Ginger", 0, { color: "#c4622d" }),
  C("haircol-auburn", "hairColor", "Auburn", 0, { color: "#7d2e22" }),
  C("haircol-purple", "hairColor", "Purple", 120, { color: "#8fb4ff" }),
  C("haircol-blue", "hairColor", "Blue", 120, { color: "#4fa8ff" }),
  C("haircol-pink", "hairColor", "Pink", 120, { color: "#ff8fd1" }),
  C("haircol-green", "hairColor", "Green", 120, { color: "#5fd3a5" }),
  R("haircol-silver", "hairColor", "Silver", 250, { color: "#d8d4e0" }),

  // ── Clothes ────────────────────────────────────────────
  C("top-tee", "top", "IlluminatED tee", 0, { color: "#2d1b69" }),
  C("top-hoodie", "top", "Comfy hoodie", 0, { color: "#3a2d58" }),
  C("top-stripes", "top", "Stripy tee", 0, { color: "#f3f6fb" }),
  C("top-polo", "top", "Office polo", 100, { color: "#6bc6ff", set: "office" }),
  C("top-knit", "top", "Cosy knit", 150, { color: "#ff7a6b" }),
  C("top-apron", "top", "Baker's apron", 150, { color: "#f4efe6", set: "bake" }),
  R("top-denim", "top", "Denim jacket", 250, { color: "#4f74c4" }),
  R("top-jersey", "top", "Footy jersey", 250, { color: "#ff7a6b", set: "sporty" }),
  R("top-suit", "top", "Power suit", 400, { color: "#24203a", set: "office" }),
  E("top-tux", "top", "Red-carpet tux", 900, { color: "#0d1726", set: "royal" }),
  E("top-astronaut", "top", "Space suit", 1200, { color: "#e9e6f2", set: "space" }),
  L("top-cape", "top", "Cape of Productivity", 2500, { color: "#2b5fd9", set: "royal" }),
  L("top-labcoat", "top", "Dr Ow's lab coat", 0, { unlock: "ceo:st-plasters", color: "#ffffff", set: "st-plasters" }),
  L("top-hivis", "top", "Hi-vis of honour", 0, { unlock: "ceo:bodge", color: "#f2d9a6", set: "bodge" }),
  L("top-tracksuit", "top", "Psyke tracksuit", 0, { unlock: "ceo:psyke", color: "#6bc6ff", set: "psyke" }),

  C("bottom-jeans", "bottom", "Jeans", 0, { color: "#3c5a9a" }),
  C("bottom-joggers", "bottom", "Joggers", 0, { color: "#3a2d58", set: "sporty" }),
  C("bottom-shorts", "bottom", "Shorts", 0, { color: "#c9a46b" }),
  C("bottom-skirt", "bottom", "Pleated skirt", 0, { color: "#2d1b69" }),
  C("bottom-cargo", "bottom", "Cargo trousers", 100, { color: "#6b6b4a" }),
  R("bottom-smart", "bottom", "Smart trousers", 250, { color: "#24203a", set: "office" }),
  E("bottom-tartan", "bottom", "Tartan trousers", 700, { color: "#c4433a" }),

  C("shoes-trainers", "shoes", "Trainers", 0, { color: "#f3f6fb" }),
  C("shoes-hightops", "shoes", "High-tops", 0, { color: "#2b5fd9" }),
  C("shoes-boots", "shoes", "Boots", 100, { color: "#5a3824" }),
  C("shoes-sliders", "shoes", "Sliders and socks", 150, { color: "#13203a" }),
  R("shoes-smart", "shoes", "Smart shoes", 250, { color: "#13203a", set: "office" }),
  E("shoes-skates", "shoes", "Roller skates", 900, { color: "#ff8fd1", set: "party" }),
  L("shoes-rocket", "shoes", "Rocket boots", 3000, { color: "#b3abc4", set: "space" }),

  // ── Dyes: free colours for any top, bottoms or shoes ("auto" keeps the item's own colour)
  ...(["topColor", "bottomColor", "shoesColor"] as const).flatMap((slot) => {
    const prefix = { topColor: "topcol", bottomColor: "botcol", shoesColor: "shoecol" }[slot];
    return [C(`${prefix}-auto`, slot, "Original"), ...DYES.map(([id, name, color]) => C(`${prefix}-${id}`, slot, name, 0, { color }))];
  }),

  // ── Accessories ────────────────────────────────────────
  C("hat-none", "hat", "No hat"),
  C("hat-cap", "hat", "Cap", 0, { color: "#8fb4ff" }),
  C("hat-beanie", "hat", "Beanie", 100, { color: "#ff7a6b" }),
  C("hat-party", "hat", "Party hat", 150, { color: "#ffd166", set: "party" }),
  R("hat-headphones", "hat", "Headphones", 300, { color: "#13203a", set: "sporty" }),
  E("hat-tophat", "hat", "Tiny top hat", 800, { color: "#0d1726", set: "royal" }),
  L("hat-crown", "hat", "Crown", 2500, { color: "#ffd166", set: "royal" }),
  L("hat-hardhat", "hat", "Tesler hard hat", 0, { unlock: "ceo:tesler", color: "#ffd166", set: "tesler" }),
  L("hat-chef", "hat", "Gregz chef hat", 0, { unlock: "ceo:gregz", color: "#ffffff", set: "gregz" }),
  L("hat-explorer", "hat", "Explorer hat", 0, { unlock: "ceo:atlas", color: "#c9a46b", set: "atlas" }),
  E("hat-grad", "hat", "Graduation cap", 0, { unlock: "level:10", color: "#0d1726" }),
  R("hat-lion", "hat", "Tiggy ears", 0, { unlock: "streak:7", color: "#e39b2d" }),
  E("hat-halo", "hat", "Halo of good grades", 0, { unlock: "level:20", color: "#ffd166" }),

  C("face-none", "face", "Nothing"),
  C("face-round", "face", "Round glasses"),
  R("face-star", "face", "Star glasses", 250, { color: "#ff8fd1", set: "party" }),
  E("face-vr", "face", "VR visor", 600, { color: "#6bc6ff", set: "space" }),
  L("face-shades", "face", "Netflics shades", 0, { unlock: "ceo:netflics", set: "netflics" }),
  L("face-monocle", "face", "Judge's monocle", 0, { unlock: "ceo:lawz", set: "lawz" }),

  C("held-none", "held", "Empty hands"),
  C("held-coffee", "held", "Coffee", 0, { set: "office" }),
  C("held-phone", "held", "Phone", 0),
  C("held-croissant", "held", "Croissant", 120, { set: "bake" }),
  R("held-briefcase", "held", "Briefcase", 250, { set: "office" }),
  R("held-mic", "held", "Microphone", 300, { set: "party" }),
  L("held-laptop", "held", "Macrosoft laptop", 0, { unlock: "ceo:macrosoft", set: "macrosoft" }),
  L("held-trophy", "held", "Gold star trophy", 0, { unlock: "ceo:tiny-humans", set: "tiny-humans" }),
  E("held-compass", "held", "Golden compass", 0, { unlock: "level:15" }),

  C("pet-none", "pet", "No pet"),
  C("pet-hamster", "pet", "Hamster in charge", 150),
  R("pet-goldfish", "pet", "Office goldfish", 300, { set: "office" }),
  R("pet-cat", "pet", "Unimpressed cat", 400),
  E("pet-duck", "pet", "Debugging duck", 600),
  L("pet-dragon", "pet", "Tiny dragon", 3000, { set: "royal" }),
  E("pet-cub", "pet", "Tiggy cub", 0, { unlock: "level:5" }),
  L("pet-robot", "pet", "Goggle robot", 0, { unlock: "ceo:goggle", set: "goggle" }),
  L("pet-dog", "pet", "Barklays pup", 0, { unlock: "ceo:barklays", set: "barklays" }),
  L("pet-cow", "pet", "Tescow calf", 0, { unlock: "ceo:tescow", set: "tescow" }),
];

export const SETS: Record<string, string> = {
  office: "Office Hero",
  space: "Space Cadet",
  sporty: "Sporty",
  bake: "Bake Off",
  party: "Party Animal",
  royal: "Royalty",
};

export const RARITY: Record<Rarity, { label: string; mark: string; color: string }> = {
  common: { label: "Common", mark: "●", color: "#b3abc4" },
  rare: { label: "Rare", mark: "◆", color: "#6bc6ff" },
  epic: { label: "Epic", mark: "★", color: "#c49bff" },
  legendary: { label: "Legendary", mark: "♛", color: "#ffd166" },
};

export const cosmeticById = (id: string) => COSMETICS.find((x) => x.id === id);

export const isFree = (item: Cosmetic) => item.price === 0 && !item.unlock;

export type Avatar = Record<Slot, string>;

export const DEFAULT_AVATAR: Avatar = {
  skin: "skin-3",
  head: "head-human",
  eyes: "eyes-round",
  brows: "brows-soft",
  mouth: "mouth-smile",
  extras: "extras-none",
  hair: "hair-short",
  hairColor: "haircol-black",
  top: "top-tee",
  bottom: "bottom-jeans",
  shoes: "shoes-trainers",
  topColor: "topcol-auto",
  bottomColor: "botcol-auto",
  shoesColor: "shoecol-auto",
  hat: "hat-none",
  face: "face-none",
  held: "held-none",
  pet: "pet-none",
};

export const SLOT_GROUPS: { group: string; slots: { slot: Slot; label: string }[] }[] = [
  {
    group: "Body",
    slots: [
      { slot: "skin", label: "Skin" },
      { slot: "head", label: "Head" },
    ],
  },
  {
    group: "Face",
    slots: [
      { slot: "eyes", label: "Eyes" },
      { slot: "brows", label: "Brows" },
      { slot: "mouth", label: "Mouth" },
      { slot: "extras", label: "Extras" },
    ],
  },
  {
    group: "Hair",
    slots: [
      { slot: "hair", label: "Style" },
      { slot: "hairColor", label: "Colour" },
    ],
  },
  {
    group: "Clothes",
    slots: [
      { slot: "top", label: "Tops" },
      { slot: "topColor", label: "Top colour" },
      { slot: "bottom", label: "Bottoms" },
      { slot: "bottomColor", label: "Bottoms colour" },
      { slot: "shoes", label: "Shoes" },
      { slot: "shoesColor", label: "Shoe colour" },
    ],
  },
  {
    group: "Accessories",
    slots: [
      { slot: "hat", label: "Hats" },
      { slot: "face", label: "Eyewear" },
      { slot: "held", label: "In hand" },
    ],
  },
  { group: "Companion", slots: [{ slot: "pet", label: "Desk pet" }] },
];

export const SLOTS: { slot: Slot; label: string }[] = SLOT_GROUPS.flatMap((g) => g.slots);

/** Fills gaps and drops anything the player doesn't own. */
export function sanitiseAvatar(raw: unknown, owned: Set<string>): Avatar {
  const out = { ...DEFAULT_AVATAR };
  if (raw && typeof raw === "object") {
    for (const { slot } of SLOTS) {
      const id = (raw as Record<string, unknown>)[slot];
      const item = typeof id === "string" ? cosmeticById(id) : undefined;
      if (item && item.slot === slot && (isFree(item) || owned.has(item.id))) out[slot] = item.id;
    }
  }
  return out;
}

/** Builds a full avatar from a partial one (used for bosses and previews). */
export const look = (partial: Partial<Avatar>): Avatar => ({ ...DEFAULT_AVATAR, ...partial });

export function unlockLabel(unlock: string, companyName: (id: string) => string) {
  const [kind, value] = unlock.split(":");
  if (kind === "ceo") return `Become CEO at ${companyName(value)}`;
  if (kind === "level") return `Reach level ${value}`;
  if (kind === "streak") return `${value}-day streak`;
  return "Secret";
}
