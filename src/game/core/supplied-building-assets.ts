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
export const DOWNTOWN_LANDMARKS: Record<string, string> = { "district-bank": "building-medium" };
export function downtownBuildingAsset(t: { id: string; style?: string; label?: string; companyId?: string }) {
  if (DOWNTOWN_LANDMARKS[t.id]) return downtownAsset(DOWNTOWN_LANDMARKS[t.id]);
  if (t.label || t.companyId || !t.id.startsWith("b-") || !["terrace", "brick", "stone"].includes(t.style ?? "")) return null;
  const seed = seedOf(t.id);
  if (seed % 3 === 0) return null;
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
