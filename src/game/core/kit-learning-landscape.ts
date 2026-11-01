import {pixelAsset} from './crayon-vegetation';
import {assetSeed,kaykitAsset} from './kaykit-world-assets';
import type {KitDetail} from './kit-dressing';
import {SOLID,TILE,type WorldMap} from './world';

/** Scenery and tabletop props must stay within existing solid tiles and away from interaction rectangles. */
function safeDetail(map:WorldMap,p:KitDetail){
  for(let z=Math.floor(p.z);z<=Math.floor(p.z+p.d-.00001);z++)
    for(let x=Math.floor(p.x);x<=Math.floor(p.x+p.w-.00001);x++)
      if(!SOLID.has(map.tiles[z]?.[x]??''))return false;
  return !map.portals.some(v=>p.x<(v.rect.x+v.rect.w)/TILE&&p.x+p.w>v.rect.x/TILE&&p.z<(v.rect.y+v.rect.h)/TILE&&p.z+p.d>v.rect.y/TILE);
}

export function highlandNatureDetail(t:{kind:string;id:string;x:number;y:number},map:WorldMap):KitDetail|null{
  const seed=assetSeed(t.id);
  const file=t.kind==='pine'?`decoration/nature/tree_single_${seed%2?'A':'B'}`:t.kind==='rock'?`decoration/nature/rock_single_${'ABCDE'[seed%5]}`:null;
  if(!file&&t.kind!=='bench')return null;
  const p:KitDetail={asset:t.kind==='pine'&&seed%3===0?`/world3d/selected-city/tree-${seed%4}.glb`:t.kind==='bench'?kaykitAsset('city','bench'):seed%7===0?pixelAsset(t.kind==='rock'?'rock':'tree-a'):kaykitAsset('medieval',file!),x:t.x+.06,z:t.y+.06,y:.12,w:.88,d:.88,height:t.kind==='pine'?3.2+(seed%5)*.25:t.kind==='rock'?.3+(seed%3)*.12:.7};
  return safeDetail(map,p)?p:null;
}

/** Maker materials sit on the shared worktable; subject and careers desks retain their clear approach. */
export function studyKitDetails(map:WorldMap):KitDetail[]{
  if(map.id!=='study-lobby')return [];
  const out:KitDetail[]=[];
  const add=(asset:string,x:number,z:number,y:number,w:number,d:number,height:number)=>{
    const p={asset,x,z,y,w,d,height};if(out.length<24&&safeDetail(map,p))out.push(p);
  };
  for(let z=0;z<map.rows;z++)for(let x=0;x<map.cols;x++){
    const tile=map.tiles[z][x];
    if(tile==='t'){
      if(z<12)add(kaykitAsset('resources',(x+z)%2?'Parts_Cog':'Parts_Pile_Small'),x+.24,z+.2,.91,.46,.5,.16);
      else add(kaykitAsset('restaurant','menu'),x+.22,z+.28,1,.25,.3,.32);
    }
    if(tile==='p')add(kaykitAsset('city','bush'),x+.1,z+.1,.12,.8,.8,.9);
  }
  return out;
}
