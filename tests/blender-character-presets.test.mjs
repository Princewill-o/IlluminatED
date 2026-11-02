import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {projectData} from '../scripts/lib/project-data.mjs';
const base='public/world3d/blocky-characters/';
const manifest=JSON.parse(fs.readFileSync(base+'presets/manifest.json','utf8'));
const read=(file)=>{const data=fs.readFileSync(base+file+'.glb');return {data,gltf:JSON.parse(data.subarray(20,20+data.readUInt32LE(12)))};};
test('100 distinct Blender presets are real rig-compatible models with varied geometry and thumbnails',()=>{
  assert.equal(manifest.presets.length,100);assert.equal(new Set(manifest.presets.map(p=>p.id)).size,100);
  const donor=read('blocky_01_hero').gltf,bones=donor.skins[0].joints.map(index=>donor.nodes[index].name).sort();
  const hashes=new Set(),hair=new Set(),tones=new Set(),collections=new Set();
  for(const preset of manifest.presets){
    const {data,gltf}=read(preset.file);hashes.add(crypto.createHash('sha256').update(data).digest('hex'));
    assert.deepEqual(gltf.skins[0].joints.map(index=>gltf.nodes[index].name).sort(),bones);
    assert.ok(gltf.nodes.some(node=>node.extras?.presetHair),preset.name);
    assert.ok(gltf.nodes.some(node=>node.extras?.presetGarment),preset.name);
    assert.ok(gltf.images.every(image=>image.bufferView!==undefined),'embedded textures');
    assert.ok(fs.statSync(base+preset.file+'.png').size>1000);
    hair.add(preset.hair);tones.add(preset.skinTone);collections.add(preset.collection);
  }
  assert.equal(hashes.size,100);assert.equal(hair.size,10);assert.ok(tones.size>=8);assert.equal(collections.size,10);
  assert.ok(fs.statSync('blender/character-presets-100.blend').size>100000);
});
test('presets are selectable and save through the normal free-character ownership path',()=>{
  const {ADVENTURERS}=projectData('src/game/core/adventurers.ts');
  const {sanitiseAvatar}=projectData('src/game/core/cosmetics.ts');
  assert.equal(ADVENTURERS.length,116);
  for(const preset of manifest.presets){const avatar=sanitiseAvatar({head:preset.id,top:preset.outfit,hat:'hat-crown'},new Set());assert.equal(avatar.head,preset.id);assert.equal(avatar.top,preset.outfit);assert.equal(avatar.hat,'hat-none');}
});
