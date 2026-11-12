/** Select standalone user-supplied buildings; never overlay an entire city scene. */
export function suppliedCityBuilding(t: { id: string; companyId?: string; style?: string; x?: number; y?: number }) {
  if (t.id === "mcdonalds") return "restaurant";
  if (t.companyId === "psyke") return "sports-store";
  if (t.id === "starbucks" || t.id === "district-wharf-cafe") return "coffee-shop";
  if (t.companyId === "macrosoft") return "modern-office";
  // Distinctive landmarks along the wharf and in the City use the supplied low-poly models.
  if (t.id === "district-boathouse") return "orange-building";
  if (t.id === "district-bank") return "grey-building";
  if (t.id === "district-wharf-gallery") return "white-building";
  if (t.id === "study-club") return "sports-centre";
  return null;
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
