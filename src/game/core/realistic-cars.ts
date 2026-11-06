import { EMERGENCY_ASSETS, AMBULANCE_LENGTH, AMBULANCE_WIDTH } from "./emergency-vehicles";
import { CAR_LENGTH, CAR_WIDTH } from "./vehicles";

/** Normal motor cars use the supplied Quaternius pack; rescue vehicles have dedicated rigs. */
export const REALISTIC_CAR_MODELS = ["NormalCar1", "NormalCar2", "SportsCar", "SportsCar2", "SUV", "Taxi", "Cop"] as const;
export type RealisticCarModel = (typeof REALISTIC_CAR_MODELS)[number];
const ALIASES: Record<string, RealisticCarModel> = {
  sedan: "NormalCar1", hatchback: "NormalCar2", "hatchback-sports": "SportsCar",
  sports: "SportsCar2", suv: "SUV", cab: "Taxi", taxi: "Taxi", police: "Cop",
  // Existing saved garage and traffic IDs remain valid; the supplied pack has no van body.
  van: "NormalCar2", delivery: "NormalCar2", ambulance: "SUV",
};
export function realisticCarModel(kind: string): RealisticCarModel {
  return ALIASES[kind] ?? (REALISTIC_CAR_MODELS.includes(kind as RealisticCarModel) ? kind as RealisticCarModel : "NormalCar1");
}
const BLENDER = new Set(["mini", "ev-hatch", "pickup", "box-van", "camper", "rally", "supercar"]);
export const realisticCarAsset = (kind: string) => kind === "ambulance" || kind === "police" ? EMERGENCY_ASSETS[kind] : BLENDER.has(kind) ? `/world3d/cars-blender/${kind}.glb` : `/world3d/cars-realistic/${realisticCarModel(kind)}.glb`;
export const realisticCarPreview = (kind: string) => kind === "ambulance" || kind === "police" ? `/world3d/emergency/previews/${kind}.webp` : BLENDER.has(kind) ? `/world3d/cars-blender/previews/${kind}.webp` : `/world3d/cars-realistic/previews/${realisticCarModel(kind)}.webp`;
/** Uniform scale preserves roof height, wheels and body proportions inside the shared driving envelope. */
export function realisticCarScale(size: { x: number; z: number }, kind = "sedan") {
  if (!Number.isFinite(size.x) || !Number.isFinite(size.z) || size.x <= 0 || size.z <= 0) throw new Error("Car bounds must be positive and finite");
  const length = kind === "ambulance" ? AMBULANCE_LENGTH : CAR_LENGTH;
  const width = kind === "ambulance" ? AMBULANCE_WIDTH : CAR_WIDTH;
  return Math.min(length / size.x, width / size.z);
}

/** Paint: the body material in each model that takes the owner's chosen colour. */
export const PAINT_MATERIALS = new Set(["paint", "Blue", "LightBlue", "White.001", "Orange", "White", "Yellow.001"]);
/** The paint shop palette (hex, name). */
export const CAR_PAINTS: readonly { hex: string; name: string }[] = [
  { hex: "#c8322d", name: "Post-box red" }, { hex: "#2b6fe0", name: "Electric blue" }, { hex: "#1e2a44", name: "Midnight" },
  { hex: "#f2c418", name: "Taxi yellow" }, { hex: "#2fa865", name: "Racing green" }, { hex: "#f4f4f0", name: "Arctic white" },
  { hex: "#2b2d33", name: "Gloss black" }, { hex: "#ff7a1a", name: "Sunset orange" }, { hex: "#8e5cd9", name: "Ultraviolet" },
  { hex: "#2fa8a0", name: "Teal" }, { hex: "#e88aa8", name: "Bubblegum" }, { hex: "#9aa3ad", name: "Gunmetal" },
];
export const isPaint = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
