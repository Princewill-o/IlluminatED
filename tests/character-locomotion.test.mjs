import assert from "node:assert/strict";
import test from "node:test";
import {projectData} from "../scripts/lib/project-data.mjs";
const {characterSpeed,locomotionClip}=projectData("src/game/core/character-locomotion.ts");

test("repeated physics snapshots cannot make a steady walker alternate into sprint",()=>{
  let speed=0,clip="walk";
  for(let frame=0;frame<240;frame++){
    speed=characterSpeed(speed,(frame%2?6:0)/60,1/60);
    clip=locomotionClip(true,speed,clip);
    assert.equal(clip,"walk");
  }
  assert.ok(speed>2.6&&speed<3.4);
});
test("steady movement converges at30/60/144Hz and real sprint responds within200ms",()=>{
  for(const fps of [30,60,144]){
    let speed=0;
    for(let frame=0;frame<fps*2;frame++)speed=characterSpeed(speed,3/fps,1/fps);
    assert.ok(Math.abs(speed-3)<.001);
  }
  let speed=0,clip="walk";
  for(let frame=0;frame<12;frame++){speed=characterSpeed(speed,5.5/60,1/60);clip=locomotionClip(true,speed,clip);}
  assert.equal(clip,"sprint");
});
test("gait hysteresis prevents boundary chatter and stopping selects idle immediately",()=>{
  for(const speed of [4.1,4.5,4.2,4.4]){
    assert.equal(locomotionClip(true,speed,"walk"),"walk");
    assert.equal(locomotionClip(true,speed,"sprint"),"sprint");
  }
  assert.equal(locomotionClip(true,3.7,"sprint"),"walk");
  assert.equal(locomotionClip(false,8,"sprint"),"idle");
});
test("travel, suspension and invalid samples cannot inject enormous animation velocity",()=>{
  for(const [distance,dt] of [[3,1/60],[.1,0],[.1,NaN],[Infinity,.016],[.1,1],[-1,.016]])assert.equal(characterSpeed(5,distance,dt),0);
  assert.ok(Number.isFinite(characterSpeed(NaN,.05,1/60)));
  assert.equal(locomotionClip(true,NaN,"sprint"),"walk");
});
