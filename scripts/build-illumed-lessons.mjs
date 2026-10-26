import fs from "node:fs/promises";
import path from "node:path";
import { normaliseOakCollection, mergeOakLesson } from "./lib/oak-bulk.mjs";
import { projectData } from "./lib/project-data.mjs";
const { lessonAdaptation }=projectData("src/lib/education/lesson-adaptation.ts");
const args=process.argv.slice(2);
const arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const directory=arg("--directory",".education-export/oak");
const lessons=new Map();
for(const file of (await fs.readdir(directory)).filter(file=>/-(primary|secondary)\.json$/.test(file)).sort()) {
  const data=normaliseOakCollection(JSON.parse(await fs.readFile(path.join(directory,file),"utf8")),"oak-bulk-2026-10-26");
  for(const lesson of data.lessons)lessons.set(lesson.slug,mergeOakLesson(lessons.get(lesson.slug),lesson));
}
const rows=[];
let slides=0;
for(const lesson of lessons.values()) {
  const adaptation=lessonAdaptation(lesson);
  slides+=adaptation.slides.length;
  for(const question of adaptation.questions) rows.push({...question,id:`${lesson.slug}:${question.id}`,lesson_slug:lesson.slug,version:adaptation.version});
}
const report={lessons:lessons.size,questions:rows.length,slides,version:"illumed-slides-v1"};
await fs.writeFile(".education-export/illumed-lessons-report.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report));
if(!args.includes("--apply"))process.exit(0);
const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret=process.env.SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY;
const tokenPath=arg("--token-file",null),token=tokenPath?(await fs.readFile(tokenPath,"utf8")).trim():null;
const key=secret??process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key||(!secret&&!token))throw Error("Configure publishing credentials before --apply");
let next=0,done=0;
await Promise.all(Array.from({length:3},async()=>{while(next<rows.length){
  const index=next;next+=300;const batch=rows.slice(index,index+300);
  for(let attempt=0;attempt<3;attempt++) {
    try {
      const response=await fetch(`${url}/rest/v1/${token?"rpc/import_illumed_questions_temporary":"illumed_lesson_questions"}`,{
        method:"POST",signal:AbortSignal.timeout(45000),headers:{apikey:key,...(secret?{Authorization:`Bearer ${secret}`}:{ }),"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},
        body:JSON.stringify(token?{p_token:token,p_rows:batch}:batch)});
      if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(`Question import ${response.status}: ${error.code??"failed"}`);}
      break;
    } catch(error) {if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,1500*(attempt+1)));}
  }
  done+=batch.length;if(done%3000<300||done===rows.length)console.log(`${done}/${rows.length} questions`);
}}));
console.log("Question import complete. Verify read-only API totals.");
