import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { projectData } from '../scripts/lib/project-data.mjs';
const { suppliedCityBuilding,voxelOfficePalette }=projectData('src/game/core/supplied-building-assets.ts');
const { londonMap,hospitalMap,SOLID,TILE }=projectData('src/game/core/world.ts');
const { buildLondon }=projectData('src/game/core/london.ts');
function reachable(map) {
  const start=[Math.floor(map.spawn.x/TILE),Math.floor(map.spawn.y/TILE)],queue=[start],seen=new Set([start.join(',')]);
  for(let i=0;i<queue.length;i++) {
    const [x,y]=queue[i];
    for(const [xx,yy] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
      const key=`${xx},${yy}`;
      if(xx<0||yy<0||xx>=map.cols||yy>=map.rows||seen.has(key)||SOLID.has(map.tiles[yy][xx]))continue;
      seen.add(key);queue.push([xx,yy]);
    }
  }
  return seen;
}
function checkGLB(path) {
  const data=fs.readFileSync(path);assert.equal(data.toString('ascii',0,4),'glTF',path);
  const gltf=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));
  assert.ok(gltf.meshes?.length,path);assert.ok(gltf.buffers.every(b=>!b.uri),`${path}: embedded geometry`);
  assert.ok((gltf.images??[]).every(i=>i.bufferView!==undefined),`${path}: embedded textures`);
}
test('city hospital has a unique large plot with a centred accessible entrance and two preserved hotels',()=>{
  const city=londonMap(),raw=buildLondon(),hospital=raw.things.find(t=>t.id==='city-hospital');
  assert.equal(hospital.kind,'building');assert.ok(hospital.w>=10&&hospital.h>=8&&hospital.height>=8);
  const doorway=city.portals.find(p=>p.id==='hospital');assert.equal(doorway.to.mapId,'hospital');
  assert.equal(doorway.rect.x/TILE+doorway.rect.w/TILE/2,hospital.x+hospital.w/2);
  assert.equal(doorway.rect.y/TILE,hospital.y+hospital.h);
  const seen=reachable(city);
  for(let x=doorway.rect.x/TILE;x<(doorway.rect.x+doorway.rect.w)/TILE;x++)assert.ok(seen.has(`${x},${doorway.rect.y/TILE}`));
  assert.ok(seen.has('61,34'),'hospital preview/dropoff spot is reachable');
  assert.equal(raw.things.filter(t=>t.id==='hotel-0'||t.id==='hotel-1').length,2);
  const inside=hospitalMap(),indoorSeen=reachable(inside);
  for(const portal of inside.portals)assert.ok(indoorSeen.has(`${portal.rect.x/TILE},${portal.rect.y/TILE}`),portal.id);
  assert.equal(inside.rooms.length,3);
});
test('supplied city venues resolve to standalone source models with self-contained runtime data',()=>{
  const plots=buildLondon().things.filter(t=>t.kind==='building');let selected=0;
  for(const plot of plots) {
    const file=suppliedCityBuilding(plot);if(!file)continue;
    selected++;checkGLB(`public/world3d/selected-city/${file}.glb`);
  }
  assert.ok(selected>=8);
  assert.equal(suppliedCityBuilding({id:'hq',companyId:'macrosoft'}),'modern-office');
  assert.equal(suppliedCityBuilding({id:'hq',companyId:'psyke'}),'sports-store');
  assert.equal(suppliedCityBuilding({id:'city-hospital'}),null,'hospital has its dedicated clinical facade');
});
test('voxel office palettes use imported furniture families, keep all textures and distinguish sectors',()=>{
  const tech=voxelOfficePalette('microsoft','technology'),finance=voxelOfficePalette('barclays','finance'),science=voxelOfficePalette('hospital','science');
  assert.notEqual(tech.desk,finance.desk);assert.notEqual(tech.chair,science.chair);
  for(const palette of [tech,finance,science])for(const path of Object.values(palette))checkGLB('public'+path);
});
