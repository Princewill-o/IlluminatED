import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { projectData } from '../scripts/lib/project-data.mjs';
const logos=projectData('src/game/core/logos.ts');
const C=projectData('src/lib/illum-world/role-contracts.ts');
test('three original in-game roles have short contracts whose duration equals the lesson shifts',()=>{
 assert.equal(C.ROLE_CONTRACTS.length,3);
 for(const c of C.ROLE_CONTRACTS){
  assert.equal(c.workplace,'Microsoft');
  assert.ok(logos.logoFor(c.workplaceId), `Missing game logo for ${c.workplace}`);
  assert.equal(c.shifts.length,3);assert.ok(C.contractMinutes(c)>=20&&C.contractMinutes(c)<=30);
  assert.equal(new Set(c.shifts.map(s=>s.id)).size,3);
  assert.ok(c.sources.every(s=>s.url.startsWith('https://www.coursera.org/')&&s.provider==='Microsoft'));
  for(const s of c.shifts){assert.ok(s.steps.length>=3);assert.equal(s.questions.length,3);for(const q of s.questions){assert.ok(q.options[q.answer]);assert.ok(q.explanation.length>30);}}
 }
 assert.equal(C.contractMinutes(C.roleContract('data-analyst')),24);
 assert.equal(C.roleContract('not-a-role'),null);
});
test('certificates require all shift checks, not a client supplied complete or score flag',()=>{
 const c=C.roleContract('data-analyst');
 assert.equal(C.markContract(c,{}).complete,false);
 assert.equal(C.markContract(c,{complete:true,score:100}).complete,false);
 const good=Object.fromEntries(c.shifts.map(s=>[s.id,s.questions.map(q=>q.answer)]));
 assert.equal(C.markContract(c,good).complete,true);assert.equal(C.markContract(c,good).correct,9);
 const bad={...good,[c.shifts[1].id]:[99,1,'0']};assert.equal(C.markContract(c,bad).complete,false);
 const missing={...good};delete missing[c.shifts[2].id];assert.equal(C.markContract(c,missing).complete,false);
 good.forged=[0,0,0];assert.equal(C.markContract(c,good).total,9);
});
test('progress normalisation rejects unknown shifts, coerced answers and forged rewards',()=>{
 const c=C.roleContract('business-analyst');const n=C.normaliseContractAnswers(c,{[c.shifts[0].id]:['1',null,100],forged:[0,0,0],approved:true});
 assert.equal(Object.keys(n).length,3);assert.deepEqual(Array.from(n[c.shifts[0].id]),[-1,-1,-1]);assert.equal(n.approved,undefined);
});
test('role-course certificate route regrades submitted answers and embeds IlluminatED branding',()=>{
 const route=fs.readFileSync('src/app/api/world/contracts/[role]/certificate/route.ts','utf8');
 assert.match(route,/markContract/);assert.match(route,/\.complete/);assert.match(route,/makeRoleCertificate/);
 const pdf=fs.readFileSync('src/lib/illum-world/role-certificate.ts','utf8');assert.match(pdf,/embedPng/);assert.match(pdf,/IlluminatED/);assert.match(pdf,/in-game/i);assert.doesNotMatch(pdf,/Microsoft certified|Coursera certified/i);
});
