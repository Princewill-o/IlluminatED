import assert from "node:assert/strict";
import test from "node:test";
import { projectData } from "../scripts/lib/project-data.mjs";
const {frameBudget,graphicsBudget}=projectData("src/game/core/frame-budget.ts");

test("high-refresh displays cannot multiply game updates beyond 60 per second",()=>{
  for(const refresh of [30,60,75,120,144,165,240]) {
    const due=frameBudget(60);let frames=0,last=0,distance=0;
    for(let i=0;i<refresh*10;i++) {
      const now=i*1000/refresh;
      if(due(now)){frames++;distance+=(now-last)/1000*96;last=now;}
    }
    assert.ok(frames<=601,`${refresh}Hz: ${frames} updates`);
    assert.ok(frames>=Math.min(refresh,60)*10-2,`${refresh}Hz: no accidental halving`);
    assert.ok(distance>=950&&distance<=960,`${refresh}Hz: real-time movement ${distance}`);
  }
});

test("returning from a suspended tab cannot build a backlog of catch-up frames",()=>{
  const due=frameBudget();assert.equal(due(0),true);assert.equal(due(5),false);
  assert.equal(due(60000),true);assert.equal(due(60001),false);assert.equal(due(60017),true);
});

test("the single graphics budget retains all high-detail residents, cyclists and lights",()=>{
  const budget=graphicsBudget();
  assert.equal(budget.residents,14);
  assert.equal(budget.cyclists,4);
  assert.equal(budget.lights,2);
});
