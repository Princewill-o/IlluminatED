import test from 'node:test';
import assert from 'node:assert/strict';
import { projectData } from '../scripts/lib/project-data.mjs';
const conflict=projectData('src/game/core/civilian-conflict.ts');
const law=projectData('src/game/core/law.ts');
const storage=projectData('src/game/core/life-storage.ts');
function defence() {
  let encounter=conflict.beginStreetEncounter({npcId:'city:resident:7',npcName:'Alex',at:1000,seed:42,witnesses:2});
  encounter=conflict.recordStreetHit(encounter,{attacker:'civilian',damage:9,at:3000});
  return conflict.recordStreetHit(encounter,{attacker:'player',damage:12,at:3500});
}
test('only a stable minority of civilians are hostile and windup telegraphs an attack',()=>{
  const entries=Array.from({length:1200},(_,i)=>conflict.civilianDisposition('civilian-'+i,123));
  const hostile=entries.filter(e=>e.hostile).length;
  assert.ok(hostile>30&&hostile<180,`hostile minority: ${hostile}/1200`);
  assert.deepEqual(conflict.civilianDisposition('same-id',123),conflict.civilianDisposition('same-id',123));
  assert.ok(entries[0].warning.includes('walk away'));assert.ok(entries[0].windupMs>=2000);
  for(let i=0;i<100;i++)for(const role of ['staff','player'])assert.equal(conflict.civilianDisposition('person-'+i,0,role).hostile,false);
});
test('the first actual landed hit fixes provenance; invalid or stale hits do not rewrite it',()=>{
  const empty=conflict.beginStreetEncounter({npcId:'alex',npcName:'Alex',at:1000});
  for(const hit of [{attacker:'civilian',damage:0,at:1000},{attacker:'civilian',damage:-1,at:1000},{attacker:'civilian',damage:9,at:900},{attacker:'civilian',damage:NaN,at:1000}])assert.equal(conflict.recordStreetHit(empty,hit),empty);
  const started=conflict.recordStreetHit(empty,{attacker:'player',damage:8,at:2000});
  const defended=conflict.recordStreetHit(started,{attacker:'civilian',damage:9,at:2500});
  assert.equal(conflict.streetEvidence(defended).firstAttacker,'player');assert.equal(empty.hits.length,0);
  const assessment=conflict.assessStreetEncounter(defended,()=>0);
  assert.equal(assessment.kind,'aggression');assert.equal(assessment.offence,'scuffle');assert.equal(assessment.caseFile.evidence.firstAttacker,'player');
});
test('a prompt limited defensive response does not automatically produce stars or a court case',()=>{
  const encounter=defence(),evidence=conflict.streetEvidence(encounter),assessment=conflict.assessStreetEncounter(encounter,()=>.99);
  assert.equal(evidence.firstAttacker,'civilian');assert.equal(evidence.proportionate,true);assert.equal(evidence.durationMs,500);
  assert.equal(assessment.kind,'defence');assert.equal(assessment.offence,undefined);assert.equal(assessment.caseFile,undefined);
  const noResponse=conflict.recordStreetHit(conflict.beginStreetEncounter({npcId:'a',npcName:'A',at:0}),{attacker:'civilian',damage:9,at:2000});
  assert.equal(conflict.assessStreetEncounter(noResponse,()=>0).kind,'no-case');
});
test('innocent contested defence can win with no fine, loss of wallet or custody',()=>{
  const assessment=conflict.assessStreetEncounter(defence(),()=>0);
  assert.equal(assessment.kind,'contested');assert.equal(assessment.offence,undefined);assert.ok(assessment.caseFile.acquittalChance>.9);
  const verdict=conflict.adjudicateStreetCase(assessment.caseFile,'contest',()=>0);
  const resolution=conflict.settleStreetVerdict(verdict,15,10000);
  assert.equal(resolution.outcome,'acquitted');assert.equal(resolution.balance,15);assert.equal(resolution.finePaid,0);assert.equal(resolution.jailUntil,0);
});
test('losing a case offers a payable fine instead of automatically imposing prison',()=>{
  const caseFile=conflict.assessStreetEncounter(defence(),()=>0).caseFile;
  const verdict=conflict.adjudicateStreetCase(caseFile,'contest',()=>.999);
  assert.equal(verdict.outcome,'fine');assert.ok(verdict.fine>0);
  const resolution=conflict.settleStreetVerdict(verdict,verdict.fine+5,10000);
  assert.equal(resolution.outcome,'paid');assert.equal(resolution.balance,5);assert.equal(resolution.finePaid,verdict.fine);assert.equal(resolution.jailUntil,0);
});
test('inability to afford a lost-case fine preserves the wallet and uses the existing jail timer',()=>{
  const caseFile=conflict.assessStreetEncounter(defence(),()=>0).caseFile;
  const verdict=conflict.adjudicateStreetCase(caseFile,'admit');
  const balance=verdict.fine-1,resolution=conflict.settleStreetVerdict(verdict,balance,10000);
  assert.equal(resolution.outcome,'jailed');assert.equal(resolution.balance,balance);assert.equal(resolution.finePaid,0);assert.equal(resolution.jailUntil,10000+law.sentenceMs(caseFile.stars));
});
test('retaliation after a threat stops remains evidence even if the civilian later attacks again',()=>{
  let encounter=defence();encounter=conflict.endCivilianThreat(encounter,4000);
  encounter=conflict.recordStreetHit(encounter,{attacker:'player',damage:12,at:7000});
  encounter=conflict.recordStreetHit(encounter,{attacker:'civilian',damage:9,at:8000});
  const evidence=conflict.streetEvidence(encounter);
  assert.equal(evidence.hitsAfterThreatEnded,1);assert.equal(evidence.proportionate,false);
  assert.equal(conflict.assessStreetEncounter(encounter,()=>.99).kind,'contested');
});
test('case adjudication is seeded and the pending evidence survives account life storage',()=>{
  const caseFile=conflict.assessStreetEncounter(defence(),()=>0).caseFile;
  assert.deepEqual(conflict.adjudicateStreetCase(caseFile,'contest'),conflict.adjudicateStreetCase(caseFile,'contest'));
  const state={...law.freshLife(),hearing:{stars:caseFile.stars,charge:caseFile.charge,streetCase:caseFile}};
  const data=new Map([[storage.lifeStorageKey('student'),JSON.stringify(state)]]);
  const restored=storage.readAccountLife({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},'student',11000);
  assert.equal(restored.hearing.streetCase.id,caseFile.id);assert.deepEqual(JSON.parse(JSON.stringify(restored.hearing.streetCase.evidence)),JSON.parse(JSON.stringify(caseFile.evidence)));
});
