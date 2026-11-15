import test from 'node:test';
import assert from 'node:assert/strict';
import {projectData} from '../scripts/lib/project-data.mjs';
const C=projectData('src/lib/learning/secondary-curriculum.ts');
const P=projectData('src/lib/learning/secondary-practice.ts');
const lesson=(extra={})=>({slug:'adding-directed-numbers',title:'Adding directed numbers',unit_slug:'directed-number',unit_title:'Directed number',subject:'maths',subject_title:'Maths',key_stage:'ks3',phase:'secondary',years:[7],restricted:false,source_url:'https://www.thenational.academy/pupils/lessons/adding-directed-numbers',...extra});

test('secondary selection accepts only Years 7–11 and known subject strands',()=>{
 for(const value of [1,6,12,13,NaN,Infinity,'10oops'])assert.equal(C.secondarySelection('maths',{year:value}).year,7);
 for(let year=7;year<=11;year++)assert.equal(C.secondarySelection('maths',{year}).year,year);
 assert.equal(C.secondarySelection('english',{year:10,strand:'literature'}).strand,'literature');
 assert.equal(C.secondarySelection('english',{strand:'chemistry'}).strand,'all');
 assert.equal(C.secondarySelection('science',{strand:'working-scientifically'}).strand,'working-scientifically');
 assert.equal(C.secondarySelection('maths',{page:-1}).page,1);
 assert.equal(C.secondarySelection('maths',{page:501}).page,500);
 assert.equal(C.secondarySelection('maths',{query:' x '.repeat(100)}).query.length,100);
});
test('library requests keep the chosen year, stage, product and pagination',()=>{
 const s=C.secondarySelection('maths',{year:11,page:3,query:'reverse percentages & ratio'});
 const req=C.secondaryRequests(s);
 assert.equal(req.length,1);
 const u=new URL(req[0].url,'https://illumed.co.uk');
 assert.equal(u.pathname,'/api/education/oak');
 assert.equal(u.searchParams.get('stage'),'secondary');assert.equal(u.searchParams.get('year'),'11');
 assert.equal(u.searchParams.get('keyStage'),'ks4');assert.equal(u.searchParams.get('subject'),'maths');
 assert.equal(u.searchParams.get('page'),'3');assert.equal(u.searchParams.get('q'),'reverse percentages & ratio');
});
test('English language and literature discover distinct topics without pretending separate provider qualifications',()=>{
 const lang=C.secondaryRequests(C.secondarySelection('english',{year:9,strand:'language'}));
 const lit=C.secondaryRequests(C.secondarySelection('english',{year:9,strand:'literature'}));
 assert.notEqual(lang[0].url,lit[0].url);assert.ok(lang.every(r=>r.subject.startsWith('english')));assert.ok(lit.every(r=>r.subject.startsWith('english')));
});
test('response guards reject wrong-year, wrong-product, primary and unsafe lesson links',()=>{
 const s=C.secondarySelection('maths',{year:7});const req=C.secondaryRequests(s)[0];
 assert.ok(C.isSecondaryLesson(lesson(),s,req));
 for(const changed of [{years:[8]},{phase:'primary'},{key_stage:'ks4'},{subject:'english'},{source_url:'javascript:alert(1)'},{source_url:'https://evil.test/pupils/lessons/abc'},{source_url:'https://www.thenational.academy.evil.test/a'},{slug:'../admin'},{years:['7']},{title:27}])assert.equal(C.isSecondaryLesson(lesson(changed),s,req),false,JSON.stringify(changed));
 const page=C.secondaryPage({lessons:[lesson(),lesson({years:[8]})],total:146,available:true,pageSize:24},s,req);
 assert.equal(page.lessons.length,1);assert.equal(page.omitted,1);assert.equal(page.total,146);assert.equal(page.hasNext,true);
 assert.throws(()=>C.secondaryPage({lessons:'bad',total:0},s,req));
 assert.throws(()=>C.secondaryPage({lessons:[],total:-1,available:true},s,req));
});
test('original warm-ups change across all five years and provide answers, hints and misconceptions',()=>{
 for(const product of ['maths','science','english']){
  const titles=new Set();
  for(let year=7;year<=11;year++){
   const p=P.secondaryPractice(product,year,'all');titles.add(p.title);
   assert.equal(p.year,year);assert.equal(p.product,product);assert.ok(p.worked.steps.length>=3);
   assert.ok(p.questions.length>=2);assert.ok(p.hint.length>30);assert.ok(p.misconception.length>40);
   for(const q of p.questions){assert.ok(q.options.length>=3);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);assert.ok(q.explanation.length>30);}
  }
  assert.equal(titles.size,5);
 }
 for(let year=7;year<=11;year++){
  const a=P.secondaryPractice('english',year,'language'),b=P.secondaryPractice('english',year,'literature');
  assert.notEqual(a.id,b.id);assert.ok(b.extract.length>60);assert.ok(b.writing.model.length>80);assert.equal(b.writing.checks.length,3);
 }
});
test('graded warm-ups do not accept partial or out-of-range answers',()=>{
 const p=P.secondaryPractice('maths',11,'all');
 assert.equal(P.gradeSecondaryPractice(p,p.questions.map(q=>q.answer)).score,p.questions.length);
 assert.equal(P.gradeSecondaryPractice(p,p.questions.map(q=>(q.answer+1)%q.options.length)).score,0);
 for(const answers of [[],[-1,-1],[3.2,0],[null,null]])assert.throws(()=>P.gradeSecondaryPractice(p,answers));
});
