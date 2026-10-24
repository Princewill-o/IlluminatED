import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

const exports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/components/game/world/vehicle-animation.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports, require:name=>name==="three"?THREE:projectData(name.replace("@/","src/")+".ts"),
});
const {rigVehicle,animateVehicle,disposeVehicle}=exports;
const {motionDynamics,restingMotion}=projectData("src/game/core/motion-dynamics.ts");

test("secondary motion is bounded for turns, acceleration, pauses and invalid inputs",()=>{
  let state=restingMotion();
  for(const dt of [0,1/60,.05,10,NaN])for(const speed of [-1e6,0,3,1e6,NaN]){
    state=motionDynamics(state,speed,1e8,dt);
    assert.ok(Number.isFinite(state.speed));
    assert.ok(Math.abs(state.pitch)<=.065&&Math.abs(state.bank)<=.1);
    const reduced=motionDynamics(state,speed,4,dt,true);
    assert.equal(reduced.pitch,0);assert.equal(reduced.bank,0);
  }
});

test("real car assets gain independent wheels without changing cached geometry or footprint",async()=>{
  for(const name of ["sedan","taxi","suv","van","delivery","police"]){
    const bytes=fs.readFileSync(`public/world3d/cars/${name}.glb`);
    const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"");
    const source=asset.scene, car=source.clone(true);
    const before=new THREE.Box3().setFromObject(car);
    const sourceMeshes=[];source.traverse(o=>{if(o.isMesh)sourceMeshes.push(o);});
    const sourceGeometry=sourceMeshes.map(o=>o.geometry);
    const sourceMaterials=sourceMeshes.map(o=>o.material);
    const rig=rigVehicle(car);
    const wheels=[];car.traverse(o=>{if(o.name==="animated-wheel")wheels.push(o);});
    assert.equal(wheels.length,8,`${name}: four tyres and four hubs`);
    const after=new THREE.Box3().setFromObject(car);
    assert.ok(after.min.distanceTo(before.min)<1e-5&&after.max.distanceTo(before.max)<1e-5);
    assert.deepEqual(sourceMeshes.map(o=>o.geometry),sourceGeometry);
    assert.deepEqual(sourceMeshes.map(o=>o.material),sourceMaterials);
    rig.update(.3,3,0,1/60,1,true,false);
    const spin=wheels[0].rotation.x;assert.notEqual(spin,0);
    rig.update(0,0,0,1/60,2,true,false);
    assert.equal(wheels[0].rotation.x,spin,"stopped car keeps stationary wheels");
    rig.update(1,8,2,1/60,3,true,true);
    assert.equal(wheels[0].rotation.x,0);assert.equal(car.rotation.x,0);assert.equal(car.rotation.z,0);
    const root=new THREE.Group();root.add(car);root.userData.vehicleRig=rig;
    animateVehicle(root,1/60,4,true,false);
    root.position.x=100;animateVehicle(root,1/60,5,true,false);
    assert.equal(wheels[0].rotation.x,spin,"teleport adds no wheel rotation");
    disposeVehicle(root);disposeVehicle(root);
  }
});

test("the existing bus uses its own longitudinal wheel axis",async()=>{
  const bytes=fs.readFileSync("public/world3d/bus.glb");
  const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"");
  const rig=rigVehicle(asset.scene,2.4,"x");
  const wheels=[];asset.scene.traverse(o=>{if(o.name==="animated-wheel")wheels.push(o);});
  assert.equal(wheels.length,8);
  rig.update(.2,2,0,1/60,1,false,false);
  assert.notEqual(wheels[0].rotation.z,0);
  assert.equal(wheels[0].rotation.x,0);
  rig.dispose();
});
