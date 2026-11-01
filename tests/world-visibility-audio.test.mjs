import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
function module(path, context) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,...context});
  return exports;
}
function visibilityController() {
  return module('src/components/game/world/building-visibility.ts',{require:()=>THREE}).buildingVisibility();
}
function building(x,z,material = new THREE.MeshStandardMaterial()) {
  const group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(2,4,1),material);
  group.add(mesh);group.position.set(x,2,z);return {group,mesh,material};
}
function advance(visibility,camera,targets,frames=90) {
  for(let frame=0;frame<frames;frame++)visibility.update(camera,targets,1/60);
}
test('foreground cutaways ease in, preserve private material shaders and recover on a clear view',()=>{
  const material=new THREE.MeshStandardMaterial();material.onBeforeCompile=()=>{};material.customProgramCacheKey=()=> 'curved';
  const site=building(0,4,material),visibility=visibilityController();visibility.register(site.group);
  const camera=new THREE.Vector3(0,2,10),targets=[new THREE.Vector3(0,2,0)];
  visibility.update(camera,targets,1/60);
  assert.notEqual(site.mesh.material,material);
  assert.ok(site.mesh.material.opacity>.28&&site.mesh.material.opacity<1,'first frame is gradual');
  assert.equal(site.mesh.material.onBeforeCompile,material.onBeforeCompile);
  assert.equal(site.mesh.material.customProgramCacheKey,material.customProgramCacheKey);
  assert.equal(material.opacity,1,'shared source stays opaque');
  advance(visibility,camera,targets);
  assert.ok(site.mesh.material.opacity<.30);
  const lowest=site.mesh.material.opacity;
  visibility.update(camera,[],1/60);
  assert.ok(site.mesh.material.opacity>lowest&&site.mesh.material.opacity<1,'recovery is also gradual');
  advance(visibility,camera,[],60);
  assert.equal(site.mesh.material,material);
  visibility.dispose();
});
test('at most two nearest opaque foreground buildings fade; side, glass and background scenery stay intact',()=>{
  const source=new THREE.MeshStandardMaterial(),visibility=visibilityController();
  const sites=[building(0,3,source),building(0,6,source),building(0,9,source),building(5,9,source),building(0,-4,source)];
  const glass=building(0,11,new THREE.MeshPhysicalMaterial({transparent:true,opacity:.35,transmission:.7}));
  for(const site of [...sites,glass])visibility.register(site.group);
  advance(visibility,new THREE.Vector3(0,2,14),[new THREE.Vector3(0,2,0),new THREE.Vector3(0,2.7,0)]);
  assert.equal(sites.filter(site=>site.mesh.material!==source).length,2);
  assert.notEqual(sites[1].mesh.material,source);assert.notEqual(sites[2].mesh.material,source);
  assert.equal(sites[0].mesh.material,source,'third building is not cut away');
  assert.equal(sites[3].mesh.material,source,'side building is not cut away');
  assert.equal(sites[4].mesh.material,source,'building behind the player is not cut away');
  assert.equal(glass.mesh.material,glass.material,'glass is unchanged');
  assert.equal(source.opacity,1);
  visibility.dispose();
});
test('a ray crossing an empty building bounding box does not cause a cutaway',()=>{
  const source=new THREE.MeshStandardMaterial(),group=new THREE.Group();
  for(const x of [-3,3]){const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,4,2),source);mesh.position.set(x,2,6);group.add(mesh);}
  const signMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:.5});
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(3,1),signMaterial);sign.position.set(0,2,6);group.add(sign);
  const visibility=visibilityController();visibility.register(group);
  advance(visibility,new THREE.Vector3(0,2,12),[new THREE.Vector3(0,2,0)]);
  for(const mesh of group.children)assert.equal(mesh.material,mesh===sign?signMaterial:source);
  visibility.dispose();
});
test('moving between streets restores the old blockers before opening new cutaways, with a strict two-building cap',()=>{
  const source=new THREE.MeshStandardMaterial(),visibility=visibilityController();
  const sites=[building(0,6,source),building(0,9,source),building(8,6,source),building(8,9,source)];
  for(const site of sites)visibility.register(site.group);
  advance(visibility,new THREE.Vector3(0,2,14),[new THREE.Vector3(0,2,0)]);
  for(let frame=0;frame<90;frame++) {
    visibility.update(new THREE.Vector3(8,2,14),[new THREE.Vector3(8,2,0)],1/60);
    assert.ok(sites.filter(site=>site.mesh.material!==source).length<=2,'including recovering buildings');
  }
  assert.equal(sites[0].mesh.material,source);assert.equal(sites[1].mesh.material,source);
  assert.notEqual(sites[2].mesh.material,source);assert.notEqual(sites[3].mesh.material,source);
  let originalDisposals=0,cloneDisposals=0;
  source.addEventListener('dispose',()=>originalDisposals++);
  sites[2].mesh.material.addEventListener('dispose',()=>cloneDisposals++);
  visibility.dispose();visibility.dispose();
  assert.equal(originalDisposals,0);assert.equal(cloneDisposals,1);
  for(const site of sites)assert.equal(site.mesh.material,source);
});
test('recorded music respects activation, scene changes, mute, background suspension and disposal',async()=>{
  let audio;
  class AudioMock {
    constructor(){audio=this;this.calls=0;this.paused=true;}
    async play(){this.calls++;this.paused=false;}
    pause(){this.paused=true;}
    removeAttribute(name){delete this[name];}
    load(){this.released=true;}
  }
  const {createRecordedMusic}=module('src/components/game/recorded-music.ts',{Audio:AudioMock,document:{hidden:false}});
  const music=createRecordedMusic();music.scene('city');assert.equal(audio.calls,0);
  music.volume(.3);await music.active(true);assert.equal(audio.calls,1);assert.equal(audio.volume,.3);
  music.scene('shop');assert.equal(audio.calls,1,'same recording continues');
  music.scene('nature');assert.equal(audio.calls,2);assert.equal(audio.src,'/audio/track-1.ogg');
  await music.active(false);assert.equal(audio.paused,true);music.scene('journey');assert.equal(audio.calls,2);
  await music.active(true);music.suspend();assert.equal(audio.paused,true);
  music.dispose();assert.equal(audio.released,true);assert.equal(audio.src,undefined);
});
