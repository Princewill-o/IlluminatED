import {assetSeed} from './kaykit-world-assets';
import type {KitDetail} from './kit-dressing';
import {buildLondon} from './london';
import {TILE,type WorldMap} from './world';

export const crayonAsset=(name:string)=>`/world3d/crayon-city/models/textured/${name}.glb`;
export const pixelAsset=(name:string)=>`/world3d/pixel-vegetation/${name}.glb`;
type Plot={id:string;style?:string;companyId?:string;label?:string};
/** Match existing venues; model collision metadata never changes the game's map or portals. */
export function crayonBuildingAsset(t:Plot):string|null{
 const fixed:Record<string,string>={
  'my-house':'sunbeam-cottage','makerspace':'sageworks-offices','study-club':'willowbrook-school',
  'district-campus-library':'willowbrook-school','district-campus-hall':'willowbrook-school',
  'district-campus-labs':'sageworks-offices','district-wharf-cafe':'cornerleaf-cafe',
  'district-bank':'cloudline-tower','district-wharf-gallery':'sageworks-offices',
 };
 const company:Record<string,string>={'goggle':'cloudline-tower','macrosoft':'sageworks-offices','barklays':'sageworks-offices','tescow':'freshfield-market','st-plasters':'harborlight-hospital','tesler':'mossline-garage','gregz':'cornerleaf-cafe','tiny-humans':'willowbrook-school'};
 let name=fixed[t.id]??(t.companyId?company[t.companyId]:null);
 if(!name&&t.id.startsWith('outskirts-cottage'))name='sunbeam-cottage';
 if(!name&&t.id.startsWith('district-villa'))name='sunbeam-cottage';
 if(!name&&t.style==='terrace'&&assetSeed(t.id)%4===0)name='meadow-apartments';
 if(!name&&!t.label&&t.style==='office')name='sageworks-offices';
 if(!name&&!t.label&&t.style==='glass')name='cloudline-tower';
 if(!name&&!t.label&&t.style==='brick'&&assetSeed(t.id)%3===0)name='ember-fire-station';
 return name?crayonAsset(name):null;
}
export interface PixelTreePlan extends KitDetail {id:string}
/** Replace selected existing city tree tiles, capped so the detailed tutorial meshes stay affordable. */
export function pixelTreePlans(map:WorldMap):PixelTreePlan[]{
 if(map.art!=='london')return [];
 const out:PixelTreePlan[]=[];
 for(const t of buildLondon().things){
  if(t.kind!=='tree'||map.tiles[t.y]?.[t.x]!=='T'||t.id.startsWith('outskirts-')||assetSeed(t.id)%4!==0)continue;
  const x=t.x+.04,z=t.y+.04,w=.92,d=.92;
  if(map.portals.some(p=>x<(p.rect.x+p.rect.w)/TILE&&x+w>p.rect.x/TILE&&z<(p.rect.y+p.rect.h)/TILE&&z+d>p.rect.y/TILE))continue;
  out.push({id:t.id,asset:pixelAsset(assetSeed(t.id)%2?'tree-a':'tree-b'),x,z,y:.13,w,d,height:2.3+(assetSeed(t.id)%3)*.15});
  if(out.length===40)break;
 }
 return out;
}
