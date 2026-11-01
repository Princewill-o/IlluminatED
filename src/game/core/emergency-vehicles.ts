/** Vehicle envelopes in world tiles. Headings use +X forward and -X rear. */
export const AMBULANCE_LENGTH = 4.8;
export const AMBULANCE_WIDTH = 1.75;
export const EMERGENCY_ASSETS = {
  ambulance: "/world3d/emergency/ambulance.glb",
  police: "/world3d/emergency/police.glb",
} as const;
export type EmergencyVehicleKind = keyof typeof EMERGENCY_ASSETS;
export function rearDoorAngle(progress: number) {
  const value = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return value * Math.PI * .53;
}
