import { CAR_LENGTH, CAR_WIDTH } from "./vehicles";
import { EMERGENCY_ASSETS, AMBULANCE_LENGTH, AMBULANCE_WIDTH } from "./emergency-vehicles";

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
export const realisticCarAsset = (kind: string) => kind === "ambulance" || kind === "police" ? EMERGENCY_ASSETS[kind] : `/world3d/cars-realistic/${realisticCarModel(kind)}.glb`;
export const realisticCarPreview = (kind: string) => kind === "ambulance" || kind === "police" ? `/world3d/emergency/previews/${kind}.webp` : `/world3d/cars-realistic/previews/${realisticCarModel(kind)}.webp`;
/** Uniform scale preserves roof height, wheels and body proportions inside the shared driving envelope. */
export function realisticCarScale(size: { x: number; z: number }, kind = "sedan") {
  if (!Number.isFinite(size.x) || !Number.isFinite(size.z) || size.x <= 0 || size.z <= 0) throw new Error("Car bounds must be positive and finite");
  const length = kind === "ambulance" ? AMBULANCE_LENGTH : CAR_LENGTH;
  const width = kind === "ambulance" ? AMBULANCE_WIDTH : CAR_WIDTH;
  return Math.min(length / size.x, width / size.z);
}
