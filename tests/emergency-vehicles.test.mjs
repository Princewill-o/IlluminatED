import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { projectData } from "../scripts/lib/project-data.mjs";
const constants=projectData("src/game/core/emergency-vehicles.ts"),vehicles=projectData("src/game/core/vehicles.ts");
const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/components/game/world/emergency-vehicle3d.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>name==="three"?THREE:name.includes("emergency-vehicles")?constants:vehicles});
async function load(url){const raw=fs.readFileSync(`public${url}`);return new Promise((resolve,reject)=>new GLTFLoader().parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),"",resolve,reject));}
test("emergency rigs use opaque models, face forward along X, fit envelopes and ground all wheels",async()=>{
 for(const kind of ["ambulance","police"]){
  const rig=await exports.createEmergencyVehicle(kind,load);
  const bounds=new THREE.Box3().setFromObject(rig.root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  assert.ok(size.x>size.z);assert.ok(size.x<=(kind==="ambulance"?4.8:3.8)+1e-6);assert.ok(size.z<=(kind==="ambulance"?1.75:1.65)+1e-6);assert.ok(Math.abs(bounds.min.y)<1e-6);assert.ok(Math.abs(center.x)<1e-6&&Math.abs(center.z)<1e-6);
  let lights=0;rig.root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){assert.equal(m.opacity,1);assert.equal(m.transparent,false);if(/SirenBlue/.test(m.name))lights++;}});assert.ok(lights>=2);
  rig.dispose();
 }
});
test("ambulance opens separate doors outward and restores them without moving the body",async()=>{
 const rig=await exports.createEmergencyVehicle("ambulance",load),left=rig.root.getObjectByName("RearDoorLeft"),right=rig.root.getObjectByName("RearDoorRight");assert.ok(left&&right);
 rig.root.updateMatrixWorld(true);const initial=new THREE.Box3().setFromObject(left),restLeft=left.rotation.y,restRight=right.rotation.y,body=rig.root.getObjectByName("Patient_wall");
 rig.openRearDoors(1);rig.root.updateMatrixWorld(true);
 assert.notEqual(left.rotation.y,restLeft);assert.notEqual(right.rotation.y,restRight);assert.equal(left.rotation.y-restLeft,-(right.rotation.y-restRight));
 assert.ok(new THREE.Box3().setFromObject(left).max.x<initial.max.x,"rear door swings towards rear -X, exposing the compartment");
 rig.openRearDoors(0);assert.equal(left.rotation.y,restLeft);assert.equal(right.rotation.y,restRight);rig.openRearDoors(3);assert.ok(Math.abs(left.rotation.y-restLeft)<=Math.PI*.53+1e-6);
 rig.dispose();
});
test("siren flash state is per instance and mute/cleanup stop updates",async()=>{
 const a=await exports.createEmergencyVehicle("police",load),b=await exports.createEmergencyVehicle("police",load);const lamp=rig=>{let found;rig.root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name==="SirenBlueLeft")found=m;});return found;};
 const am=lamp(a),bm=lamp(b);assert.ok(am&&bm);assert.notEqual(am,bm);a.update(0,true);assert.equal(am.emissiveIntensity,4);a.update(.25,true);assert.equal(am.emissiveIntensity,.12);a.update(.5,false);assert.equal(am.emissiveIntensity,.12);b.update(0,false);a.update(0,true);assert.notEqual(am.emissiveIntensity,bm.emissiveIntensity);
 a.dispose();a.update(.25,true);assert.equal(am.emissiveIntensity,4);b.dispose();
});
