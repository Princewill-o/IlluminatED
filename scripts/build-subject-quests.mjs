import fs from "node:fs/promises";
import { projectData } from "./lib/project-data.mjs";
const { TOPICS,QUESTION_BANK }=projectData("src/lib/data/topics/index.ts");
const { COURSES }=projectData("src/lib/data/courses.ts");
const rows=COURSES.flatMap(course=>course.topicIds.map(topicId=>{
  const topic=TOPICS.find(topic=>topic.id===topicId);
  if(!topic)throw Error(`Missing topic ${topicId} for ${course.id}`);
  const sourceCourse=COURSES.find(item=>item.id===topic.courseId);
  return {course_id:course.id,topic_id:topic.id,course_title:course.title,title:topic.title,
    content:{summary:topic.summary,objectives:topic.objectives,explanation:topic.explanation,workedExample:topic.workedExample??null,keyTerms:topic.keyTerms,misconceptions:topic.misconceptions,retrieval:topic.retrieval,specRefs:topic.specRefs??[],route:course.route,subject:course.subject,
      ...(topic.courseId!==course.id?{foundationFrom:sourceCourse?.title??topic.courseId}:{})},
    question_keys:QUESTION_BANK.filter(question=>question.topicId===topic.id).map(question=>question.key),version:topic.version};
}));
const directory=process.argv[process.argv.indexOf("--sql-dir")+1];
if(!process.argv.includes("--sql-dir")||!directory)throw Error("Supply --sql-dir followed by an ignored output directory");
await fs.mkdir(directory,{recursive:true});
for(let index=0;index<rows.length;index+=10){
 const json=JSON.stringify(rows.slice(index,index+10)).replaceAll("'","''");
 const sql=`insert into public.subject_quest_catalogue select * from jsonb_populate_recordset(null::public.subject_quest_catalogue,'${json}'::jsonb) on conflict(course_id,topic_id) do update set course_title=excluded.course_title,title=excluded.title,content=excluded.content,question_keys=excluded.question_keys,version=excluded.version;`;
 await fs.writeFile(`${directory}/${String(index/10).padStart(3,"0")}.sql`,sql);
}
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const registry=COURSES.map(course=>`(${[course.id,course.title,course.route,course.subject].map(quote).join(",")})`).join(",");
// Bring every scored topic already available in the larger server bank into the quest board too.
// These use the server's existing reviewed conversion, not client-supplied answers or new invented distractors.
const bankSql=`with registry(course_id,title,route,subject) as(values ${registry}),
groups as(select b.course_id,q.topic,array_agg(b.key order by b.key) as keys,bool_or(not q.publish_ready) as draft,
 min(r.title) as course_title,min(r.route) as route,min(r.subject) as subject,
 jsonb_agg(jsonb_build_object('prompt',b.prompt,'answer',b.options->>b.answer,'explain',b.explain,'source',q.source,'licence',q.licence) order by b.key) as examples
 from private.study_question_bank b join public.bank_questions q on b.key='qb-'||q.id join registry r on r.course_id=b.course_id
 where q.review_status not in('retired','flagged_needs_fix') group by b.course_id,q.topic)
insert into public.subject_quest_catalogue(course_id,topic_id,course_title,title,content,question_keys,version)
select course_id,left(course_id||'-'||regexp_replace(lower(topic),'[^a-z0-9]+','-','g'),100)||'-'||substr(md5(topic),1,8),course_title,topic,
 jsonb_build_object('summary','Review worked examples for '||topic||', then practise retrieving the methods and facts.',
 'objectives',jsonb_build_array('Study the worked examples.','Explain the method in your own words.','Complete two scored retrieval rounds.'),
 'explanation',(select jsonb_agg('Example: '||(x->>'prompt')||E'\\n\\nAnswer: '||(x->>'answer')||E'\\n\\n'||(x->>'explain')) from(select x from jsonb_array_elements(examples) with ordinality e(x,n) where n<=8)s),
 'workedExample',null,'keyTerms','[]'::jsonb,'misconceptions','[]'::jsonb,'retrieval','[]'::jsonb,'route',route,'subject',subject,'draftPractice',draft,
 'sources',(select jsonb_agg(distinct jsonb_build_object('source',x->>'source','licence',x->>'licence')) from jsonb_array_elements(examples)x)),
 keys,'question-bank-v1' from groups
on conflict(course_id,topic_id) do update set course_title=excluded.course_title,title=excluded.title,content=excluded.content,question_keys=excluded.question_keys,version=excluded.version;`;
await fs.writeFile(`${directory}/999.sql`,bankSql);
console.log(JSON.stringify({quests:rows.length,courses:new Set(rows.map(row=>row.course_id)).size,withoutQuestions:rows.filter(row=>!row.question_keys.length).length}));
