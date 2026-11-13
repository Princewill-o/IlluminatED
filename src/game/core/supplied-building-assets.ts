/** Select standalone user-supplied buildings; never overlay an entire city scene. */
export function suppliedCityBuilding(t: { id: string; companyId?: string; style?: string; x?: number; y?: number }) {
  if (t.id === "mcdonalds") return "restaurant";
  if (t.companyId === "psyke") return "sports-store";
  if (t.id === "starbucks" || t.id === "district-wharf-cafe") return "coffee-shop";
  if (t.companyId === "macrosoft") return "modern-office";
  // Distinctive landmarks along the wharf and in the City use the supplied low-poly models.
  if (t.id === "district-boathouse") return "orange-building";
  if (t.id === "district-wharf-gallery") return "white-building";
  if (t.id === "study-club") return "sports-centre";
  return null;
}
const seedOf = (id: string) => Array.from(id).reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 0);
/** Quaternius' Downtown City MegaKit (CC0, itch.io): brick apartment blocks for unnamed city-centre plots. */
export const downtownAsset = (name: string) => `/world3d/downtown/${name}.glb`;
/** Named landmarks that use a downtown block instead of their old model. */
export const DOWNTOWN_LANDMARKS: Record<string, string> = {};
export function downtownBuildingAsset(t: { id: string; style?: string; label?: string; companyId?: string }) {
  if (DOWNTOWN_LANDMARKS[t.id]) return downtownAsset(DOWNTOWN_LANDMARKS[t.id]);
  if (t.label || t.companyId || !t.id.startsWith("b-") || !["terrace", "brick", "stone"].includes(t.style ?? "")) return null;
  const seed = seedOf(t.id);
  if (seed % 3 !== 1) return null;
  return downtownAsset(seed % 2 ? "building-small" : "building-medium");
}
export const voxelOfficeAsset = (name: string) => `/world3d/voxel-office/${name}.glb`;
/** Deterministic furniture families make employers visually distinct without changing collisions. */
export function voxelOfficePalette(id: string, theme?: string) {
  const warm = theme === "finance" || theme === "creative" || theme === "hospitality";
  return {
    desk: voxelOfficeAsset(warm ? "desk-brown" : "desk-white"),
    chair: voxelOfficeAsset(theme === "science" ? "chair-white" : warm ? "chair-brown" : "chair-black"),
    computer: voxelOfficeAsset((Array.from(id).reduce((n,c)=>n+c.charCodeAt(0),0)%2) ? "computer-a" : "computer-b"),
    meeting: voxelOfficeAsset("meeting-table"),
    coffee: voxelOfficeAsset("coffee-table"),
  };
}

/** The supplied LowPoly City kit: shopfronts, flats, houses and civic buildings with their own signs. */
export const lowpolyCityAsset = (name: string) => `/world3d/lowpoly-city/${name}.glb`;
/** Named places that get a matching building from the kit (each model's own sign matches the place). */
export const LOWPOLY_LANDMARKS: Record<string, string> = {
  "district-bank": "bank",
  "city-hospital": "hospital",
  "hotel-0": "hotel",
  "hotel-1": "hotel",
  "b-19": "restaurant",
  "neighbourhood-24": "restaurant",
  "b-33": "travel-agency",
  "b-28": "business-centre",
  "b-59": "supermarket-a",
  "neighbourhood-15": "supermarket-b",
  "neighbourhood-39": "supermarket-b",
  "neighbourhood-22": "police-station",
  "neighbourhood-30": "school",
  "neighbourhood-37": "post-office",
  "neighbourhood-3": "petrol-station",
};
const CENTRE_BLOCKS = ["flats-a", "flats-b", "flats-c", "antiques", "boutique", "music-shop", "watches", "florist", "business-centre", "flats-a", "tower-b"];
const CENTRE_SHOPS = ["boutique", "music-shop", "watches", "florist", "antiques"];
const HOUSES = ["house-01", "house-02", "house-03", "house-04", "house-05", "house-06", "house-08", "house-10"];
/**
 * Which kit building a plot uses, if any. Named places in LOWPOLY_LANDMARKS always do; unnamed
 * city-centre blocks and neighbourhood homes mostly do, leaving room for the other kits so streets
 * stay varied. `taken` is true when another kit (crayon or downtown) already claimed the plot.
 */
export function lowpolyCityBuilding(t: { id: string; style?: string; label?: string; companyId?: string }, taken = false) {
  if (LOWPOLY_LANDMARKS[t.id]) return lowpolyCityAsset(LOWPOLY_LANDMARKS[t.id]);
  if (taken || t.label || t.companyId) return null;
  const seed = seedOf(t.id);
  // Neighbouring plots have near-identical ids, so mix the seed before picking a model.
  const mix = (Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0) ^ (Math.imul(seed, 0x9e3779b1) >>> 13);
  const pick = <T,>(list: T[]) => list[(mix >>> 0) % list.length];
  if (t.id.startsWith("b-")) {
    if (t.style === "shop") return lowpolyCityAsset(pick(CENTRE_SHOPS));
    if (seed % 3 === 1) return null; // a downtown brick block
    return lowpolyCityAsset(pick(CENTRE_BLOCKS));
  }
  if (t.id.startsWith("neighbourhood-") && t.style === "terrace" && seed % 4 !== 0) return lowpolyCityAsset(pick(HOUSES));
  return null;
}
