import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {projectData} from '../scripts/lib/project-data.mjs';
const core=projectData('src/game/core/blocky-outfits.ts');
const cosmetics=projectData('src/game/core/cosmetics.ts');
const characters=projectData('src/game/core/adventurers.ts');
function json(path){const data=fs.readFileSync(path);return JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));}
async function load(url){
 const data=fs.readFileSync(`public${url}`),jsonLength=data.readUInt32LE(12),gltf=json(`public${url}`);
 // Node test environment has no browser image decoder; texture-independent geometry/rig validation.
 delete gltf.images;delete gltf.textures;delete gltf.materials;
 for(const mesh of gltf.meshes??[])for(const primitive of mesh.primitives)delete primitive.material;
 let text=Buffer.from(JSON.stringify(gltf));text=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);
 const bin=data.subarray(20+jsonLength),header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+text.length+bin.length,8);header.writeUInt32LE(text.length,12);header.write('JSON',16);
 const bytes=Buffer.concat([header,text,bin]);return await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',resolve,reject));
}
function module(){const exports={};const js=ts.transpileModule(fs.readFileSync('src/components/game/blocky-garments.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(js,{exports,require:name=>name==='three'?THREE:name.includes('adventurers')?characters:name.includes('blocky-outfits')?core:cosmetics});return exports;}
test('120 unique Blender outfits have ten palettes per twelve families, real bone-bound geometry, thumbnails and free save rows',()=>{
 assert.equal(core.BLOCKY_OUTFITS.length,120);assert.equal(new Set(core.BLOCKY_OUTFITS.map(o=>o.id)).size,120);
 const families=new Map(),hashes=new Set();const migration=fs.readFileSync('supabase/migrations/20261101010642_blocky_wardrobe_120.sql','utf8');
 for(const outfit of core.BLOCKY_OUTFITS){
  families.set(outfit.family,(families.get(outfit.family)??0)+1);
  const path=`public/world3d/blocky-outfits/${outfit.file}`,gltf=json(path);hashes.add(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'));
  assert.ok(gltf.meshes.length>=10);assert.ok(gltf.nodes.every(n=>n.extras?.wearBone&&n.extras?.wearPart));
  assert.ok(fs.statSync(`public/world3d/blocky-outfits/${outfit.thumbnail}`).size>1000);
  assert.ok(migration.includes(`'${outfit.id}'`));assert.equal(cosmetics.sanitiseAvatar({top:outfit.id},new Set()).top,outfit.id);
 }
 assert.equal(families.size,12);assert.equal(hashes.size,120);for(const count of families.values())assert.equal(count,10);
 assert.ok(fs.statSync('blender/blocky-wardrobe.blend').size>10000);
});
test('modular garment transforms attach to every supplied rig and move with its source bones',async()=>{
 const {attachBlockyOutfit,clothedBodyGeometry}=module();
 const reference=await load('/world3d/blocky-characters/blocky_01_hero.glb');const cache=new Map([['/world3d/blocky-characters/blocky_01_hero.glb',reference]]);
 const loader=async url=>{if(!cache.has(url))cache.set(url,await load(url));return cache.get(url);};
 const families=[...new Set(core.BLOCKY_OUTFITS.map(o=>o.family))];
 for(let i=0;i<characters.ADVENTURERS.length;i++){
  const model=characters.ADVENTURERS[i],source=await load(`/world3d/blocky-characters/${model.file}.glb`),outfit=core.BLOCKY_OUTFITS.find(o=>o.family===families[i%families.length]);
  const materials=new Set();await attachBlockyOutfit(source.scene,outfit,cosmetics.look({top:outfit.id}),loader,materials);
  let attached=0;source.scene.traverse(node=>{if(node.name.startsWith('outfit-')){assert.equal(node.parent.isBone,true);attached++;const position=node.getWorldPosition(new THREE.Vector3());assert.ok(position.toArray().every(Number.isFinite));}});assert.equal(attached,json(`public/world3d/blocky-outfits/${outfit.file}`).nodes.length);
  const torso=source.scene.getObjectByName('mixamorigSpine1');const jacket=source.scene.getObjectByName('outfit-jacket'),before=jacket.getWorldPosition(new THREE.Vector3());torso.position.x+=.2;source.scene.updateMatrixWorld(true);assert.ok(jacket.getWorldPosition(new THREE.Vector3()).distanceTo(before)>.15);
  const mesh=source.scene.getObjectByProperty('isSkinnedMesh',true),original=mesh.geometry;const filtered=clothedBodyGeometry(mesh);assert.ok(filtered.index.count>0&&filtered.index.count<=original.index.count,model.id);assert.notEqual(filtered,original);if(!model.id.startsWith('head-preset-'))assert.ok(original.index.count>filtered.index.count,model.id);filtered.dispose();materials.forEach(m=>m.dispose());
 }
});
test('costume perks stay small, free and never provide authority or combat effects',()=>{
 for(const outfit of core.BLOCKY_OUTFITS){const perks=core.outfitPerks(outfit.id);assert.ok(perks.energyDecayMultiplier>=.95&&perks.energyDecayMultiplier<=1);assert.ok(perks.focusDecayMultiplier>=.95&&perks.focusDecayMultiplier<=1);for(const key of ['studyFocusBonus','socialBonus','hygieneBonus'])assert.ok(perks[key]>=0&&perks[key]<=1);assert.equal(cosmetics.cosmeticById(outfit.id).price,0);assert.equal(perks.damage,undefined);assert.equal(perks.wanted,undefined);assert.equal(perks.authority,undefined);}
 assert.equal(core.outfitPerks('top-tee').energyDecayMultiplier,1);assert.equal(core.blockyOutfitAsset('fake'),null);
});
