import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { projectData } from "../scripts/lib/project-data.mjs";
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"illumed-course-"));
const run=(cmd,args,input)=>{const r=spawnSync(cmd,args,{input,encoding:"utf8"});if(r.status!==0)throw new Error(r.stderr||r.stdout);return r.stdout.trim();};
let started=false;
try{
 run("initdb",["-D",dir+"/data","-A","trust","--no-locale"]);
 run("pg_ctl",["-D",dir+"/data","-l",dir+"/log","-o",`-k ${dir} -p 6559 -c listen_addresses=''`,"-w","start"]);started=true;
 const sql=q=>run("psql",["-h",dir,"-p","6559","-d","postgres","-v","ON_ERROR_STOP=1","-X","-q","-A","-t"],q);
 sql("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create table public.profiles(id uuid primary key,username text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;");
 sql(fs.readFileSync("supabase/migrations/20261115120000_world_course_completions.sql","utf8"));
 const a="88888888-8888-4888-8888-000000000001",b="88888888-8888-4888-8888-000000000002";
 sql(`insert into auth.users values('${a}'),('${b}');insert into public.profiles values('${a}','learner'),('${b}','other');`);
 const as=(id,q)=>sql(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${id}',true);${q};commit;`).split("\n").at(-1);
 const c=projectData("src/lib/illum-world/role-contracts.ts").ROLE_CONTRACTS[0];
 const answers=JSON.stringify(Object.fromEntries(c.shifts.map(s=>[s.id,s.questions.map(q=>q.answer)])));
 const submit=`select (public.complete_world_course('${c.id}','${answers}'::jsonb)).id`;
 const first=as(a,submit);assert.equal(first,as(a,submit));
 assert.equal(as(a,"select count(*) from public.world_course_completions"),"1");
 assert.equal(as(b,"select count(*) from public.world_course_completions"),"0");
 assert.throws(()=>as(a,`select public.complete_world_course('${c.id}','{}')`));
 assert.throws(()=>as(a,"select * from public.world_course_keys"));
 assert.throws(()=>as(a,"delete from public.world_course_completions"));

 sql(fs.readFileSync("supabase/migrations/20261115130000_world_course_practical_work.sql","utf8"));
 const workbook=projectData("src/lib/illum-world/course-work.ts").courseWork(c);
 const work={decisions:Object.fromEntries(workbook.rows.map(row=>[row.id,row.expected])),total:String(workbook.total),owner:"Team supervisor",handover:"R2 requires the missing information to be provided before processing. R3 needs supervisor review of the conflicting evidence before the next shift."};
 const literal=JSON.stringify(work).replaceAll("'","''");
 const practicalSubmit=`select (public.complete_world_course('${c.id}','${answers}'::jsonb,'${literal}'::jsonb)).id`;
 assert.equal(as(a,practicalSubmit),first);
 assert.equal(as(a,practicalSubmit),first);
 assert.equal(as(a,"select work->>'owner' from public.world_course_completions"),"Team supervisor");
 assert.throws(()=>as(b,`select public.complete_world_course('${c.id}','${answers}'::jsonb,'{}')`));
 assert.throws(()=>as(b,`select public.complete_world_course('${c.id}','${answers}'::jsonb,'${JSON.stringify({...work,total:"0"})}'::jsonb)`));
 assert.equal(as(b,"select count(*) from public.world_course_completions"),"0");
 console.log("PASS practical work: required decisions, workload, handover, ownership and legacy record stability");
 console.log("PASS account isolation, grading, stable certificate identity, protected keys and immutable records");
}finally{
 if(started)run("pg_ctl",["-D",dir+"/data","-m","immediate","-w","stop"]);
 fs.rmSync(dir,{recursive:true,force:true});
}
