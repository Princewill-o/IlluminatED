import test from 'node:test';
import assert from 'node:assert/strict';
import {projectData} from '../scripts/lib/project-data.mjs';
const W=projectData('src/game/core/world.ts'),P=projectData('src/game/core/pursuit.ts'),D=projectData('src/game/core/daily-jobs.ts'),S=projectData('src/game/core/life-storage.ts'),L=projectData('src/game/core/law.ts'),C=projectData('src/game/core/cinematics.ts');
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('Developer reset is one-time and isolated from other accounts on the same device',()=>{
 const s=storage();s.setItem(S.lifeStorageKey('student'),JSON.stringify({...L.freshLife(),stars:4}));s.setItem(S.lifeStorageKey('developer'),JSON.stringify({...L.freshLife(),stars:3,jailUntil:5000}));
 S.resetAccountWanted(s,'developer','release-1',100);
 assert.equal(S.readAccountLife(s,'developer',100).stars,0);assert.equal(S.readAccountLife(s,'developer',100).jailUntil,0);assert.equal(S.readAccountLife(s,'student',100).stars,4);
 s.setItem(S.lifeStorageKey('developer'),JSON.stringify({...L.freshLife(),stars:2}));S.resetAccountWanted(s,'developer','release-1',200);assert.equal(S.readAccountLife(s,'developer',200).stars,2);
});
test('A served sentence clears stars, heat and hearing even after reopening the game',()=>{
 const s=storage();s.setItem(S.lifeStorageKey('pupil'),JSON.stringify({...L.freshLife(),stars:5,heatAt:200,jailUntil:5000,hearing:{stars:3,charge:'test'}}));
 const released=S.readAccountLife(s,'pupil',5000);assert.equal(released.stars,0);assert.equal(released.heatAt,0);assert.equal(released.hearing,null);assert.equal(released.jailUntil,0);
});
test('Legacy browser penalties migrate to only one account',()=>{
 const s=storage();s.setItem('illuminated:life',JSON.stringify({...L.freshLife(),stars:3}));assert.equal(S.readAccountLife(s,'first',100).stars,3);assert.equal(S.readAccountLife(s,'second',100).stars,0);
});
test('Both practical jobs have five reachable, walkable work points',()=>{
 for(const [id,map]of [['pizzazz',W.londonMap()],['tescow',W.supermarketMap()]]){
  const route=D.dailyJobRoute(id,map);assert.equal(route.length,5);let from=map.spawn;
  for(const stop of route){assert.equal(W.blocked(map,stop.x,stop.y),false);assert.ok(P.walkRoute(map,from,stop).length||Math.hypot(from.x-stop.x,from.y-stop.y)<W.TILE,`${id}: ${stop.name}`);from=stop;}
 }
});
test('University buildings and all three NPC desks can be reached on foot',()=>{
 const district=W.universityDistrictMap(),entrances=district.portals.filter(p=>p.to.mapId?.startsWith('university-'));assert.equal(entrances.length,4);
 for(const p of entrances){const point={x:p.rect.x+p.rect.w/2,y:p.rect.y+p.rect.h/2};assert.ok(P.walkRoute(district,district.spawn,point).length);const room=W.universityInteriorMap(p.to.mapId.slice(11));assert.ok(room);assert.equal(room.portals.filter(q=>q.to.kind==='university').length,3);for(const desk of room.portals){assert.ok(P.walkRoute(room,room.spawn,{x:desk.rect.x+desk.rect.w/2,y:desk.rect.y+desk.rect.h/2}).length);}}
 const gate=W.londonMap().portals.find(p=>p.id==='universities');assert.ok(P.walkRoute(W.londonMap(),W.londonMap().spawn,{x:gate.rect.x+W.TILE,y:gate.rect.y+W.TILE/2}).length);
});
test('Establishing shots return to player follow and respect reduced motion',()=>{
 assert.equal(C.cinematicOffset(-1).x,0);assert.equal(C.cinematicOffset(C.INTRO_MS).x,0);assert.ok(C.cinematicOffset(C.INTRO_MS/2).x>0);assert.equal(C.cinematicOffset(1000,true).x,0);
});
