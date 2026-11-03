import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as THREE from "three";
import ts from "typescript";
import {projectData} from "../scripts/lib/project-data.mjs";
const {presentSceneFrame}=projectData("src/components/game/world/present-frame.ts");
const exports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/components/game/world/scene-setup.ts","utf8"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,{exports,require:name=>name==="three"?THREE:{environmentPalette:()=>({})}});
const {followSun}=exports;

test("resolution changes cannot publish or leave a cleared canvas after the presented frame",()=>{
  const canvas={pixels:"previous"},events=[];let ratio=1;
  const renderer={domElement:canvas,getPixelRatio:()=>ratio,setPixelRatio(next){ratio=next;canvas.pixels="cleared";events.push("resize");}};
  const presentation={render(){canvas.pixels="complete scene";events.push("draw");}};
  const capture={frame(frame){assert.equal(frame.pixels,"complete scene");events.push("publish");}};
  const fit=()=>{canvas.pixels="cleared";events.push("fit");};
  for(const target of [.8,.7,.85,1]){
    events.length=0;presentSceneFrame(renderer,presentation,capture,fit,target);
    assert.deepEqual(events,["resize","fit","draw","publish"]);
    assert.equal(canvas.pixels,"complete scene","the browser sees a drawn frame at callback completion");
  }
  for(const target of [1,1.001,null,NaN,-1]){
    events.length=0;presentSceneFrame(renderer,presentation,capture,fit,target);
    assert.deepEqual(events,["draw","publish"],"unchanged/invalid ratios cannot clear or reallocate buffers");
  }
});

test("sub-texel walking does not slide the sun shadow projection",()=>{
  const sun=new THREE.DirectionalLight();
  Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20});sun.shadow.mapSize.set(1024,1024);
  const right=new THREE.Vector3(12,0,10).normalize(),texel=40/1024;
  followSun(sun,new THREE.Vector3());const origin=sun.target.position.clone();
  followSun(sun,right.clone().multiplyScalar(texel*.2));
  assert.ok(sun.target.position.distanceTo(origin)<1e-10,"tiny camera/player movement stays in one shadow cell");
  followSun(sun,right.clone().multiplyScalar(texel*1.1));
  assert.ok(Math.abs(sun.target.position.dot(right)-texel)<1e-10);
});

test("shadow snapping stays bounded and preserves the sun direction across maps and elevations",()=>{
  const sun=new THREE.DirectionalLight();
  Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20});sun.shadow.mapSize.set(1024,1024);
  for(const focus of [new THREE.Vector3(40,0,35),new THREE.Vector3(600,2,700),new THREE.Vector3(-45,4,-60)]){
    const before=focus.clone();followSun(sun,focus);
    assert.ok(sun.target.position.distanceTo(focus)<=Math.SQRT2*20/1024+1e-9);
    const expected=new THREE.Vector3(-10,22-focus.y,12);
    assert.ok(sun.position.clone().sub(sun.target.position).distanceTo(expected)<1e-9);
    assert.ok(focus.equals(before));
  }
});
