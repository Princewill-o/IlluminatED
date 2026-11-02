import { adventurerFor } from "./adventurers";
import type { Avatar } from "./cosmetics";

export type StyleCollection = "London" | "Kent" | "Nottingham" | "Road crew" | "Signature";
type Archetype = "hero" | "knight" | "wizard" | "pirate" | "astronaut" | "robot" | "zombie" | "princess";
type ClothingSlot = "top" | "bottom" | "shoes" | "topColor" | "bottomColor" | "shoesColor" | "hat" | "face" | "held" | "cape" | "brand";

export interface CharacterStyle {
  id: string;
  name: string;
  collection: StyleCollection;
  description: string;
  /** A recommendation, never a restriction: every design fits every supplied rig. */
  archetypes: Archetype[];
  wear: Pick<Avatar, ClothingSlot>;
}

const design = (
  id: string, name: string, collection: StyleCollection, description: string,
  archetypes: Archetype[], garment: string, brand = "none", held = "none", face = "none", cape = "none",
): CharacterStyle => ({
  id, name, collection, description, archetypes,
  wear: {
    top: `top-blocky-${garment}`, bottom: "bottom-jeans", shoes: "shoes-trainers",
    topColor: "topcol-auto", bottomColor: "botcol-auto", shoesColor: "shoecol-auto",
    // None retains the model's original authored headwear, including helmets and crowns.
    hat: "hat-none", face: `face-${face}`, held: `held-${held}`, cape: `cape-${cape}`, brand: `brand-${brand}`,
  },
});

/** Original coordinated looks assembled from our real Blender garment collection. */
export const CHARACTER_STYLES: CharacterStyle[] = [
  design("city-commuter", "City Commuter", "London", "Midnight blazer, pale shirt and a coffee for the morning commute.", ["hero", "knight"], "business-navy", "thamesline", "coffee"),
  design("southbank-weekend", "Southbank Weekend", "London", "Coral tee, cream trim and dark trousers echo the Hero's warm colours.", ["hero", "pirate"], "casual-coral", "peckham", "phone"),
  design("camden-maker", "Camden Maker", "London", "Wisteria hoodie, soft lilac panels and a small Camden label.", ["wizard", "zombie"], "hoodie-lavender", "camden", "phone", "round"),
  design("thames-rain", "Thames Rain", "London", "Bluebird rain shell and backpack for an overcast riverside walk.", ["astronaut", "robot"], "raincoat-sky", "thamesline"),
  design("community-pharmacy", "Community Pharmacy", "London", "Mint clinical coat with teal pockets and round glasses.", ["wizard", "princess"], "pharmacy-teal", "none", "none", "round"),
  design("neighbourhood-kitchen", "Neighbourhood Kitchen", "London", "Coral chef jacket, pale apron and warm fabric details.", ["pirate", "hero"], "chef-coral", "peckham"),

  design("orchard-walk", "Orchard Walk", "Kent", "Sandstone trail vest, field pockets and earthy trousers.", ["pirate", "knight"], "explorer-sand", "northwind"),
  design("canterbury-reader", "Canterbury Reader", "Kent", "Ochre cardigan and satchel, with a coffee beside the cathedral square.", ["wizard", "princess"], "student-amber", "illuminated", "coffee", "round"),
  design("medway-workshop", "Medway Workshop", "Kent", "Lagoon utility panels and tool pockets suit a mechanical character.", ["robot", "knight"], "workwear-teal", "volt"),
  design("coastal-blue", "Coastal Blue", "Kent", "Bluebird tee and clean sky trim for a coastal day off.", ["astronaut", "hero"], "casual-sky", "thamesline", "phone"),
  design("garden-county", "Garden County", "Kent", "Evergreen shell, pale green trim and a fitted hiking backpack.", ["zombie", "pirate"], "raincoat-emerald", "northwind"),
  design("market-morning", "Market Morning", "Kent", "Sandstone chef layers and a cream apron for a town-market stall.", ["princess", "hero"], "chef-sand", "none", "coffee"),

  design("lace-market", "Lace Market", "Nottingham", "Graphite blazer, silver-grey shirt and a restrained original label.", ["knight", "robot"], "business-slate", "camden", "phone"),
  design("trent-studio", "Trent Studio", "Nottingham", "Rosewood cardigan, rose lining and a shoulder satchel for studio days.", ["princess", "wizard"], "student-rose", "camden", "phone"),
  design("forest-colours", "Forest Colours", "Nottingham", "Evergreen hoodie and light green panels pick up the Zombie's palette.", ["zombie", "pirate"], "hoodie-emerald", "northwind"),
  design("campus-late", "Campus Late", "Nottingham", "Wisteria study knit, lilac satchel and glasses for a late library visit.", ["wizard", "astronaut"], "student-lavender", "illuminated", "coffee", "round"),
  design("creative-workshop", "Creative Workshop", "Nottingham", "Coral utility jacket, cream panels and a warm independent label.", ["hero", "robot"], "workwear-coral", "peckham", "phone"),
  design("trent-training", "Trent Training", "Nottingham", "Bluebird athletic stripes and dark training layers for the riverside.", ["astronaut", "knight"], "sport-sky", "volt"),

  design("orbital-maintenance", "Orbital Maintenance", "Road crew", "Ochre utility panels with a bright Volt patch for the motorway crew.", ["robot", "astronaut"], "workwear-amber", "volt"),
  design("tunnel-inspector", "Tunnel Inspector", "Road crew", "Graphite rain shell, equipment pockets and pale grey trim.", ["knight", "zombie"], "raincoat-slate", "none", "phone"),
  design("night-response", "Night Response", "Road crew", "Midnight paramedic layers with the garment's reflective lime panels.", ["hero", "robot"], "paramedic-navy"),
  design("route-surveyor", "Route Surveyor", "Road crew", "Lagoon field vest, matching pockets and a navigation phone.", ["pirate", "wizard"], "explorer-teal", "northwind", "phone"),

  design("royal-city", "Royal City", "Signature", "Rosewood tailoring and a crimson cape carry the Princess into city life.", ["princess", "knight"], "business-rose", "none", "none", "none", "crimson"),
  design("orbit-off-duty", "Orbit Off Duty", "Signature", "Lagoon hoodie, Orbit badge and a blue cape complement futuristic faces.", ["astronaut", "robot", "zombie"], "hoodie-teal", "orbit", "none", "none", "sky"),
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
