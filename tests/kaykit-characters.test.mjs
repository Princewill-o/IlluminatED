import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { projectData } from '../scripts/lib/project-data.mjs';
const {ADVENTURERS,SUPPLIED_ADVENTURERS,adventurerFor,blockyThumbnail}=projectData('src/game/core/adventurers.ts');
const {COSMETICS,sanitiseAvatar,look}=projectData('src/game/core/cosmetics.ts');
const {normaliseBlockyAvatar}=projectData('src/game/core/blocky-customization.ts');
function glb(file){const b=fs.readFileSync(file);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());}
test('the selectable cast consists of sixteen distinct supplied Blocky rigs with embedded textures and previews',()=>{
 assert.equal(SUPPLIED_ADVENTURERS.length,16);
 const hashes=new Set();
 for(const m of SUPPLIED_ADVENTURERS){const file=`public/world3d/blocky-characters/${m.file}.glb`,g=glb(file);hashes.add(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));assert.ok(g.skins?.length);assert.ok(g.images?.every(i=>i.bufferView!==undefined));assert.ok(g.nodes.some(n=>n.name==='mixamorig:Head'));assert.ok(fs.existsSync(`public${blockyThumbnail(m.id)}`));}
 assert.equal(hashes.size,16,'duplicate supplied folders do not create duplicate choices');
 assert.equal(COSMETICS.filter(c=>c.slot==='head').map(c=>c.id).join(),ADVENTURERS.map(m=>m.id).join());
});
test('saved legacy heads and arbitrary choices normalize to supplied characters without unlocking paid items',()=>{
 for(const m of ADVENTURERS){const c=COSMETICS.find(c=>c.id===m.id);assert.equal(c?.price,0);assert.equal(sanitiseAvatar({head:m.id},new Set()).head,m.id);}
 for(const head of ['head-human','head-kaykit-mage','head-dog','head-alien','../../etc/passwd']){assert.equal(adventurerFor(head).file,'blocky_01_hero');assert.equal(sanitiseAvatar({head},new Set()).head,'head-blocky-hero');assert.equal(look({head}).head,'head-blocky-hero');}
 assert.equal(adventurerFor('head-blocky-princess-rose').id,'head-blocky-classic-princess');
 assert.equal(normaliseBlockyAvatar({head:'head-blocky-wizard',hat:'hat-crown'}).hat,'hat-none');
 assert.equal(sanitiseAvatar({hat:'hat-crown'},new Set(['hat-crown'])).hat,'hat-crown');
});
test('current models provide all ten actions and classic rigs are compatible with those supplied clips',()=>{
 const current=glb('public/world3d/blocky-characters/blocky_01_hero.glb');
 const names=new Set(current.animations.map(a=>a.name));
 for(const action of ['idle','walk','run','jump','fall','wave','punch','death','cheer','dance'])assert.ok(names.has(action));
 const bones=current.skins[0].joints.map(i=>current.nodes[i].name).sort();
 for(const m of SUPPLIED_ADVENTURERS){const g=glb(`public/world3d/blocky-characters/${m.file}.glb`);assert.deepEqual(g.skins[0].joints.map(i=>g.nodes[i].name).sort(),bones);for(const clip of ['idle','walk','run','jump','fall','wave'])assert.ok(g.animations.some(a=>a.name===clip),`${m.name} ${clip}`);}
});
