import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import { projectData } from "../scripts/lib/project-data.mjs";

const source = fs.readFileSync("src/lib/game/career-receipt.ts","utf8");
const moduleCode = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {issueCareerReceipt,readCareerReceipt} = await import(`data:text/javascript;base64,${Buffer.from(moduleCode).toString("base64")}`);
const secret = "test-only-secret-not-a-production-value-123456";
const now = 1_800_000_000_000;
const data = {user:"learner-a",workplace:"goggle",role:"junior-dev",mode:"shift",seed:123};

test("career receipts bind user, mode, seed and server start time",()=>{
  const token = issueCareerReceipt(data,secret,now);
  const receipt = readCareerReceipt(token,data.user,secret,now+20000);
  assert.equal(receipt.seed,123);
  assert.equal(receipt.started,now);
  assert.equal(receipt.mode,"shift");
  assert.notEqual(receipt.id,readCareerReceipt(issueCareerReceipt(data,secret,now),data.user,secret,now).id);
  assert.equal(readCareerReceipt(token,"learner-b",secret,now),null);
  assert.equal(readCareerReceipt(token,data.user,"other-secret-that-is-at-least-32-chars",now),null);
  assert.equal(readCareerReceipt(token,data.user,secret,now+3600001),null);
  assert.equal(readCareerReceipt(token,data.user,secret,now-1),null);
  const [body,sig] = token.split(".");
  const forged = JSON.parse(Buffer.from(body,"base64url")); forged.seed=999;
  assert.equal(readCareerReceipt(`${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${sig}`,data.user,secret,now),null);
  assert.equal(readCareerReceipt(`${token}.extra`,data.user,secret,now),null);
});

test("release configuration checks never report untested integrations as verified",()=>{
  const L = projectData("src/lib/launch-readiness.ts");
  assert.ok(L.launchReadiness({}).every(check=>!check.ready));
  const checks=L.launchReadiness({BILLING_CALLBACK_SECRET:secret});
  assert.equal(checks.find(c=>c.id==="signing").ready,true);
  assert.equal(checks.find(c=>c.id==="billing").ready,false);
  assert.ok(!JSON.stringify(checks).includes(secret));
  assert.ok(L.MANUAL_RELEASE_GATES.length>=7);
});
