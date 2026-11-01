/** Blender-authored garments use existing cosmetic IDs and the KayKit Rig_Medium skeleton. */
export const MODERN_TOPS=['top-tee','top-hoodie','top-polo','top-suit'] as const;
export const MODERN_BOTTOMS=['bottom-jeans','bottom-smart'] as const;
export const MODERN_SHOES=['shoes-trainers','shoes-smart'] as const;
const styles=new Map<string,string>([['top-tee','tee'],['top-hoodie','hoodie'],['top-polo','polo'],['top-suit','blazer']]);
export const modernStyleFor=(top:string):string|null=>styles.get(top)??null;
export function modernCharacterUrl(model:string,top:string){const style=modernStyleFor(top);return style?`/world3d/modern-clothes/${model}-${style}.glb`:null;}
export function modernPieceVisible(name:string,bottom:string,shoes:string){
 if(name.startsWith('Modern_Denim'))return bottom!=='bottom-smart';
 if(name.startsWith('Modern_Tailored'))return bottom==='bottom-smart';
 if(name.startsWith('Modern_Trainer'))return shoes!=='shoes-smart';
 if(name.startsWith('Modern_Smart'))return shoes==='shoes-smart';
 return true;
}
