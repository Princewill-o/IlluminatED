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
