import { type Avatar, cosmeticById, look } from "./cosmetics";
import { BOTTOM_LOOK, HAIR_LOOK, SHOES_LOOK, TOP_LOOK } from "./looks";

/** A work uniform changes the rendered outfit, never the saved wardrobe. */
export function applyUniform(avatar: Avatar, uniform: Partial<Avatar>): Avatar {
  const dressed = { ...avatar, ...uniform };
  for (const [item, dye, original] of [
    ["top", "topColor", "topcol-auto"],
    ["bottom", "bottomColor", "botcol-auto"],
    ["shoes", "shoesColor", "shoecol-auto"],
  ] as const) {
    if (uniform[item] && !uniform[dye]) dressed[dye] = original;
  }
  return look(dressed);
}

const dyed = (item: string | undefined, dye: string | undefined) =>
  (dye && !dye.endsWith("-auto") ? cosmeticById(dye)?.color : undefined) ?? cosmeticById(item ?? "")?.color ?? "#8d93a0";

/** Both the sprites and 3D model use these exact wardrobe colours and sources. */
export const outfitColours = (a: Avatar) => ({
  skin: cosmeticById(a.skin)?.color ?? "#d09460",
  hair: cosmeticById(a.hairColor)?.color ?? "#13203a",
  top: dyed(a.top, a.topColor),
  bottom: dyed(a.bottom, a.bottomColor),
  shoes: dyed(a.shoes, a.shoesColor),
});

export const outfitVariants = (a: Avatar) => ({
  head: HAIR_LOOK[a.hair]?.head ?? "male-a",
  top: TOP_LOOK[a.top] ?? "male-a",
  bottom: BOTTOM_LOOK[a.bottom] ?? "male-a",
  shoes: SHOES_LOOK[a.shoes] ?? "male-a",
});

/** Kenney's skin swatches are in a fixed UV row; orange/red cloth is elsewhere. */
export const paletteCell = (u: number, v: number): [number, number] => [
  Math.min(15, Math.max(0, Math.floor(u * 16))),
  Math.min(3, Math.max(0, Math.floor(v * 4))),
];
export const isSkinTexel = (u: number, v: number) => {
  const [x, y] = paletteCell(u, v);
  return y === 3 && x >= 10;
};

export type OutfitPiece = "top" | "bottom" | "shoes";
/** Interpret source skin by garment coverage, rather than copying a crop top or torn jeans. */
export function garmentSurface(piece: OutfitPiece, bone: string, skinTexel: boolean, item: string, y: number): OutfitPiece | "skin" {
  if (piece === "shoes") return "shoes";
  if (piece === "top") return bone.startsWith("arm") && skinTexel ? "skin" : "top";
  if (item === "bottom-skirt") return "skin";
  if (item === "bottom-shorts") return y < 0.115 ? "skin" : "bottom";
  return "bottom";
}

export interface BodyBand { min: number; max: number }
// Common Kenney rest-pose waist and the sprite builder's 9% footwear boundary.
const WAIST = 0.17625;
const ANKLE = 0.36825 * 0.09;
export const bodyBand = (piece: OutfitPiece): BodyBand =>
  piece === "top" ? { min: WAIST, max: Infinity } : piece === "bottom" ? { min: ANKLE, max: WAIST } : { min: -Infinity, max: ANKLE };

type Point = readonly [number, number, number];
type Weights = [number, number, number];

/**
 * Clip a source triangle to one garment band. Barycentric weights let the
 * renderer preserve normals and bone weights at exact shared seams. Selecting
 * by triangle centre would leave holes or overlap where a face crosses a seam.
 */
export function clipOutfitTriangle(points: readonly Point[], band: BodyBand): Weights[][] {
  const y = (weights: Weights) => weights.reduce((sum, w, i) => sum + w * points[i][1], 0);
  // A face lying on a seam belongs to the garment above it, only once.
  if (points.every((p) => p[1] >= band.max - 1e-7)) return [];
  let polygon: Weights[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (const [plane, above] of [[band.min, true], [band.max, false]] as const) {
    if (!Number.isFinite(plane)) continue;
    const clipped: Weights[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const from = polygon[(i + polygon.length - 1) % polygon.length];
      const to = polygon[i];
      const fromY = y(from), toY = y(to);
      const insideFrom = above ? fromY >= plane : fromY <= plane;
      const insideTo = above ? toY >= plane : toY <= plane;
      if (insideFrom !== insideTo) {
        const t = (plane - fromY) / (toY - fromY);
        clipped.push(from.map((w, j) => w + t * (to[j] - w)) as Weights);
      }
      if (insideTo) clipped.push(to);
    }
    polygon = clipped;
  }
  const triangles: Weights[][] = [];
  for (let i = 1; i < polygon.length - 1; i++) triangles.push([polygon[0], polygon[i], polygon[i + 1]]);
  return triangles;
}
