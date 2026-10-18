"use client";

import { useEffect, useState } from "react";

import type { Task } from "@/game/core/careers";

/** Original captioned visual lesson; remote video loads only on request. */
export function WorkLesson({ task }: { task: Task }) {
  const [mode, setMode] = useState<"closed" | "read" | "watch">("closed");
  const [playing, setPlaying] = useState(false);
  const [slide, setSlide] = useState(0);
  const text = task.lesson?.text ?? task.explain;
  const slides = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  useEffect(() => {
    if (!playing || mode !== "watch" || task.lesson?.videoId) return;
    const speech = typeof speechSynthesis !== "undefined" ? speechSynthesis : null;
    if (speech) speech.speak(new SpeechSynthesisUtterance(slides[slide]));
    const timer = setTimeout(() => {
      if (slide + 1 < slides.length) setSlide(slide + 1);
      else setPlaying(false);
    }, Math.max(5000, slides[slide].length * 65));
    return () => { clearTimeout(timer); speech?.cancel(); };
  }, [playing, slide, mode, text, task.lesson?.videoId]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="mt-3 rounded-2xl border border-border bg-secondary/50 p-3" aria-label="Workplace learning">
    <div className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={mode === "read"} onClick={() => {setPlaying(false);setMode(mode === "read" ? "closed" : "read");}} className="rounded-full border border-border px-3 py-2 text-sm font-bold">Read lesson</button>
      <button type="button" aria-pressed={mode === "watch"} onClick={() => {setPlaying(false);setMode(mode === "watch" ? "closed" : "watch");}} className="rounded-full border border-border px-3 py-2 text-sm font-bold">Watch lesson</button>
    </div>
    {mode === "read" && <p className="mt-3 text-sm leading-7">{text}</p>}
    {mode === "watch" && (task.lesson?.videoId ? <div className="mt-3">
      <iframe className="aspect-video w-full rounded-xl" title="Khan Academy: querying a table" src={`https://www.youtube-nocookie.com/embed/${task.lesson.videoId}`} allow="fullscreen; encrypted-media" allowFullScreen />
      <a href="https://www.khanacademy.org/computer-programming/sql/" target="_blank" rel="noreferrer" className="text-xs underline">Khan Academy SQL course · open if video is unavailable</a>
    </div> : <div className="mt-3 rounded-xl bg-[#13203a] p-5 text-white">
      <p className="text-xs font-bold uppercase tracking-widest">Captioned visual lesson · {slide + 1}/{slides.length}</p>
      <p className="my-5 min-h-20 text-lg leading-8" aria-live="polite">{slides[slide]}</p>
      <div className="flex gap-3">
        <button type="button" onClick={() => setPlaying(!playing)} className="rounded-full bg-white px-4 py-2 font-bold text-[#13203a]">{playing ? "Pause" : "Play with narration"}</button>
        <button type="button" onClick={() => {setPlaying(false);setSlide((slide + 1) % slides.length);}} className="rounded-full border border-white/40 px-4 py-2">Next caption</button>
      </div>
      <p className="mt-3 text-xs opacity-75">Original learning slides. Narration uses your browser voice when available.</p>
    </div>)}
  </section>;
}
