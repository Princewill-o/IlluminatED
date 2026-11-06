/** Pets: kinds, prices (must match public.pet_adopt), colours and gentle needs. */
export type PetKind = "dog" | "cat" | "rabbit" | "fox" | "panda" | "penguin";
export type PetAction = "feed" | "water" | "wash" | "sleep" | "play";
export type PetAccessory = "none" | "collar" | "bow" | "bandana" | "cap";

export const PETS: { kind: PetKind; name: string; price: number; blurb: string; colours: string[] }[] = [
  { kind: "dog", name: "Dog", price: 150, blurb: "Loyal, loves fetch and long walks.", colours: ["#c8955c", "#2b2d33", "#f2efe6", "#8a5a1f"] },
  { kind: "cat", name: "Cat", price: 150, blurb: "Independent, naps in sunny spots.", colours: ["#e88d3a", "#2b2d33", "#9aa3ad", "#f2efe6"] },
  { kind: "rabbit", name: "Rabbit", price: 100, blurb: "Bouncy, loves carrots.", colours: ["#f2efe6", "#a58d74", "#5c4a3d", "#d9c3a5"] },
  { kind: "fox", name: "Fox", price: 220, blurb: "Clever and curious, a city favourite.", colours: ["#e4572e", "#c8955c", "#f2efe6", "#8a5a1f"] },
  { kind: "panda", name: "Panda", price: 300, blurb: "Rare, gentle and very fluffy.", colours: ["#f2efe6"] },
  { kind: "penguin", name: "Penguin", price: 260, blurb: "Waddles everywhere, loves a splash.", colours: ["#22262e", "#1f3f8a"] },
];
export const petInfo = (kind: string) => PETS.find((p) => p.kind === kind) ?? PETS[0];

export interface Pet {
  id: string;
  kind: PetKind;
  name: string;
  colour: string;
  accessory: PetAccessory;
  equipped: boolean;
  fed_at: string;
  watered_at: string;
  washed_at: string;
  slept_at: string;
  played_at: string;
  care_done: string[];
  care_day: string | null;
}

const HOUR = 3_600_000;
/** A need from 100 (just done) falling over `hours`, but never below 25: pets are never punished. */
export function need(lastAt: string | number, hours: number, now = Date.now()) {
  const t = typeof lastAt === "number" ? lastAt : Date.parse(lastAt);
  if (!Number.isFinite(t)) return 100;
  return Math.max(25, Math.round(100 - ((now - t) / (hours * HOUR)) * 75));
}
export function petNeeds(p: Pick<Pet, "fed_at" | "watered_at" | "washed_at" | "slept_at" | "played_at">, now = Date.now()) {
  const n = { hunger: need(p.fed_at, 8, now), thirst: need(p.watered_at, 6, now), clean: need(p.washed_at, 48, now), energy: need(p.slept_at, 12, now), fun: need(p.played_at, 10, now) };
  return { ...n, happiness: Math.round((n.hunger + n.thirst + n.clean + n.energy + n.fun) / 5) };
}
/** As broadcast to the room: "dog:#c8955c:bow". */
export const petTag = (p: Pick<Pet, "kind" | "colour" | "accessory">) => `${p.kind}:${p.colour}:${p.accessory}`;
export function parsePetTag(v: unknown): { kind: PetKind; colour: string; accessory: PetAccessory } | null {
  if (typeof v !== "string" || v.length > 40) return null;
  const [kind, colour, accessory = "none"] = v.split(":");
  if (!PETS.some((p) => p.kind === kind) || !/^#[0-9a-f]{6}$/i.test(colour) || !["none", "collar", "bow", "bandana", "cap"].includes(accessory)) return null;
  return { kind: kind as PetKind, colour, accessory: accessory as PetAccessory };
}
