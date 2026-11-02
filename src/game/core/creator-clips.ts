export type CreatorChannel = "tiktok" | "youtube" | "instagram";
export const MAX_CLIP_BYTES = 30 * 1024 * 1024;
export const MAX_CLIP_SECONDS = 30;
export type AnimationShot = {
  clip: "idle" | "walk" | "run" | "jump" | "wave" | "dance" | "cheer";
  seconds: number;
  facing: "S" | "N" | "E" | "W";
};
export const DEFAULT_SHOTS: AnimationShot[] = [
  { clip: "wave", seconds: 4, facing: "S" },
  { clip: "walk", seconds: 5, facing: "E" },
  { clip: "dance", seconds: 6, facing: "S" },
];
export function animationShotAt(
  shots: readonly AnimationShot[],
  seconds: number,
) {
  const total = shots.reduce(
    (sum, s) => sum + Math.max(1, Math.min(10, s.seconds)),
    0,
  );
  let time = Math.max(0, seconds) % Math.max(1, total);
  for (let i = 0; i < shots.length; i++) {
    time -= Math.max(1, Math.min(10, shots[i].seconds));
    if (time < 0) return i;
  }
  return 0;
}
export interface CreatorClip {
  id: string;
  owner: string;
  channel: CreatorChannel;
  caption: string;
  createdAt: number;
  blob: Blob;
  liked: boolean;
  plays: number;
}
export function validClip(blob: Blob) {
  return (
    !!blob &&
    typeof blob.type === "string" &&
    Number.isFinite(blob.size) &&
    blob.size > 0 &&
    blob.size <= MAX_CLIP_BYTES &&
    /^video\/(webm|mp4)(;|$)/.test(blob.type)
  );
}
