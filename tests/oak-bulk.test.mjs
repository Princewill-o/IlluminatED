import test from "node:test";
import assert from "node:assert/strict";
import { normaliseOakCollection, mergeOakLesson, oakUrl } from "../scripts/lib/oak-bulk.mjs";
import { projectData } from "../scripts/lib/project-data.mjs";
const { lessonAdaptation,lessonDownloadHtml }=projectData("src/lib/education/lesson-adaptation.ts");
const { oakFilters }=projectData("src/lib/education/school-stages.ts");
const { normalisePlatformStats }=projectData("src/lib/education/platform-stats.ts");
const lesson={slug:"place-value",title:"Place value",unit_title:"Numbers",unit_slug:"numbers",subject:"maths",subject_title:"Maths",key_stage:"ks1",phase:"primary",years:[1],source_url:"https://www.thenational.academy/teachers/lessons/place-value",restricted:false,content:{pupilLessonOutcome:"I can regroup ones.",keyLearningPoints:[{keyLearningPoint:"Ten ones make one ten."},{keyLearningPoint:"Regrouping changes the units."}],lessonKeywords:[{keyword:"one",description:"A single unit."},{keyword:"regroup",description:"Exchange equal values."}],misconceptionsAndCommonMistakes:[{misconception:"Ten ones make a hundred.",response:"Ten ones make one ten."}],transcript_sentences:"A complete lesson. ".repeat(240)}};

test("restrictions survive duplicates and restricted content is never published",()=>{
  const merged=mergeOakLesson(lesson,{...lesson,restricted:true,content:{},years:[2]});
  assert.equal(merged.restricted,true);assert.deepEqual(merged.content,{});assert.deepEqual(merged.years,[1,2]);
  assert.equal(mergeOakLesson(merged,lesson).restricted,true);
  assert.equal(lessonAdaptation(merged).questions.length,0);assert.equal(lessonAdaptation(merged).slides.length,0);
});
test("transcript slides retain every word and questions use source answers",()=>{
  const adapted=lessonAdaptation(lesson);
  const transcript=adapted.slides.filter(slide=>slide.kind==="teaching").map(slide=>slide.body.join(" ")).join(" ");
  assert.equal(transcript,lesson.content.transcript_sentences.trim());
  assert.ok(adapted.questions.some(q=>q.question.includes("What does “one”")&&q.answer==="A single unit."));
  const regroup=adapted.questions.find(q=>q.id==="point-1");
  assert.equal(regroup.answer,"Regrouping");assert.ok(!regroup.question.includes("_____ing"));
});
test("offline lesson escapes content, includes answers and retains required attribution",()=>{
  const html=lessonDownloadHtml({...lesson,title:"<script>alert(1)</script>"});
  assert.ok(!html.includes("<script>"));assert.ok(html.includes("&lt;script&gt;"));assert.ok(html.includes("Oak National Academy"));
  assert.ok(html.includes("Questions and answers"));assert.ok(html.includes("A single unit."));assert.ok(html.includes("default-src &#39;none&#39;")||html.includes("default-src 'none'"));
});
test("primary all-years swimming units are discoverable for every primary year",()=>{
  const result=normaliseOakCollection({sequenceSlug:"physical-education-primary",subjectTitle:"PE",sequence:[{unitSlug:"swimming",unitTitle:"Swimming",canonicalUrl:"",year:"All years",keyStageSlug:"ks2",subjectSlug:"physical-education",unitLessons:[{lessonSlug:"swimming-one",state:"published"}]}],lessons:[{lessonSlug:"swimming-one",lessonTitle:"Swimming",canonicalUrl:"https://www.thenational.academy/teachers/lessons/swimming-one",unitSlug:"swimming",unitTitle:"Swimming",subjectSlug:"physical-education",subjectTitle:"PE",keyStageSlug:"ks2"}]},"test");
  assert.deepEqual(result.lessons[0].years,[1,2,3,4,5,6]);assert.equal(result.units[0].source_url,"https://www.thenational.academy/");
});
test("source links and filters cannot introduce external hosts or unbounded pages",()=>{
  assert.equal(oakUrl("https://www.thenational.academy.evil.test/lesson"),null);assert.equal(oakUrl("javascript:alert(1)"),null);
  const filters=oakFilters(new URLSearchParams({stage:"primary",year:"99",keyStage:"ks5",subject:"maths,or(secret)",page:"99999",q:"x".repeat(500)}));
  assert.equal(filters.stage,"primary");assert.equal(filters.year,null);assert.equal(filters.keyStage,"");assert.equal(filters.subject,"");assert.equal(filters.page,500);assert.equal(filters.q.length,100);
});
test("statistics keep zero counts truthful and reject invalid values",()=>{
  const stats=normalisePlatformStats({questions:0,oak_lessons:10421,lesson_recall_questions:Infinity,oak_units:-1});
  assert.equal(stats.questions,0);assert.equal(stats.oak_lessons,10421);assert.equal(stats.lesson_recall_questions,0);assert.equal(stats.oak_units,0);
});
