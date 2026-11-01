import test from 'node:test';
import assert from 'node:assert/strict';
import {projectData} from '../scripts/lib/project-data.mjs';
const {rescueFrame,rescuePatientPose,RESCUE_DURATION_MS}=projectData('src/game/core/rescue.ts');
test('the player remains down before responders arrive, is loaded through open doors and departs before hospital arrival',()=>{
  assert.equal(RESCUE_DURATION_MS,15000);
  for(const time of [0,1500,2999]){const frame=rescueFrame(time);assert.equal(frame.phase,'downed');assert.equal(frame.playerOnGround,true);assert.equal(frame.doors,0);assert.equal(frame.complete,false);}
  assert.equal(rescueFrame(3000).phase,'approaching');assert.equal(rescueFrame(6999).playerOnGround,true);
  for(const time of [8000,8500,9500]){const frame=rescueFrame(time);assert.equal(frame.phase,'loading');assert.equal(frame.doors,1);assert.equal(frame.stretcherVisible,true);assert.equal(frame.complete,false);}
  assert.equal(rescueFrame(11000).phase,'departing');assert.equal(rescueFrame(11000).doors,0);assert.equal(rescueFrame(11000).playerInAmbulance,true);
  assert.equal(rescueFrame(14999).complete,false);assert.equal(rescueFrame(15000).phase,'arrived');assert.equal(rescueFrame(15000).complete,true);
});
test('arrival and departure are monotonic and phase boundaries never jump the van',()=>{
  let previous=-Infinity;
  for(let time=0;time<=RESCUE_DURATION_MS;time+=50){const frame=rescueFrame(time);assert.ok(frame.ambulanceX>=previous);previous=frame.ambulanceX;assert.ok(frame.doors>=0&&frame.doors<=1);assert.ok(frame.loading>=0&&frame.loading<=1);}
  for(const boundary of [3000,7000,11000])assert.ok(Math.abs(rescueFrame(boundary).ambulanceX-rescueFrame(boundary-1).ambulanceX)<.02);
  assert.equal(rescueFrame(NaN).phase,'downed');assert.equal(rescueFrame(-100).ambulanceX,-13);
});

test('the stretcher lifts smoothly and passes fully inside the rear opening before the patient disappears',()=>{
  const rear=-1.12;
  const grounded=rescuePatientPose(rescueFrame(7900),rear),lifting=rescuePatientPose(rescueFrame(8250),rear),loaded=rescuePatientPose(rescueFrame(10000),rear);
  assert.equal(grounded.patientY,.24);assert.ok(lifting.patientY>grounded.patientY&&lifting.patientY<loaded.patientY);
  assert.ok(loaded.stretcherX-.725>rear,'full1.45tile stretcher clears the rear doorway');
  assert.ok(loaded.stretcherX+.725<rear+3,'stretcher remains within rear cabin');
  assert.equal(rescueFrame(10000).playerInAmbulance,true);
});
