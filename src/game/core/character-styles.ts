import { adventurerFor } from "./adventurers";
import type { Avatar } from "./cosmetics";

export type StyleCollection = "Everyday" | "School & college" | "Work" | "Weekend" | "Weather & sport";
type Archetype = "hero" | "knight" | "wizard" | "pirate" | "astronaut" | "robot" | "zombie" | "princess";
type ClothingSlot = "top" | "bottom" | "shoes" | "topColor" | "bottomColor" | "shoesColor" | "hat" | "face" | "held" | "cape" | "brand";

export interface CharacterStyle {
  id: string;
  name: string;
  collection: StyleCollection;
  description: string;
  /** Kept for older saves; outfit presets suit every character. */
  archetypes: Archetype[];
  wear: Pick<Avatar, ClothingSlot>;
}

/**
 * Ready-made outfits for the character kit. Every piece is free, so trying one on and saving it
 * always works. They change clothes only: your character, build, skin and hair stay yours.
 */
const outfit = (
  id: string, name: string, collection: StyleCollection, description: string,
  wear: Partial<Pick<Avatar, ClothingSlot>>,
): CharacterStyle => ({
  id, name, collection, description, archetypes: [],
  wear: {
    top: "top-tee", bottom: "bottom-jeans", shoes: "shoes-trainers",
    topColor: "topcol-auto", bottomColor: "botcol-auto", shoesColor: "shoecol-auto",
    hat: "hat-none", face: "face-none", held: "held-none", cape: "cape-none", brand: "brand-none",
    ...wear,
  },
});

