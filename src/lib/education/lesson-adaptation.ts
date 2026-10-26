import type { OakLesson } from "./school-stages";

export interface LessonSlide { title: string; body: string[]; kind: "goal" | "learn" | "keyword" | "teaching" | "review" }
export interface LessonRecall { id: string; question: string; answer: string; explanation: string; kind: "keyword" | "cloze" | "misconception" }
const clean = (value: unknown) => typeof value === "string" ? value.replace(/\s+/g," ").trim() : "";
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const wordPattern = (value: string) => new RegExp(`(^|[^\\p{L}\\p{N}])(${escapePattern(value)})(?=$|[^\\p{L}\\p{N}])`,"iu");

/** A lossless text adaptation, not a claim to reproduce the publisher's illustrated slides or quizzes. */
export function lessonAdaptation(lesson: OakLesson) {
  if(lesson.restricted) return { version: "illumed-slides-v1", slides: [] as LessonSlide[], questions: [] as LessonRecall[] };
  const content=lesson.content;
  const slides:LessonSlide[]=[], questions:LessonRecall[]=[];
  const goal=clean(content.pupilLessonOutcome);
  if(goal) slides.push({kind:"goal",title:"Your learning goal",body:[goal]});
  const points=Array.isArray(content.keyLearningPoints)?content.keyLearningPoints.map(point=>clean(point.keyLearningPoint)).filter(Boolean):[];
  const keywords=Array.isArray(content.lessonKeywords)?content.lessonKeywords.filter(word=>clean(word.keyword)&&clean(word.description)):[];
  points.forEach((point,index)=>{
    slides.push({kind:"learn",title:`Learn · ${index+1}`,body:[point]});
    const keyword=keywords.map(word=>clean(word.keyword)).find(word=>wordPattern(word).test(point));
    const words=point.match(/[\p{L}\p{N}][\p{L}\p{N}’'-]*/gu)??[];
    const target=keyword??words.filter(word=>word.length>=4).sort((a,b)=>b.length-a.length)[0]??words[0];
    if(target) {
      const matcher=wordPattern(target);
      const answer=point.match(matcher)?.[2]??target;
      questions.push({id:`point-${index}`,kind:"cloze",question:`Complete the statement: ${point.replace(matcher,(_match,prefix:string)=>`${prefix}_____`)}`,answer,explanation:point});
    }
  });
  keywords.forEach((word,index)=>{
    const keyword=clean(word.keyword), description=clean(word.description);
    slides.push({kind:"keyword",title:keyword,body:[description]});
    questions.push({id:`word-${index}`,kind:"keyword",question:`What does “${keyword}” mean in this lesson?`,answer:description,explanation:"Compare the meaning, not just the exact wording."});
  });
  // Keep the complete teaching transcript. Pages split on word boundaries without dropping text.
  let rest=clean(content.transcript_sentences), page=1;
  while(rest) {
    let end=rest.length;
    if(end>850) { end=rest.lastIndexOf(" ",850); if(end<1)end=850; }
    slides.push({kind:"teaching",title:`Teaching · ${page++}`,body:[rest.slice(0,end)]});
    rest=rest.slice(end).trimStart();
  }
  if(Array.isArray(content.misconceptionsAndCommonMistakes)) content.misconceptionsAndCommonMistakes.forEach((item,index)=>{
    const misconception=clean(item.misconception), response=clean(item.response);
    if(!misconception||!response)return;
    slides.push({kind:"review",title:"Check your understanding",body:[misconception,response]});
    questions.push({id:`check-${index}`,kind:"misconception",question:`Discuss this common mistake: “${misconception}” What is the correction or advice?`,answer:response,explanation:"Use the model answer to check your reasoning."});
  });
  return {version:"illumed-slides-v1",slides,questions};
}

export function lessonDownloadHtml(lesson: OakLesson) {
  const {slides,questions}=lessonAdaptation(lesson);
  const escape=(text:string)=>text.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
  const credit=`Adapted from “${escape(lesson.title)}” by <a href="${escape(lesson.source_url)}">Oak National Academy</a>, Open Government Licence v3.0. IllumED layout and recall questions; no endorsement.`;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(lesson.title)} · IllumED Slides</title><style>body{margin:0;background:#101729;color:#eef2ff;font:20px/1.65 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:24px}section{min-height:60vh;background:#18233b;border:1px solid #526080;border-radius:24px;padding:clamp(24px,5vw,64px);margin:24px 0;break-after:page;overflow-wrap:anywhere}h1,h2{line-height:1.15;color:#dbd4ff}h1{font-size:clamp(30px,5vw,60px)}a{color:#c6e4ff}small{font-size:13px}details{border-top:1px solid #526080;padding:20px 0}summary{cursor:pointer;font-weight:bold}footer{margin-top:40px;font-size:13px;color:#bac4d9}p{white-space:pre-wrap}@media print{body{background:white;color:#18233b}main{padding:0}section{min-height:0;height:auto;background:white;border:0;margin:0}h1,h2,a{color:#18233b}details>div{display:block!important}footer{color:#444}}</style></head><body><main><section><small>IllumED Slides · ${escape(lesson.key_stage.toUpperCase())} · ${escape(lesson.subject_title)}</small><h1>${escape(lesson.title)}</h1><p>${escape(lesson.unit_title)}</p><p>Read, recall and check your answers. Adapted from the imported lesson text; these are not the original illustrated publisher slide decks.</p><footer>${credit}</footer></section>${slides.map((slide,index)=>`<section><small>IllumED Slides · ${index+1}/${slides.length}</small><h2>${escape(slide.title)}</h2>${slide.body.map(text=>`<p>${escape(text)}</p>`).join("")}<footer>${credit}</footer></section>`).join("")}<section><h2>Questions and answers</h2><p>Self-check practice derived from the lesson. No exam marks or game rewards are awarded.</p>${questions.map((question,index)=>`<details open><summary>${index+1}. ${escape(question.question)}</summary><div><p><strong>Answer:</strong> ${escape(question.answer)}</p><p>${escape(question.explanation)}</p></div></details>`).join("")}<footer>${credit}</footer></section></main></body></html>`;
}
