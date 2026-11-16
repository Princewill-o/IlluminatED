"use client";

import { useState } from "react";

import Image from "next/image";

import type { LessonRecall, LessonSlide } from "@/lib/education/lesson-adaptation";
import { lessonSlideArtworkData } from "@/lib/education/lesson-artwork";

const subjectName = (slug: string) => slug.includes("math") ? "Mathematics" : slug.includes("science") ? "Science" : slug.includes("english") ? "English" : "Lesson";

export function LessonSlides({ slug, title, subject, slides, questions, hasOriginalDeck = false }: {
  slug: string;
  title: string;
  subject: string;
  slides: LessonSlide[];
  questions: LessonRecall[];
  hasOriginalDeck?: boolean;
}) {
  const [mode, setMode] = useState<"slides" | "questions">("slides");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const count = mode === "slides" ? slides.length : questions.length;
  const slide = mode === "slides" ? slides[index] : undefined;
  const question = mode === "questions" ? questions[index] : undefined;
  const heading = slide?.title ?? question?.question ?? title;
  const kind = slide?.kind ?? (revealed ? "answer" : "question");
  const art = lessonSlideArtworkData(heading, subject, kind, index);

  function move(next: number) {
    setIndex(Math.max(0, Math.min(count - 1, next)));
    setRevealed(false);
    setAnswer("");
  }
  function switchMode(next: typeof mode) {
    setMode(next);
    setIndex(0);
    setRevealed(false);
    setAnswer("");
  }

  return <section aria-labelledby="illumed-slides-heading" className="my-10 space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-primary">{subjectName(subject)} · {title}</p>
        <h2 id="illumed-slides-heading" className="mt-1 text-3xl font-black tracking-tight">IllumED lesson slides</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A visual lesson deck with worked ideas, original illustrations and a recall check.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={`/api/education/oak/${slug}/powerpoint`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-95">Download PowerPoint · .pptx</a>
        {hasOriginalDeck && <a href={`/api/education/oak/${slug}/original-slides`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-primary/40 bg-card px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5">Original illustrated deck</a>}
        <a href={`/api/education/oak/${slug}/slides`} download className="inline-flex min-h-11 items-center justify-center rounded-full border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground hover:bg-muted">Printable handout · HTML</a>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap gap-2" aria-label="Lesson format">
        <button type="button" aria-pressed={mode === "slides"} onClick={() => switchMode("slides")} className={`min-h-11 rounded-full px-5 font-bold ${mode === "slides" ? "bg-primary text-primary-foreground" : "text-card-foreground hover:bg-muted"}`}>Lesson · {slides.length}</button>
        <button type="button" aria-pressed={mode === "questions"} onClick={() => switchMode("questions")} className={`min-h-11 rounded-full px-5 font-bold ${mode === "questions" ? "bg-primary text-primary-foreground" : "text-card-foreground hover:bg-muted"}`}>Recall check · {questions.length}</button>
      </div>
      {count > 0 && <p className="mr-2 text-sm font-semibold text-muted-foreground" role="status">{mode === "slides" ? "Slide" : "Question"} {index + 1} of {count}</p>}
    </div>

    {!count ? <p className="rounded-2xl border bg-card p-6">No {mode === "slides" ? "slide material" : "recall questions"} is available for this lesson.</p> : <>
      <div tabIndex={0} aria-label={`${mode === "slides" ? "Lesson slide" : "Recall question"} ${index + 1} of ${count}. Use left and right arrow keys to navigate.`} onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight") { event.preventDefault(); move(index + 1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); move(index - 1); }
      }} className="relative grid min-h-[34rem] overflow-hidden rounded-[2rem] border border-[#d9deee] bg-[#f8f9ff] shadow-[0_20px_60px_-35px_rgba(28,39,79,.45)] outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring md:aspect-video md:min-h-0 md:grid-cols-[1.08fr_.92fr]">
        <div className="absolute inset-x-0 top-0 z-10 h-1.5 bg-[#e3e7f3]"><div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${((index + 1) / count) * 100}%` }} /></div>
        <div className="flex min-w-0 flex-col justify-center px-6 pb-7 pt-9 sm:px-10 md:px-12 md:py-12">
          <p className="text-xs font-black uppercase tracking-[.19em] text-primary">{mode === "slides" ? slide?.kind === "keyword" ? "Word to know" : slide?.kind === "goal" ? "Learning goal" : slide?.kind === "review" ? "Check the idea" : "Key idea" : revealed ? "Model answer" : `Recall check · ${index + 1}`}</p>
          <h3 className="mt-4 max-w-3xl text-3xl font-black leading-[1.08] tracking-tight text-[#17233f] sm:text-4xl">{revealed && question ? "Check your thinking" : heading}</h3>
          {slide && <div className="mt-6 max-w-3xl space-y-4 text-base leading-7 text-[#394967] sm:text-lg sm:leading-8">{slide.body.map((text, i) => <p key={i}>{text}</p>)}</div>}
          {question && !revealed && <>
            <p className="mt-6 max-w-xl text-sm leading-6 text-[#53627c]">Pause the slide and answer before you reveal the explanation.</p>
            <label className="mt-5 block text-sm font-bold text-[#273957]">Your answer <span className="font-normal text-[#65738a]">(optional; not saved)</span>
              <textarea value={answer} onChange={event => setAnswer(event.target.value)} rows={3} maxLength={2000} className="mt-2 w-full resize-y rounded-2xl border border-[#c5cee0] bg-white p-4 text-base leading-6 text-[#17233f] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Write a phrase or explain it aloud." />
            </label>
            <button type="button" aria-expanded={revealed} onClick={() => setRevealed(true)} className="mt-4 min-h-11 self-start rounded-full bg-[#172b50] px-5 font-bold text-white hover:bg-[#243b68]">Reveal model answer</button>
          </>}
          {question && revealed && <div className="mt-6 max-w-3xl space-y-4 text-base leading-7 text-[#394967] sm:text-lg sm:leading-8">
            <p className="rounded-2xl border-l-4 border-[#23856f] bg-white px-5 py-4 shadow-sm">{question.answer}</p>
            <p>{question.explanation}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => setChecked(current => ({ ...current, [question.id]: true }))} className="min-h-11 rounded-full bg-[#dff5eb] px-4 font-bold text-[#165d4a]">{checked[question.id] ? "✓ Understood" : "I understood this"}</button>
              <button type="button" onClick={() => { setChecked(current => ({ ...current, [question.id]: false })); setRevealed(false); }} className="min-h-11 rounded-full border border-[#a8b6c9] bg-white px-4 font-bold text-[#293a56]">Practise again</button>
            </div>
          </div>}
          <div className="mt-auto flex items-center gap-3 pt-8">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#53627c] shadow-sm">IllumED · {mode === "slides" ? slide?.kind ?? "lesson" : "self-check"}</span>
            <span className="text-xs text-[#69778e]">Use ← → to move through the deck</span>
          </div>
        </div>
        <div className="relative min-h-64 overflow-hidden bg-[#eceffd] p-4 sm:p-6 md:min-h-0 md:p-8">
          <div className="absolute inset-4 rounded-[1.5rem] bg-white/60 md:inset-8" />
          <Image src={art} alt={`Original ${subjectName(subject).toLowerCase()} illustration for ${heading}`} width={1000} height={800} unoptimized className="relative z-[1] h-full min-h-60 w-full rounded-[1.2rem] object-cover md:min-h-0" />
          <p className="absolute bottom-7 left-8 z-[2] rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-[#354765] shadow-sm backdrop-blur sm:bottom-10 sm:left-10">{subjectName(subject)} · original lesson artwork</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" disabled={index === 0} onClick={() => move(index - 1)} className="min-h-11 rounded-full border bg-card px-5 font-bold text-card-foreground disabled:opacity-40">← Previous</button>
        <p className="text-sm text-muted-foreground" role="status">{index + 1} of {count}</p>
        <button type="button" disabled={index === count - 1} onClick={() => move(index + 1)} className="min-h-11 rounded-full bg-primary px-5 font-bold text-primary-foreground disabled:opacity-40">Next →</button>
      </div>
    </>}
    <p className="text-xs leading-relaxed text-muted-foreground">{title}: lesson slides are adapted from imported teaching text; recall questions use its keywords, learning points and common mistakes. This is self-check practice, with no automatic grading or XP. Answers stay on this page and are cleared when you leave.</p>
  </section>;
}
