import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";
const require=createRequire(import.meta.url), THREE=require("three");
const context=new Proxy({}, {get:()=>()=>{}});
const document={createElement:()=>({width:0,height:0,getContext:()=>context})};
function load(path) {
  const exports={};
  const js=ts.transpileModule(fs.readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(js,{exports,document,require:name=>name==="three"?THREE:projectData(name.replace("@/","src/")+".ts")});
  return exports;
}
const {riverGeometry,riverSurface}=load("src/components/game/world/water-style3d.ts");
const {addStreetscape}=load("src/components/game/world/streetscape3d.ts");
const {finishArchitecture}=load("src/components/game/world/architecture-finish3d.ts");
const {applyGroundStyle}=load("src/components/game/world/ground-style3d.ts");
test("water covers only river tiles and leaves sunken entrances dry",()=>{
  const geometry=riverGeometry(["wXX","-ww"]),p=geometry.getAttribute("position");
  assert.equal(p.count,18);
  for(let i=0;i<p.count;i+=6){const x=Math.min(...Array.from({length:6},(_,j)=>p.getX(i+j))),z=Math.min(...Array.from({length:6},(_,j)=>p.getZ(i+j)));assert.equal(["wXX","-ww"][z][x],"w");}
  const river=riverSurface("night",112,88);assert.equal(river.material.transparent,false);assert.equal(river.texture.image.width,256);river.dispose();geometry.dispose();
});
test("landscaping stays within a fixed geometry budget without changing navigation",()=>{
  const {CITY}=projectData("src/game/core/world.ts");
  const before=JSON.stringify([CITY.tiles,CITY.portals]);
  const group=addStreetscape(new THREE.Group(),CITY,"dusk"),geometries=new Set(),materials=new Set();let triangles=0;
  group.traverse(o=>{if(!o.isMesh)return;geometries.add(o.geometry);materials.add(o.material);triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
  assert.equal(JSON.stringify([CITY.tiles,CITY.portals]),before);
  assert.ok(group.userData.treeCount>=10);assert.ok(geometries.size<=3);assert.ok(materials.size<=16);assert.ok(triangles<24000);
  let disposals=0;for(const geometry of geometries)geometry.addEventListener("dispose",()=>disposals++);
  group.userData.dispose();group.userData.dispose();assert.equal(disposals,geometries.size);
});
test("building finish preserves curvature shaders and geometry while sharing texture resources",()=>{
  const world=new THREE.Group(),geometry=new THREE.BoxGeometry(),source=new THREE.MeshLambertMaterial({color:"#b9634a"});
  const callback=()=>{};source.onBeforeCompile=callback;
  const a=new THREE.Mesh(geometry,source),b=new THREE.Mesh(geometry,source);world.add(a,b);
  const dispose=finishArchitecture(world,"night");assert.equal(a.material,b.material);assert.notEqual(a.material,source);assert.equal(a.material.onBeforeCompile,callback);assert.equal(a.geometry,geometry);assert.equal(source.map,null);assert.equal(a.material.map.image.width,128);
  dispose();dispose();geometry.dispose();source.dispose();
});
test("ground atlas adds finite UVs without increasing geometry or material counts",()=>{
  const geometry=new THREE.PlaneGeometry(1,1).toNonIndexed();geometry.rotateX(-Math.PI/2);geometry.translate(.5,.12,.5);
  const color=new THREE.Color("#e9e1d0"),values=new Float32Array(geometry.attributes.position.count*3);
  for(let i=0;i<values.length;i+=3)color.toArray(values,i);geometry.setAttribute("color",new THREE.BufferAttribute(values,3));
  const material=new THREE.MeshLambertMaterial({vertexColors:true}),mesh=new THREE.Mesh(geometry,material),count=geometry.attributes.position.count;
  const dispose=applyGroundStyle(mesh);assert.equal(mesh.material,material);assert.equal(geometry.attributes.position.count,count);assert.equal(material.map.image.width,512);
  for(const value of geometry.attributes.uv.array)assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
  dispose();geometry.dispose();material.dispose();
});
