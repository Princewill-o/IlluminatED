import MANIFEST from "../../../public/world3d/blocky-outfits/manifest.json";

export interface OutfitPerks {
  focusDecayMultiplier: number;
  energyDecayMultiplier: number;
  studyFocusBonus: number;
  socialBonus: number;
  hygieneBonus: number;
  label: string;
}
export const BLOCKY_OUTFITS = MANIFEST.outfits;
export type BlockyOutfit = (typeof BLOCKY_OUTFITS)[number];
export const blockyOutfitFor = (id?: string) => BLOCKY_OUTFITS.find(outfit => outfit.id === id);
export const blockyOutfitAsset = (id?: string) => {
  const outfit=blockyOutfitFor(id); return outfit ? `/world3d/blocky-outfits/${outfit.file}` : null;
};
export function outfitPerks(id?: string): OutfitPerks {
  const outfit=blockyOutfitFor(id);
  const neutral:OutfitPerks={focusDecayMultiplier:1,energyDecayMultiplier:1,studyFocusBonus:0,socialBonus:0,hygieneBonus:0,label:'Original outfit'};
  if(!outfit)return neutral;
  if(outfit.perk==='energy')return {...neutral,energyDecayMultiplier:.97,label:'Comfort · energy drains 3% slower'};
  if(outfit.perk==='focus')return {...neutral,focusDecayMultiplier:.97,studyFocusBonus:1,label:'Study ready · +1 focus after study; focus drains 3% slower'};
  if(outfit.perk==='social')return {...neutral,socialBonus:1,label:'Community spirit · +1 social after greeting'};
  if(outfit.perk==='hygiene')return {...neutral,hygieneBonus:1,label:'Fresh start · +1 hygiene after washing'};
  return {...neutral,focusDecayMultiplier:.98,label:'Everyday comfort · focus drains 2% slower'};
}

/**
 * Mix and match. Each Blender outfit set is split into three wearable pieces:
 * the top (torso and arms), the bottoms (legs) and the shoes (feet). Any top
 * goes with any bottoms and any shoes, so the 120 sets give a 360-piece
 * catalogue: 120 tops, 120 bottoms and 120 pairs of shoes.
 */
export type WearSlot = "top" | "bottom" | "shoes";
const BOTTOM_NAMES: Record<string, string> = {
  casual: "Chinos", hoodie: "Joggers", business: "Suit trousers", workwear: "Cargo trousers", sport: "Track pants", police: "Uniform trousers",
  pharmacy: "Smart trousers", paramedic: "Responder trousers", chef: "Check trousers", student: "Cords", raincoat: "Waterproof trousers", explorer: "Trek trousers",
};
const SHOE_NAMES: Record<string, string> = {
  casual: "Canvas trainers", hoodie: "Hi-tops", business: "Oxford shoes", workwear: "Work boots", sport: "Running shoes", police: "Patrol boots",
  pharmacy: "Clinic shoes", paramedic: "Response boots", chef: "Kitchen clogs", student: "Loafers", raincoat: "Wellies", explorer: "Hiking boots",
};
const paletteName = (outfit: BlockyOutfit) => outfit.name.split("·")[1]?.trim() ?? outfit.palette;
export const BLOCKY_BOTTOMS = BLOCKY_OUTFITS.map((o) => ({ id: o.id.replace(/^top-/, "bottom-"), outfit: o, name: `${BOTTOM_NAMES[o.family] ?? "Trousers"} · ${paletteName(o)}`, color: o.pants }));
export const BLOCKY_SHOES = BLOCKY_OUTFITS.map((o) => ({ id: o.id.replace(/^top-/, "shoes-"), outfit: o, name: `${SHOE_NAMES[o.family] ?? "Shoes"} · ${paletteName(o)}`, color: o.accent }));
/** Which outfit set a worn piece comes from, for any of the three slots. */
export const blockyPieceOutfit = (id?: string) => (id ? blockyOutfitFor(id.replace(/^(bottom|shoes)-blocky-/, "top-blocky-")) : undefined);
/** Which slot a garment part belongs to. */
export const wearSlotFor = (bone: string, part: string): WearSlot =>
  /Foot|ToeBase/.test(bone) || /shoe|boot/.test(part) ? "shoes" : /UpLeg|Leg$/.test(bone) || /trouser|legging|knee/.test(part) ? "bottom" : "top";
/** The outfit set to take each slot from. Bottoms and shoes default to the top's own set. */
export type Wardrobe = { top: BlockyOutfit; bottom: BlockyOutfit; shoes: BlockyOutfit };
export function wardrobeFor(avatar: { top?: string; bottom?: string; shoes?: string }): Wardrobe | null {
  const picked = blockyOutfitFor(avatar.top);
  const bottomPiece = avatar.bottom?.startsWith("bottom-blocky-") || avatar.shoes?.startsWith("shoes-blocky-");
  // Blocky bottoms or shoes with a classic top: wear the plain everyday tee so the body is fully dressed.
  const top = picked ?? (bottomPiece ? BLOCKY_OUTFITS[0] : undefined);
  const bottom = blockyPieceOutfit(avatar.bottom?.startsWith("bottom-blocky-") ? avatar.bottom : undefined) ?? top;
  const shoes = blockyPieceOutfit(avatar.shoes?.startsWith("shoes-blocky-") ? avatar.shoes : undefined) ?? bottom ?? top;
  return top && bottom && shoes ? { top, bottom, shoes } : null;
}
