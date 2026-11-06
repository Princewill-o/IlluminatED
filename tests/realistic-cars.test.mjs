import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { projectData } from "../scripts/lib/project-data.mjs";

const core=projectData("src/game/core/realistic-cars.ts");
const {CAR_LENGTH,CAR_WIDTH}=projectData("src/game/core/vehicles.ts");
const {CARS}=projectData("src/game/core/cars.ts");
function glbJSON(file){const raw=fs.readFileSync(file),size=raw.readUInt32LE(12);return JSON.parse(raw.subarray(20,20+size).toString());}
async function load(url){const raw=fs.readFileSync(`public${url}`);return new Promise((resolve,reject)=>new GLTFLoader().parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),"",resolve,reject));}

test("garage and ambient cars use supplied models, with dedicated emergency vehicle assets",()=>{
  for(const id of [...CARS.map(c=>c.id),"hatchback","sports","taxi","police","ambulance","delivery","unknown-car"]){
    const asset=core.realisticCarAsset(id);assert.match(asset,/^\/world3d\/(cars-realistic|cars-blender|emergency)\//);assert.ok(fs.existsSync(`public${asset}`),id);
  }
  assert.equal(core.realisticCarModel("van"),"NormalCar2");
  assert.equal(core.realisticCarModel("cab"),"Taxi");
});
test("converted solid-color car materials are opaque rather than zero-alpha FBX imports",()=>{
  for(const model of core.REALISTIC_CAR_MODELS){
    const json=glbJSON(`public/world3d/cars-realistic/${model}.glb`);
    assert.equal(json.images?.length??0,0);
    for(const material of json.materials){assert.equal(material.alphaMode,"OPAQUE",`${model}: ${material.name}`);assert.equal(material.pbrMetallicRoughness.baseColorFactor[3],1);}
  }
});
test("realistic model placement keeps original proportions, faces the road and fits driving collisions",async()=>{
  const exports={};const source=ts.transpileModule(fs.readFileSync("src/components/game/world/realistic-car3d.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,require:name=>name==="three"?THREE:core});
  for(const model of core.REALISTIC_CAR_MODELS){
    const group=new THREE.Group();let styled=false;
    const car=await exports.placeRealisticCar(group,model,load,()=>{styled=true;});
    const bounds=new THREE.Box3().setFromObject(car),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    assert.ok(styled);assert.ok(size.x>size.z,`${model}: long axis is the direction of travel`);
    assert.ok(size.x<=CAR_LENGTH+1e-6&&size.z<=CAR_WIDTH+1e-6,model);
    assert.equal(car.scale.x,car.scale.y);assert.equal(car.scale.y,car.scale.z);
    assert.ok(Math.abs(center.x)<1e-6&&Math.abs(center.z)<1e-6&&Math.abs(bounds.min.y)<1e-6,`${model}: grounded and centred`);
    assert.equal(group.children[0],car);
  }
  assert.throws(()=>core.realisticCarScale({x:0,z:1}));assert.throws(()=>core.realisticCarScale({x:1,z:Infinity}));
});
