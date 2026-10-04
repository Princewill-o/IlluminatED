"use client";

import { useState } from "react";

import { ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, ChartNoAxesCombined, Clock3, FileText, GraduationCap, MessageCircle, Sparkles } from "lucide-react";
import { useFormStatus } from "react-dom";


import { Tiggy, type TiggyAction } from "@/components/tiggy";
import { completeFirstRunTutorial } from "@/lib/account/actions";

const slides = [
  {
    eyebrow: "01 / Your home base",
    title: "Your dashboard has a plan for you",
    body: "Your subjects, exam date and the topics you find hard shape what you see first. Practice updates your progress and helps you decide what to revise next.",
    action: "wave" as TiggyAction,
    colour: "from-sky-100 via-white to-blue-100",
    tags: ["Dashboard", "Readiness", "Study plan"],
  },
  {
    eyebrow: "02 / Learn",
    title: "Find the right topic and resource",
    body: "Open Learn for notes, worked examples and topic checklists. Resources takes you to official specifications, past papers and useful videos. Always check your own exam board.",
    action: "search" as TiggyAction,
    colour: "from-amber-100 via-white to-orange-100",
    tags: ["Courses", "Topic pages", "Past papers"],
  },
  {
    eyebrow: "03 / Practise",
    title: "Train like it is exam day",
    body: "Use quizzes and flashcards for quick practice. Try exam mode with a timer when you download a paper, then check your answers and watch your readiness grow.",
    action: "graduate" as TiggyAction,
    colour: "from-violet-100 via-white to-fuchsia-100",
    tags: ["Quizzes", "Flashcards", "Exam mode"],
  },
  {
    eyebrow: "04 / Get help",
    title: "Ask Tiggy when you get stuck",
    body: "Tiggy can explain a topic, give a hint or help you plan revision when AI is available. The free plan includes daily messages; Premium adds a larger allowance and more detailed help.",
    action: "wave" as TiggyAction,
    colour: "from-emerald-100 via-white to-teal-100",
    tags: ["Study chat", "Hints", "Revision plans"],
  },
  {
    eyebrow: "05 / Your next step",
    title: "Explore what comes after exams",
    body: "Next Steps helps you compare university and apprenticeships, find opportunities and plan work experience. IlluminatED Social lets you swap advice with other students using a username; your school stays private.",
    action: "graduate" as TiggyAction,
    colour: "from-rose-100 via-white to-yellow-100",
    tags: ["Careers", "Opportunities", "Social"],
  },
] as const;

function FinishButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#173b86] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/15 hover:bg-[#102c68] disabled:opacity-60">
    {pending ? "Saving your tour…" : "Build my study space"} <ArrowRight className="size-4" aria-hidden />
  </button>;
}

