import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {projectData} from "../scripts/lib/project-data.mjs";

const {SUBJECT_PACKS,ALL_SUBJECT_PACKS,findSubjectPack,gradePack,practiceSet,racePoints}=projectData("src/lib/learning/packs.ts");

test("draft saves are serialised and a failed request does not block a later revision",async()=>{
  const {createSaveQueue}=projectData("src/lib/learning/save-queue.ts");
  const queue=createSaveQueue();const events=[];
  let release;
  const wait=new Promise(resolve=>{release=resolve;});
  const older=queue.enqueue(async()=>{events.push("older started");await wait;events.push("older saved");});
  const newer=queue.enqueue(async()=>{events.push("newer saved");});
  await Promise.resolve();assert.deepEqual(events,["older started"]);
  release();await Promise.all([older,newer]);await queue.settled();
  assert.deepEqual(events,["older started","older saved","newer saved"]);
  await assert.rejects(queue.enqueue(async()=>{throw new Error("network failed");}));
  await queue.enqueue(async()=>{events.push("retry saved");});
  assert.equal(events.at(-1),"retry saved");
});

test("each product has three usable mini-packs, eight marked questions and worked reasoning",()=>{
  assert.equal(SUBJECT_PACKS.length,9);
  for(const product of ["maths","science","english"])assert.equal(SUBJECT_PACKS.filter(p=>p.product===product).length,3);
  for(const pack of SUBJECT_PACKS){
    assert.ok(pack.explanation.length>=4);assert.ok(pack.workedExample.steps.length>=4);
    assert.equal(pack.questions.length,8);
    assert.equal(new Set(pack.questions.map(q=>q.prompt)).size,8);
    for(const q of pack.questions){assert.equal(q.options.length,4);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4);assert.ok(q.explanation.length>30);}
  }
});
test("all original banks grade correct, incorrect and mixed answers and reject incomplete or invalid attempts",()=>{
  for(const pack of ALL_SUBJECT_PACKS){
    const correct=pack.questions.map(q=>q.answer);
    assert.equal(gradePack(pack,correct).score,pack.questions.length);
    assert.equal(gradePack(pack,correct.map(a=>(a+1)%4)).score,0);
    assert.equal(gradePack(pack,correct.map((a,i)=>i%2?a:(a+1)%4)).score,pack.questions.length/2);
    assert.throws(()=>gradePack(pack,correct.slice(1)));
    assert.throws(()=>gradePack(pack,correct.map(()=>-1)));
    assert.throws(()=>gradePack(pack,correct.map(()=>4)));
    assert.throws(()=>gradePack(pack,correct.map(()=>0.5)));
  }
});
test("guest practice retries use a different four-question set before cycling",()=>{
  for(const pack of SUBJECT_PACKS){
    const first=practiceSet(pack,0),second=practiceSet(pack,1);
    assert.equal(first.length,4);assert.equal(second.length,4);
    assert.equal(first.filter(i=>second.includes(i)).length,0);
    assert.deepEqual(practiceSet(pack,2),first);
  }
});
test("race accuracy always beats the largest speed advantage in the eight-question banks",()=>{
  for(let score=1;score<=8;score++)assert.ok(racePoints(score,8,100000)>racePoints(score-1,8,1));
  assert.ok(racePoints(8,8,10)>racePoints(8,8,11));
  assert.equal(racePoints(8,8,1200),100000);
  for(const args of [[9,8,1],[-1,8,1],[1,0,1],[1,8,-1],[1,8,Infinity]])assert.throws(()=>racePoints(...args));
});
test("financial examples distinguish margin, markup and reverse percentage",()=>{
  const profit=findSubjectPack("maths","profit-financial-maths");
  assert.equal(profit.workedExample.answer,"£55 profit");
  const margin=profit.questions.find(q=>q.prompt.includes("margin before"));assert.equal(margin.options[margin.answer],"20%");
  const markup=profit.questions.find(q=>q.prompt.includes("markup on cost"));assert.equal(markup.options[markup.answer],"25%");
  const reverse=findSubjectPack("maths","percentages").questions.find(q=>q.prompt.includes("original price"));assert.equal(reverse.options[reverse.answer],"£40");
});
test("English packs have original evidence, drafts, example responses and actionable rubrics",()=>{
  for(const pack of ALL_SUBJECT_PACKS.filter(p=>p.product==="english")){
    assert.ok(pack.evidence.text.length>100);assert.ok(pack.writing.prompt.length>50);
    assert.ok(pack.writing.model.length>300);assert.equal(pack.writing.rubric.length,3);
    assert.ok(pack.writing.rubric.every(r=>r.guidance.length>30));
  }
});
test("mission helpers resolve to the same public resource content",()=>{
  const {MISSION_HELP}=projectData("src/lib/learning/mission-help.ts");
  for(const help of MISSION_HELP){const [product,slug]=help.href.slice(1).split("#")[0].split("/");assert.ok(findSubjectPack(product,slug));assert.ok(help.paragraphs.every(p=>p.length>15));}
});
test("database seed keys exactly match the content and mutations do not accept client scores",()=>{
  const sql=fs.readFileSync("supabase/migrations/20261114120850_learning_subject_attempts.sql","utf8");
  for(const pack of ALL_SUBJECT_PACKS)assert.ok(sql.includes(`('${pack.product}','${pack.slug}',array[${pack.questions.map(q=>q.answer)}],array[${pack.questions.map(q=>q.options.length)}],${Boolean(pack.writing)})`));
  assert.match(sql,/revoke all on public\.learning_subject_attempts from public,anon,authenticated/);
  assert.match(sql,/user_id=auth\.uid\(\) for update/);
  assert.match(sql,/k\.answer_keys\[a\.question_indices\[i\]\+1\]/);
  assert.match(sql,/clock_timestamp\(\)-a\.started_at/);
  assert.match(sql,/private\.learning_record_progress/);
});
