import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectData} from '../scripts/lib/project-data.mjs';
const {roomKitDetails,counterKitAsset,mountainKitPlan,roofKitDetail}=projectData('src/game/core/kit-dressing.ts');
const {officeMap,workplaceMap,ventureMap,SOLID,TILE}=projectData('src/game/core/world.ts');
const {buildHighlands}=projectData('src/game/core/regions.ts');
const {WORKPLACES}=projectData('src/game/core/careers.ts');
const themes=['technology','finance','creative','logistics','science','hospitality','retail'];
const maps=themes.map(theme=>officeMap({slug:`kit-${theme}`,name:theme,sector:theme,accent:'#426d5a'}));
maps.push(...WORKPLACES.map(w=>workplaceMap(w.id)),ventureMap());
test('room details are deterministic, bounded and remain on solid furniture outside interaction areas',()=>{
 for(const map of maps){const before=JSON.stringify(map),plan=roomKitDetails(map);assert.ok(plan.length>0,map.id);assert.ok(plan.length<=48,map.id);assert.deepEqual(plan,roomKitDetails(map));assert.equal(JSON.stringify(map),before);
 for(const p of plan){assert.ok(fs.existsSync('public'+p.asset),p.asset);assert.ok(p.w>0&&p.d>0&&p.height>0);assert.ok(p.x>=0&&p.z>=0&&p.x+p.w<=map.cols&&p.z+p.d<=map.rows);for(let y=Math.floor(p.z);y<=Math.floor(p.z+p.d-.0001);y++)for(let x=Math.floor(p.x);x<=Math.floor(p.x+p.w-.0001);x++)assert.ok(SOLID.has(map.tiles[y][x]),`${map.id} ${p.asset} at ${x},${y}`);
 for(const portal of map.portals)assert.ok(!(p.x<(portal.rect.x+portal.rect.w)/TILE&&p.x+p.w>portal.rect.x/TILE&&p.z<(portal.rect.y+portal.rect.h)/TILE&&p.z+p.d>portal.rect.y/TILE),portal.id);
 }}
});
test('each workplace theme has a different kit signature and kitchens vary with their layout',()=>{
 const signatures=maps.slice(0,7).map(m=>[...new Set(roomKitDetails(m).map(p=>p.asset))].sort().join('|'));assert.equal(new Set(signatures).size,7);
 const counters=Array.from({length:20},(_,i)=>counterKitAsset('workplace-pizzazz','hospitality',i,4));assert.ok(new Set(counters).size>=3);for(const p of counters)assert.ok(fs.existsSync('public'+p),p);
});
test('Highlands kit mountains stay inside their existing blocked ellipses',()=>{
 for(const t of buildHighlands().things.filter(t=>t.kind==='mountain')){const p=mountainKitPlan(t);assert.ok(fs.existsSync('public'+p.asset));assert.ok(p.height<=t.peak);for(const x of [p.x,p.x+p.w])for(const z of [p.z,p.z+p.d]){const dx=(x-(t.x+t.w/2))/(t.w/2),dz=(z-(t.y+t.h/2))/(t.h/2);assert.ok(dx*dx+dz*dz<1);}}
});
test('roof fixtures use only supplied assets and have a bounded size',()=>{
 for(let i=0;i<20;i++){const p=roofKitDetail(`roof-${i}`);assert.ok(fs.existsSync('public'+p.asset));assert.ok(p.w<=1&&p.d<=1&&p.height<=1.4);}
});
