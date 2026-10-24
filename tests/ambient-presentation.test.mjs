import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import * as THREE from "three";
import ts from "typescript";

function load(file) {
  const exports={};
  const source=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,require:name=>name==="three"?THREE:load(path.resolve(path.dirname(file),`${name}.ts`))});
  return exports;
}
const {environmentPalette,weatherLighting}=load("src/components/game/world/environment-palette.ts");
const {ambientLife}=load("src/components/game/world/ambient-life.ts");
const {createAtmosphere,atmosphereShader}=load("src/components/game/world/atmosphere.ts");

test("time and weather use coherent lighting palettes with night-time reflections and wetness",()=>{
  const day=environmentPalette("day"),night=environmentPalette("night");
  assert.ok(new THREE.Color(day.zenith).getHSL({}).l>new THREE.Color(night.zenith).getHSL({}).l);
  assert.ok(night.environment<day.environment&&night.glow>day.glow);
  assert.equal(weatherLighting("Sunny").wetness,0);
  assert.equal(weatherLighting("Light rain").rain,1);
  assert.ok(weatherLighting("Light rain").sun<weatherLighting("Sunny").sun);
  assert.equal(weatherLighting("Snow").rain,0);
  assert.equal(weatherLighting("Fog").haze,1);
});

test("fog and backdrop share the same palette and clear their owned resources",()=>{
  const scene=new THREE.Scene();scene.background=new THREE.Color();scene.fog=new THREE.Fog(0,34,70);
  const haze=createAtmosphere(scene,"day");
  haze.resize(1280,720);
  haze.update("night",1,Infinity);
  assert.ok(scene.fog.color.equals(scene.background));
  assert.equal(scene.fog.near,18);assert.equal(scene.fog.far,46);
  const shader={uniforms:{},fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  atmosphereShader(shader);
  assert.ok(shader.uniforms.uHazeCentre.value.equals(scene.fog.color));
  assert.ok(shader.fragmentShader.includes("mix( gl_FragColor.rgb, cityHazeColour(), fogFactor )"));
  assert.equal(shader.fragmentShader.split("vec3 cityHazeColour()").length,2);
  let released=0;scene.children[0].material.addEventListener("dispose",()=>released++);
  haze.dispose();assert.equal(scene.children.length,0);assert.equal(released,1);
});

test("ambient life keeps a fixed budget, follows nearby lamps and preserves static light with reduced motion",()=>{
  for(const mobile of [true,false]){
    const world=new THREE.Group(),camera=new THREE.PerspectiveCamera();
    const lamps=Array.from({length:200},(_,i)=>new THREE.Vector3(i,3,0));
    const life=ambientLife(world,lamps,mobile);
    life.update(2,3,0,camera,1,false,.05);
    const count=life.motes.geometry.getAttribute("position").count;
    assert.equal(count,mobile?24:72);
    const instanced=life.group.children.filter(child=>child.isInstancedMesh);
    assert.equal(instanced.length,2);
    assert.ok(instanced.every(mesh=>mesh.count<=(mobile?6:16)));
    const before=life.motes.geometry.attributes.position.array.slice();
    life.update(3,3,0,camera,1,true,.05);
    assert.equal(life.motes.visible,false);
    assert.ok(instanced.every(mesh=>mesh.visible),"static lamp light remains enabled");
    assert.deepEqual(life.motes.geometry.attributes.position.array,before,"decorative particles stop");
    life.update(4,180,0,camera,1,false,.05);
    assert.equal(life.motes.geometry.attributes.position.count,count,"walking across town cannot grow the buffer");
    assert.ok(life.motes.geometry.attributes.position.array.every(Number.isFinite));
    life.dispose();life.dispose();assert.equal(world.children.length,0);
  }
});
