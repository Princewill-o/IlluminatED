"use client";

import { useState } from "react";

import type { LessonRecall, LessonSlide } from "@/lib/education/lesson-adaptation";

export function LessonSlides({slug,title,slides,questions}:{slug:string;title:string;slides:LessonSlide[];questions:LessonRecall[]}) {
  const [mode,setMode]=useState<"slides"|"questions">("slides");
  const [index,setIndex]=useState(0),[revealed,setRevealed]=useState(false),[answer,setAnswer]=useState("");
  const [checked,setChecked]=useState<Record<string,boolean>>({});
  const count=mode==="slides"?slides.length:questions.length;
  const slide=slides[index],question=questions[index];
  function move(next:number) {setIndex(Math.max(0,Math.min(count-1,next)));setRevealed(false);setAnswer("");}
  function switchMode(next:typeof mode) {setMode(next);setIndex(0);setRevealed(false);setAnswer("");}
  return <section aria-labelledby="illumed-slides-heading" className="my-8 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-primary">Learn it. Recall it. Make it stick.</p><h2 id="illumed-slides-heading" className="text-2xl font-black">IllumED Slides</h2></div><a href={`/api/education/oak/${slug}/slides`} download className="rounded-full border border-primary px-5 py-3 text-sm font-bold text-primary">Download lesson + answers ↓</a></div>
    <div className="flex flex-wrap gap-2" aria-label="Lesson format"><button type="button" aria-pressed={mode==="slides"} onClick={()=>switchMode("slides")} className={`min-h-11 rounded-full px-5 font-bold ${mode==="slides"?"bg-primary text-primary-foreground":"border bg-card text-card-foreground"}`}>Slides · {slides.length}</button><button type="button" aria-pressed={mode==="questions"} onClick={()=>switchMode("questions")} className={`min-h-11 rounded-full px-5 font-bold ${mode==="questions"?"bg-primary text-primary-foreground":"border bg-card text-card-foreground"}`}>Questions & answers · {questions.length}</button></div>
    {!count?<p className="rounded-xl border p-5">No {mode==="slides"?"slide material":"recall questions"} is available for this lesson.</p>:<>
    <div tabIndex={0} aria-label={`${mode==="slides"?"Lesson slide":"Recall question"} ${index+1} of ${count}. Use left and right arrow keys to navigate.`} onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==="ArrowRight"){event.preventDefault();move(index+1);}if(event.key==="ArrowLeft"){event.preventDefault();move(index-1);}}} className="min-h-80 rounded-3xl border border-[#8f80dd]/50 bg-[#13203a] p-6 text-[#f2f3ff] shadow-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring sm:p-9">
      <p className="text-xs font-bold uppercase tracking-widest text-[#c9bdff]">IllumED · {index+1}/{count}</p>
      {mode==="slides"&&slide?<><h3 className="mt-5 text-2xl font-black sm:text-3xl">{slide.title}</h3><div className="mt-5 space-y-5 text-lg leading-relaxed">{slide.body.map((text,i)=><p key={i}>{text}</p>)}</div></>:question?<>
        <h3 className="mt-5 text-xl font-bold sm:text-2xl">{question.question}</h3>
        <label className="mt-6 block text-sm font-semibold">Your answer <span className="font-normal">(optional; not saved)</span><textarea value={answer} onChange={event=>setAnswer(event.target.value)} rows={3} maxLength={2000} className="mt-2 w-full rounded-xl border border-[#98a8cc] bg-[#0d172b] p-3 text-base text-white placeholder:text-[#b6c0d7]" placeholder="Think it through, then reveal the model answer." /></label>
        <button type="button" aria-expanded={revealed} onClick={()=>setRevealed(value=>!value)} className="mt-4 min-h-11 rounded-full bg-[#e0d6ff] px-5 font-bold text-[#24174c]">{revealed?"Hide answer":"Reveal answer"}</button>
        {revealed&&<div className="mt-5 rounded-2xl border border-[#79cdb4] bg-[#163a38] p-5"><h4 className="font-bold text-[#b7f5dd]">Model answer</h4><p className="mt-2">{question.answer}</p><p className="mt-3 text-sm text-[#ceeee3]">{question.explanation}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>setChecked(current=>({...current,[question.id]:true}))} className="min-h-11 rounded-full bg-[#b7f5dd] px-4 font-bold text-[#153a30]">{checked[question.id]?"✓ Understood":"I understood this"}</button><button type="button" onClick={()=>setChecked(current=>({...current,[question.id]:false}))} className="min-h-11 rounded-full border border-[#b7f5dd] px-4 font-bold text-[#dcfff1]">Practise again</button></div></div>}
      </>:null}
    </div>
    <div className="flex items-center justify-between gap-3"><button type="button" disabled={index===0} onClick={()=>move(index-1)} className="min-h-11 rounded-full border bg-card px-5 font-bold text-card-foreground disabled:opacity-40">← Previous</button><p className="text-sm text-muted-foreground" role="status">{index+1} of {count}</p><button type="button" disabled={index===count-1} onClick={()=>move(index+1)} className="min-h-11 rounded-full bg-primary px-5 font-bold text-primary-foreground disabled:opacity-40">Next →</button></div>
    </>}
    <p className="text-xs leading-relaxed text-muted-foreground">{title}: slides adapted from the imported teaching text; recall questions created from its keywords, learning points and common mistakes. Self-check practice, with no automatic grading or XP. Answers stay on this page and are cleared when you leave.</p>
  </section>;
}
