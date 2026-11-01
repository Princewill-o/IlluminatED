/** Art selection only. Collision maps, portals and business rules remain in world.ts. */
const ROOT='/world3d/kaykit';
export const kaykitAsset=(pack:'city'|'medieval'|'platformer'|'restaurant'|'resources',file:string)=>`${ROOT}/${pack}/${file}.gltf`;
export function assetSeed(id:string){return Array.from(id).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0);}
export function cityBuildingAsset(id:string){return kaykitAsset('city',`building_${'ABCDEFGH'[assetSeed(id)%8]}_withoutBase`);}
export function highlandBuildingAsset(id:string,label=''){const color=['blue','green','red','yellow'][assetSeed(id)%4];const shape=/cafe|lodge/i.test(label)?'tavern':assetSeed(id)%2?'home_A':'home_B';return kaykitAsset('medieval',`buildings/${color}/building_${shape}_${color}`);}
export function interiorAsset(id:string,theme:string|undefined,tile:string):string|null{
 if(theme==='science'&&tile==='k')return kaykitAsset('restaurant','kitchencounter_straight_B');
 if(theme==='hospitality'||id==='venture-hub'){
  const food:Record<string,string>={O:'oven',k:'kitchencounter_straight_A_decorated',F:'fridge_A_decorated',t:'table_round_A',o:'table_round_A_small_decorated',c:'chair_A'};
  if(food[tile])return kaykitAsset('restaurant',food[tile]);
 }
 if(id==='venture-hub'&&tile==='b')return kaykitAsset('resources','Pallet_Wood_Covered_A');
 if(theme==='retail'&&tile==='b')return kaykitAsset('resources','Pallet_Wood_Covered_B');
 if(theme==='logistics'&&tile==='b')return kaykitAsset('resources','Wood_Planks_Stack_Medium');
 return null;
}
export const PLATFORM_TILE=kaykitAsset('platformer','blue/platform_1x1x1_blue');
export const platformTile=(id:string)=>id==='venture-hub'?kaykitAsset('platformer','green/platform_1x1x1_green'):PLATFORM_TILE;

/** Art dimensions are independent of the model's source units; the footprint stays on its solid tile run. */
export function interiorPropLayout(tile:string,run:number){
 const height:Record<string,number>={O:1.08,k:.9,F:1.65,t:.78,o:.65,c:1.02,b:1.0};
 return {span:tile==='t'?run:tile==='O'||tile==='b'?Math.min(2,run):1,height:height[tile]??.9,stretch:tile==='t'};
}
/** Stronger floor zones make white counters and tableware legible at game-camera distance. */
export function interiorFloor(id:string,x:number,y:number):string|null{
 const alternate=(x+y)%2;
 if(id==='study-lobby'){
  if(y>=15&&x<8)return alternate?'#b6c7c8':'#a8bcc0';
  if(y>=15&&x>17)return alternate?'#d1bc99':'#c5ac87';
  return alternate?'#b8c5b7':'#abbba9';
 }
 if(id==='hospital'){
  if(y>=10)return alternate?'#94aca4':'#87a198';
  if(y>=3&&y<=7&&(x<10||x>=16))return alternate?'#9ebcc2':'#91b0b7';
  return alternate?'#c8d7d4':'#bbcfc9';
 }
 if(id==='workplace-pizzazz'){
  if(x<12&&y<13)return alternate?'#617970':'#526c64';
  if(x>=16&&y<8)return alternate?'#889a8b':'#7a8c7c';
  if(x>=16&&y<17)return alternate?'#ba8b66':'#ad7e5c';
  return alternate?'#bfb59d':'#b4aa93';
 }
 if(id==='venture-hub'){
  if(x<=10&&y<=10)return alternate?'#a38e76':'#958168';
  if(x>=22&&y<=11)return alternate?'#7d9898':'#6d8c8c';
  return alternate?'#b4ad98':'#aaa38f';
 }
 return null;
}
