import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

const require = createRequire(import.meta.url);
const code = file => ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const receipt = {exports:{}};
vm.runInNewContext(code("src/lib/game/career-receipt.ts"),{exports:receipt.exports,require,Buffer});
const C = projectData("src/game/core/careers.ts");
const I = projectData("src/game/core/interview.ts");
const secret="test-only-secret-not-a-production-value-123456";
function harness({job={workplace:"goggle",role:"junior-dev"},ready=true}={}) {
  const calls=[];
  const sb={auth:{getUser:async()=>({data:{user:{id:"user-a"}}})},rpc:async(fn,args)=>{calls.push({fn,args});return {data:fn==="career_verified_ready"?ready:{pay:96,promoted:false,role:job.role},error:null};},from:(table)=>{const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:table==="billing_accounts"?{tier:"plus_experience",status:"active",period_end:null}:job,error:null})};return query;}};
  const exports={};
  const imports={"next/cache":{revalidatePath:()=>{}},zod:require("zod"),"@/game/core/careers":C,"@/game/core/interview":I,"@/game/core/homes":projectData("src/game/core/homes.ts"),"@/game/core/rng":projectData("src/game/core/rng.ts"),"@/lib/game/career-receipt":receipt.exports,"@/lib/social/server":{getSupabase:async()=>sb},"@/lib/stripe":{stripeLive:false}};
  vm.runInNewContext(code("src/app/games/careers/actions.ts"),{exports,require:name=>{if(!(name in imports))throw new Error(name);return imports[name];},process:{env:{BILLING_CALLBACK_SECRET:secret}},Date});
  return {actions:exports,calls};
}
const token = (overrides={}) => receipt.exports.issueCareerReceipt({user:"user-a",workplace:"goggle",role:"junior-dev",mode:"shift",seed:123,...overrides},secret,Date.now()-20000);

test("server reconstructs questions and marks answers; no browser score is accepted",async()=>{
  const h=harness();
  const tasks=C.buildShift(C.roleOf("goggle","junior-dev"),123);
  const result=await h.actions.completeCareerSession(token(),tasks.map(t=>t.answer));
  assert.equal(result.ok,true);
  const call=h.calls.find(c=>c.fn==="career_complete_verified");
  assert.equal(call.args.p_correct,5);
  assert.equal(Object.values(call.args.p_skills).reduce((n,v)=>n+v[1],0),5);
  assert.ok(call.args.p_duration_ms>=20000);
  const wrong=await h.actions.completeCareerSession(token(),tasks.map(t=>t.numeric?t.answer+1000:-1));
  assert.equal(wrong.ok,true);
  assert.equal(h.calls.at(-1).args.p_correct,0);
});

test("changed role, foreign receipt, wrong answer count and premature completion never reach reward RPC",async()=>{
  const cases=[{h:harness({job:{workplace:"goggle",role:"developer"}}),ticket:token(),answers:[0,0,0,0,0]},
    {h:harness(),ticket:token({user:"user-b"}),answers:[0,0,0,0,0]},
    {h:harness(),ticket:token(),answers:[0,0,0]},
    {h:harness(),ticket:receipt.exports.issueCareerReceipt({user:"user-a",workplace:"goggle",role:"junior-dev",mode:"shift",seed:123},secret),answers:[0,0,0,0,0]}];
  for(const {h,ticket,answers} of cases){assert.equal((await h.actions.completeCareerSession(ticket,answers)).ok,false);assert.equal(h.calls.length,0);}
});

test("starting work fails closed when migration readiness is absent",async()=>{
  const h=harness({ready:false});
  assert.equal((await h.actions.startCareerSession("goggle","shift")).ok,false);
  assert.equal(h.calls.length,1);
});

test("interviews are rebuilt from the seed and scored on the server; a weak interview is never hired",async()=>{
  const iv=I.buildInterviewPlan(I.companySpec(C.workplaceById("goggle")),123);
  const pick=(best)=>iv.questions.flatMap(q=>{const by=l=>l.reduce((b,a,i)=>(best?a.marks>l[b].marks:a.marks<l[b].marks)?i:b,0);
    if(q.star)return [by(q.star.situation),by(q.star.action),by(q.star.result)];if(q.ask)return [by(q.ask),-1];if(q.task)return [best?q.task.answer:-1];return [by(q.answers)];});
  const ticket=()=>receipt.exports.issueCareerReceipt({user:"user-a",workplace:"goggle",role:"junior-dev",mode:"interview",seed:123},secret,Date.now()-90000);
  const h=harness();
  const good=await h.actions.completeCareerSession(ticket(),pick(true));
  assert.equal(good.ok,true);assert.equal(good.data.card.passed,true);
  assert.equal(h.calls.at(-1).args.p_correct,5);
  const bad=await h.actions.completeCareerSession(ticket(),pick(false));
  assert.equal(bad.data.card.passed,false);assert.ok(h.calls.at(-1).args.p_correct<4);
  // Too quick to be a real interview, or the wrong number of answers: never reaches the database.
  const n=h.calls.length;
  assert.equal((await h.actions.completeCareerSession(receipt.exports.issueCareerReceipt({user:"user-a",workplace:"goggle",role:"junior-dev",mode:"interview",seed:123},secret,Date.now()-20000),pick(true))).ok,false);
  assert.equal((await h.actions.completeCareerSession(ticket(),pick(true).slice(1))).ok,false);
  assert.equal(h.calls.length,n);
});
