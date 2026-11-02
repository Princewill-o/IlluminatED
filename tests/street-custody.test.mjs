import test from 'node:test';
import assert from 'node:assert/strict';
import {projectData} from '../scripts/lib/project-data.mjs';
const core=projectData('src/game/core/street-custody.ts');
const caseFile={id:'case-1',npcName:'Alex',npcId:'city:resident:1',evidence:{playerHits:1,civilianHits:2}};
test('a court hearing is blocked until officers arrest and deliver the people involved',()=>{
  let state=core.beginStreetCustody(caseFile,1000);
  assert.equal(core.canHearStreetCase(caseFile,null),false);
  state=core.advanceStreetCustody(state,2000,true);assert.equal(state.stage,'responding');
  state=core.advanceStreetCustody(state,5000,false);assert.equal(state.stage,'responding');
  state=core.advanceStreetCustody(state,5000,true);assert.equal(state.stage,'arresting');
  assert.deepEqual(Array.from(state.participants),['player','civilian']);
  assert.equal(core.finishStreetTransport(state,10000),null);
  state=core.advanceStreetCustody(state,7999,true);assert.equal(state.stage,'arresting');
  state=core.advanceStreetCustody(state,8000,true);assert.equal(state.stage,'transport');
  assert.equal(core.finishStreetTransport(state,8001),null);
  const proof=core.finishStreetTransport(state,11200);assert.ok(proof);
  assert.equal(core.canHearStreetCase(caseFile,proof),true);
  assert.equal(core.canHearStreetCase({...caseFile,id:'other-case'},proof),false);
  assert.equal(core.canHearStreetCase(caseFile,{...proof,participants:['player']}),false);
  assert.equal(core.canHearStreetCase(caseFile,{...proof,arrestedAt:NaN}),false);
});
test('a victim who never hit back is not included in the arrest list',()=>{
  assert.deepEqual(Array.from(core.beginStreetCustody({...caseFile,evidence:{playerHits:1,civilianHits:0}},0).participants),['player']);
  assert.deepEqual(Array.from(core.beginStreetCustody({...caseFile,evidence:{playerHits:0,civilianHits:2}},0).participants),['civilian']);
});
