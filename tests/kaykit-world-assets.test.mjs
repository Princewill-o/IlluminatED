import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {projectData}from'../scripts/lib/project-data.mjs';
const A=projectData('src/game/core/kaykit-world-assets.ts');
function all(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?all(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('all five packs include licenses and every glTF dependency resolves locally',()=>{
 for(const pack of ['city','medieval','platformer','restaurant','resources']){const root=`public/world3d/kaykit/${pack}`;assert.match(fs.readFileSync(root+'/License.txt','utf8'),/CC0/);for(const f of all(root).filter(f=>f.endsWith('.gltf'))){const doc=JSON.parse(fs.readFileSync(f,'utf8'));for(const item of [...(doc.buffers??[]),...(doc.images??[])])if(item.uri&&!item.uri.startsWith('data:'))assert.ok(fs.existsSync(path.resolve(path.dirname(f),decodeURIComponent(item.uri))),f+': '+item.uri);}}
});
test('selected city, regional, restaurant, resource and platform assets exist',()=>{
 const paths=[...Array.from({length:32},(_,i)=>A.cityBuildingAsset('building-'+i)),...Array.from({length:20},(_,i)=>A.highlandBuildingAsset('building-'+i,i%2?'Lodge':'Home')),A.PLATFORM_TILE,A.platformTile('venture-hub'),...['O','k','F','t','o','c'].map(t=>A.interiorAsset('workplace-pizzazz','hospitality',t)),A.interiorAsset('venture-hub','creative','b'),A.interiorAsset('office-amazoom','logistics','b')];for(const p of paths)assert.ok(fs.existsSync('public'+p),p);
 assert.equal(A.cityBuildingAsset('Microsoft'),A.cityBuildingAsset('Microsoft'));assert.ok(new Set(paths.slice(0,32)).size>1);assert.equal(A.interiorAsset('office-bank','finance','d'),null);
});
test('restaurant fixtures keep useful heights and one continuous dining table per run',()=>{
 const table=A.interiorPropLayout('t',3);assert.equal(table.span,3);assert.ok(table.height>=.7&&table.height<=.95);assert.ok(A.interiorPropLayout('F',1).height>table.height);assert.equal(A.interiorPropLayout('k',7).span,1);assert.ok(A.interiorAsset('workplace-pizzazz','hospitality','k').includes('kitchencounter'));
});
test('room floor zones separate the kitchen, dining room and lobby without changing collision tiles',()=>{
 const kitchen=A.interiorFloor('workplace-pizzazz',4,5),dining=A.interiorFloor('workplace-pizzazz',20,10),lobby=A.interiorFloor('workplace-pizzazz',14,19);assert.match(kitchen,/^#[0-9a-f]{6}$/);assert.equal(new Set([kitchen,dining,lobby]).size,3);assert.equal(A.interiorFloor('workplace-macrosoft',4,5),null);
});
