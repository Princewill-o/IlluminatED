import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {projectData}from'../scripts/lib/project-data.mjs';
const {hospitalBeds,hospitalAsset,freeCityAsset}=projectData('src/game/core/additional-world-assets.ts');
const {hospitalMap,SOLID,TILE}=projectData('src/game/core/world.ts');
test('hospital bed blocks produce four bays with no duplicated beds or changed access',()=>{
 const map=hospitalMap(),before=JSON.stringify(map);const beds=hospitalBeds(map.tiles);assert.equal(beds.length,4);const covered=new Set();for(const bed of beds)for(let y=bed.y;y<bed.y+bed.h;y++)for(let x=bed.x;x<bed.x+bed.w;x++){assert.equal(map.tiles[y][x],'d');assert.ok(!covered.has(`${x},${y}`));covered.add(`${x},${y}`);}assert.equal(covered.size,map.tiles.join('').split('d').length-1);assert.equal(JSON.stringify(map),before);
 for(const p of map.portals)for(let y=p.rect.y/TILE;y<(p.rect.y+p.rect.h)/TILE;y++)for(let x=p.rect.x/TILE;x<(p.rect.x+p.rect.w)/TILE;x++)assert.ok(!SOLID.has(map.tiles[y][x]),p.id);
});
test('new imported hospital and city models have self-contained runtime data',()=>{
 for(const url of ['bed_1','bed_2','bed_4','cupboard_bottom','cupboard_top','machine_1','machine_2','overhead_light','tray_1'].map(hospitalAsset).concat(['building3','bench2','garbageBin','fireHydrant','streetLight'].map(freeCityAsset))){const b=fs.readFileSync('public'+url);assert.equal(b.toString('ascii',0,4),'glTF');const d=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(d.meshes?.length);assert.ok((d.buffers??[]).every(b=>!b.uri));assert.ok((d.images??[]).every(i=>i.bufferView!==undefined));}
});