export const CHARACTER_STYLES: CharacterStyle[] = [
  outfit("easy-tee", "Easy Tee", "Everyday", "Navy tee, blue jeans and white trainers.", { topColor: "topcol-navy", bottomColor: "botcol-blue", shoesColor: "shoecol-white" }),
  outfit("summer-dress", "Summer Dress", "Everyday", "A pink summer dress with white trainers.", { top: "top-dress", topColor: "topcol-pink", shoesColor: "shoecol-white" }),
  outfit("sunny-skirt", "Sunny Skirt", "Everyday", "Yellow tee, navy skirt and navy hi-tops.", { topColor: "topcol-yellow", bottom: "bottom-skirt", bottomColor: "botcol-navy", shoes: "shoes-hightops", shoesColor: "shoecol-navy" }),
  outfit("cosy-hoodie", "Cosy Hoodie", "Everyday", "Grey hoodie, black joggers and a coffee.", { top: "top-hoodie", topColor: "topcol-grey", bottom: "bottom-joggers", bottomColor: "botcol-black", held: "held-coffee" }),
  outfit("city-walk", "City Walk", "Everyday", "Sky-blue zip jacket over beige trousers.", { top: "top-blocky-sport-sky", bottom: "bottom-blocky-casual-sand", shoes: "shoes-blocky-casual-sand" }),

  outfit("first-lesson", "First Lesson", "School & college", "Navy jumper, grey trousers, round glasses.", { top: "top-blocky-student-navy", bottom: "bottom-joggers", bottomColor: "botcol-grey", shoes: "shoes-blocky-business-slate", face: "face-round" }),
  outfit("library-day", "Library Day", "School & college", "Lavender jumper with a navy skirt.", { top: "top-blocky-student-lavender", bottom: "bottom-skirt", bottomColor: "botcol-navy", shoesColor: "shoecol-black", held: "held-phone" }),
  outfit("lab-partner", "Lab Partner", "School & college", "Teal tee and joggers, ready for practicals.", { topColor: "topcol-teal", bottom: "bottom-joggers", bottomColor: "botcol-navy" }),
  outfit("open-evening", "Open Evening", "School & college", "Amber jumper, dark jeans and the IlluminatED badge.", { top: "top-blocky-student-amber", bottomColor: "botcol-navy", brand: "brand-illuminated" }),
  outfit("revision-night", "Revision Night", "School & college", "Purple hoodie, joggers and a late coffee.", { top: "top-hoodie", topColor: "topcol-purple", bottom: "bottom-joggers", bottomColor: "botcol-grey", held: "held-coffee" }),

  outfit("office-smart", "Office Smart", "Work", "Navy jacket, dark trousers and smart shoes.", { top: "top-blocky-business-navy", bottom: "bottom-blocky-business-navy", shoes: "shoes-blocky-business-navy", held: "held-phone" }),
  outfit("studio-creative", "Studio Creative", "Work", "Coral work jacket with a Camden label.", { top: "top-blocky-workwear-coral", bottom: "bottom-blocky-workwear-slate", shoes: "shoes-blocky-workwear-slate", brand: "brand-camden" }),
  outfit("kitchen-shift", "Kitchen Shift", "Work", "White chef top and dark trousers.", { top: "top-blocky-chef-sand", bottom: "bottom-blocky-chef-slate", shoes: "shoes-blocky-chef-slate" }),
  outfit("pharmacy-counter", "Pharmacy Counter", "Work", "Mint pharmacy top with round glasses.", { top: "top-blocky-pharmacy-teal", bottom: "bottom-blocky-pharmacy-navy", shoes: "shoes-blocky-pharmacy-navy", face: "face-round" }),
  outfit("site-visit", "Site Visit", "Work", "Amber work jacket, cargo trousers and boots.", { top: "top-blocky-workwear-amber", bottom: "bottom-blocky-workwear-amber", shoes: "shoes-blocky-workwear-amber" }),

  outfit("market-saturday", "Market Saturday", "Weekend", "Stripy tee, jeans and a cap.", { top: "top-stripes", bottomColor: "botcol-blue", hat: "hat-cap" }),
  outfit("park-picnic", "Park Picnic", "Weekend", "A teal dress and yellow trainers.", { top: "top-dress", topColor: "topcol-teal", shoesColor: "shoecol-yellow" }),
  outfit("gig-night", "Gig Night", "Weekend", "All-black hoodie and jeans with red hi-tops.", { top: "top-hoodie", topColor: "topcol-black", bottomColor: "botcol-black", shoes: "shoes-hightops", shoesColor: "shoecol-red" }),
  outfit("seaside-day", "Seaside Day", "Weekend", "Sky tee, beige shorts and white trainers.", { topColor: "topcol-sky", bottom: "bottom-shorts", bottomColor: "botcol-beige", shoesColor: "shoecol-white" }),
  outfit("hero-weekend", "Hero Weekend", "Weekend", "Red tee, navy jeans and a sky cape.", { topColor: "topcol-red", bottomColor: "botcol-navy", cape: "cape-sky" }),

  outfit("rainy-commute", "Rainy Commute", "Weather & sport", "Sky rain jacket for a wet London morning.", { top: "top-blocky-raincoat-sky", bottom: "bottom-blocky-raincoat-navy", shoes: "shoes-blocky-raincoat-navy" }),
  outfit("trail-walk", "Trail Walk", "Weather & sport", "Green outdoor jumper and cargo trousers.", { top: "top-blocky-explorer-emerald", bottom: "bottom-blocky-explorer-sand", shoes: "shoes-blocky-explorer-sand" }),
  outfit("five-a-side", "Five-a-side", "Weather & sport", "Coral track jacket, navy joggers and trainers.", { top: "top-blocky-sport-coral", bottom: "bottom-joggers", bottomColor: "botcol-navy", shoesColor: "shoecol-white" }),
  outfit("morning-run", "Morning Run", "Weather & sport", "Teal track top with black shorts.", { top: "top-blocky-sport-teal", bottom: "bottom-shorts", bottomColor: "botcol-black", shoesColor: "shoecol-teal" }),
];

export function characterArchetype(head?: string): string {
  // The new modular presets use the supplied Hero body proportions.
  if (head?.startsWith("head-preset-")) return "hero";
  return adventurerFor(head).id.replace("head-blocky-", "").replace("classic-", "");
}

/** Preserve the catalogue order within matched/unmatched groups, including classic rigs. */
export function stylesForCharacter(head?: string): CharacterStyle[] {
  const archetype = characterArchetype(head);
  return [...CHARACTER_STYLES].sort((a, b) =>
    Number(b.archetypes.some(item => item === archetype)) - Number(a.archetypes.some(item => item === archetype)),
  );
}

/** Try-on only: does not save, grant ownership, or replace identity/companion fields. */
export function applyCharacterStyle(avatar: Avatar, styleId: string): Avatar {
  const style = CHARACTER_STYLES.find(item => item.id === styleId);
  return style ? { ...avatar, ...style.wear } : { ...avatar };
}
