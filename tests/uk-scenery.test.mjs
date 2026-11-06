import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import {projectData} from '../scripts/lib/project-data.mjs';

function sceneryModule(){
  const exports={};
  const js=ts.transpileModule(fs.readFileSync('src/components/game/world/uk-scenery.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(js,{exports,require:name=>{if(name==='three')return THREE;if(name==='./university3d')return {universityLandmark(){}};throw new Error(name);}});
  return exports;
}
const uk=projectData('src/game/core/uk-world.ts');

test('regional facades keep each authored building height and plot, with distinctive local housing details',()=>{
  const {ukBuildingPlan}=sceneryModule();
  const details=new Set();
  for(const id of ['kent','nottingham','birmingham','manchester','edinburgh']){
    const scene=uk.buildUKScene(id);
    for(const building of scene.things.filter(t=>t.kind==='building')){
      const plan=ukBuildingPlan(id,building);
      assert.ok(plan.height>=building.height);
      assert.ok(plan.x>=building.x&&plan.z>=building.y);
      assert.ok(plan.x+plan.width<=building.x+building.w);
      assert.ok(plan.z+plan.depth<=building.y+building.h);
      assert.equal(plan.wall,building.colour);
      assert.equal(plan.roof,building.roof);
      details.add(plan.detail);
    }
  }
  assert.equal(details.size,5);
});

test('tunnel cutaway opens only nearby roof sections and keeps distant tunnel roof intact',()=>{
  const {tunnelRoofVisible}=sceneryModule();
  assert.equal(tunnelRoofVisible(48,49,14),false);
  assert.equal(tunnelRoofVisible(48,49,25),false);
  assert.equal(tunnelRoofVisible(25,80,14),true);
  assert.equal(tunnelRoofVisible(48,49,14,true),true);
});

test('regional traffic queues for actual vehicles and pedestrians without London signal coordinates',()=>{
  const {regionalTrafficClearance}=sceneryModule();
  const car={id:'ambient-1',x:20,y:21,heading:0,length:3,width:1.4};
  assert.equal(regionalTrafficClearance(car,.1,[],[]),.1);
  assert.equal(regionalTrafficClearance(car,.1,[{...car,id:'front',x:23}],[]),0);
  assert.equal(regionalTrafficClearance(car,.1,[],[{x:21.7,y:21}]),0);
  assert.equal(regionalTrafficClearance(car,.1,[{...car,id:'other-lane',x:23,y:23,heading:Math.PI}],[]),.1);
  assert.equal(regionalTrafficClearance(car,NaN,[],[]),0);
});