export function FirstRunTutorial({ name, subjects, careerRoute, next, saveError }: {
  name: string;
  subjects: string[];
  careerRoute: string;
  next: string;
  saveError: boolean;
}) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const route = careerRoute === "university" ? "University" : careerRoute === "apprenticeship" ? "Apprenticeships" : careerRoute === "both" ? "University + apprenticeships" : "Still exploring";

  return <div className="min-h-[80vh] bg-[#f5f8ff] py-8 text-slate-950 sm:py-12">
    <div className="container max-w-6xl">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Welcome to IlluminatED</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Let’s get you ready, {name}.</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">A quick tour of the pages you’ll use. Finish it once, then your own dashboard opens.</p>
        </div>
        <div className="rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-800">Step {index + 1} of {slides.length}</div>
      </div>

      <div className="mb-6 grid grid-cols-5 gap-2" aria-label="Tour progress">
        {slides.map((item, i) => <div key={item.eyebrow} className={`h-2 rounded-full ${i <= index ? "bg-blue-700" : "bg-blue-200"}`} />)}
      </div>

      <section key={slide.title} aria-live="polite" className={`relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br ${slide.colour} shadow-[0_22px_70px_-38px_rgba(35,65,120,.45)]`}>
        <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full border-[20px] border-white/55" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-44 rounded-full bg-white/45" aria-hidden />
        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,.88fr)] lg:items-center lg:gap-12 lg:p-12">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">{slide.eyebrow}</p>
            <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">{slide.title}</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-700">{slide.body}</p>
            <div className="mt-6 flex flex-wrap gap-2">{slide.tags.map((tag) => <span key={tag} className="rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-blue-900">{tag}</span>)}</div>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              {index > 0 && <button type="button" onClick={() => setIndex(index - 1)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-blue-300 bg-white px-5 py-3 text-sm font-bold text-blue-900 hover:bg-blue-50"><ArrowLeft className="size-4" aria-hidden /> Back</button>}
              {index < slides.length - 1 ? <button type="button" onClick={() => setIndex(index + 1)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#173b86] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/15 hover:bg-[#102c68]">Next page <ArrowRight className="size-4" aria-hidden /></button> : <form action={completeFirstRunTutorial}><input type="hidden" name="next" value={next} /><FinishButton /></form>}
            </div>
            {saveError && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">We couldn’t save your progress. Please try finishing the tour again.</p>}
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -top-12 -right-3 z-10 w-28 sm:-top-16 sm:w-36"><Tiggy action={slide.action} /></div>
            <div className="overflow-hidden rounded-[1.7rem] border-[5px] border-[#173b86] bg-white shadow-2xl shadow-blue-900/20">
              <div className="flex items-center gap-2 border-b border-blue-100 bg-[#173b86] px-4 py-3 text-[11px] font-bold text-white"><span className="size-2 rounded-full bg-amber-300" /><span className="size-2 rounded-full bg-sky-300" /><span className="size-2 rounded-full bg-emerald-300" /><span className="ml-2">IlluminatED / {slide.tags[0]}</span></div>
              <div className="p-5 sm:p-6">
                {index === 0 && <><div className="flex items-center gap-3"><ChartNoAxesCombined className="size-7 text-blue-700" /><div><p className="text-xs text-slate-500">Your study space</p><p className="font-black">Made for {name}</p></div></div><div className="mt-5 space-y-3">{(subjects.length ? subjects : ["Your subjects"]).map((subject, i) => <div key={subject} className="rounded-xl bg-blue-50 p-3"><div className="flex justify-between text-xs font-bold"><span>{subject}</span><span>{i === 0 ? "Start here" : "On your plan"}</span></div><div className="mt-2 h-2 rounded-full bg-blue-100"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${35 + i * 15}%` }} /></div></div>)}</div></>}
                {index === 1 && <><div className="flex items-center gap-3"><BookOpen className="size-7 text-orange-600" /><p className="font-black">Learn a topic</p></div><div className="mt-5 rounded-xl bg-amber-50 p-4"><p className="text-xs font-bold text-amber-800">Topic checklist</p><p className="mt-1 text-sm font-semibold">Notes · Examples · Key terms</p></div><div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-100 p-4"><FileText className="size-5 text-amber-700" /><span className="text-sm font-semibold">Official past papers and mark schemes</span></div></>}
                {index === 2 && <><div className="flex items-center gap-3"><Clock3 className="size-7 text-violet-700" /><p className="font-black">Practice round</p></div><div className="mt-5 rounded-xl bg-violet-50 p-4"><p className="text-xs font-bold text-violet-700">QUESTION 1 OF 10</p><p className="mt-2 text-sm font-bold">What would you revise next?</p><div className="mt-4 space-y-2"><p className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs">Try a quick quiz</p><p className="rounded-lg border border-violet-400 bg-violet-100 px-3 py-2 text-xs font-bold">Check the explanation ✓</p></div></div></>}
                {index === 3 && <><div className="flex items-center gap-3"><MessageCircle className="size-7 text-emerald-700" /><p className="font-black">Ask Tiggy</p></div><div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm">“Can you explain this step by step?”</div><div className="ml-6 mt-3 rounded-2xl bg-blue-50 p-4 text-sm">“Of course! Let’s start with a hint…”</div><p className="mt-4 text-xs text-slate-500">AI can make mistakes. Check important answers with your teacher or specification.</p></>}
                {index === 4 && <><div className="flex items-center gap-3"><GraduationCap className="size-7 text-rose-700" /><p className="font-black">Your next steps</p></div><div className="mt-5 rounded-xl bg-rose-50 p-4"><p className="text-xs font-bold text-rose-700">YOUR INTEREST</p><p className="mt-1 text-sm font-black">{route}</p></div><div className="mt-3 flex items-center gap-3 rounded-xl border border-rose-100 p-4"><BriefcaseBusiness className="size-5 text-rose-700" /><span className="text-sm font-semibold">Explore courses, roles and opportunities</span></div></>}
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 rotate-[-7deg] rounded-xl bg-yellow-300 px-4 py-2 text-sm font-black text-blue-950 shadow-lg"><Sparkles className="mr-1 inline size-4" aria-hidden /> Made for you</div>
          </div>
        </div>
      </section>
      <p className="mt-5 text-center text-xs text-slate-600">This tour previews the tools. Your real progress starts when you practise.</p>
    </div>
  </div>;
}
