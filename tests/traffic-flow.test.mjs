import test from 'node:test';
import assert from 'node:assert/strict';
import {projectData} from '../scripts/lib/project-data.mjs';
const {trafficAdvance}=projectData('src/game/core/traffic-flow.ts');
const {frameMapCamera,projectCameraGround}=projectData('src/game/core/view-framing.ts');
test('traffic accelerates gradually, never crosses a blocked clearance and resumes without a jump',()=>{
  let speed=0,total=0;
  for(let i=0;i<60;i++){const step=trafficAdvance(speed,2.8,1/60,2.8/60);speed=step.speed;total+=step.distance;}
  assert.ok(total>.5&&total<1);
  assert.equal(trafficAdvance(speed,2.8,1/60,0).distance,0);
  assert.equal(trafficAdvance(speed,2.8,1/60,0).speed,0);
  assert.ok(trafficAdvance(0,2.8,10,10).distance<.02);
});
test('zoom changes camera distance while keeping the player visible at map edges',()=>{
  for(const indoors of [true,false]) for(const zoom of [.75,1,1.65]) for(const aspect of [.5,1,2.5]) for(const x of [.5,10,19.5]) for(const z of [.5,8,15.5]){
    const frame=frameMapCamera(x,z,20,16,aspect,indoors,{x,z},zoom);
    const point=projectCameraGround(frame,{x,z},aspect,indoors);
    assert.ok(Math.abs(point.x)<=.95&&Math.abs(point.y)<=.95);
    assert.ok(Number.isFinite(frame.height)&&frame.height>0);
  }
  assert.ok(frameMapCamera(56,44,112,88,1,false,{x:56,z:44},1.65).height<frameMapCamera(56,44,112,88,1,false,{x:56,z:44},.75).height);
});
