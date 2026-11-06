"use client";

import { useCallback, useEffect, useState } from "react";

import { BookOpen, ChevronDown, X } from "lucide-react";

import { recordPick, type QuizQuestion } from "./use-bank-questions";

import { learningFocus, topicQuiz, type LearningFocus } from "@/app/games/world/actions";
import { cn } from "@/lib/utils";

/**
 * The learning card in the world HUD: the topic to work on next, how many
 * questions you've answered today, and a quick three-question round you can
 * do on the spot. Every answer here, on the bus, at the police station or at
 * airport security is saved to your dashboard progress and estimated grade.
 */
export function LearningTracker({ hidden }: { hidden?: boolean }) {
  const [focus, setFocus] = useState<LearningFocus | null>(null);
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState({ answered: 0, correct: 0 });
  const [round, setRound] = useState<QuizQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [enabled, setEnabled] = useState(true);
  // The Learn card can be switched off from the pause menu's Settings.
  useEffect(() => {
    try { setEnabled(localStorage.getItem("world-learn-card") !== "off"); } catch { /* Optional. */ }
    const on = (e: Event) => { const v = (e as CustomEvent<{ learnCard?: boolean }>).detail?.learnCard; if (v !== undefined) setEnabled(v); };
    window.addEventListener("illumed:world-settings", on);
    return () => window.removeEventListener("illumed:world-settings", on);
  }, []);

  const refresh = useCallback(() => {
    void learningFocus().then((f) => { setFocus(f); if (f) setToday({ answered: f.answered, correct: f.correct }); }).catch(() => {});
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const on = (e: Event) => {
      const correct = (e as CustomEvent<{ correct: boolean }>).detail?.correct;
      setToday((t) => ({ answered: t.answered + 1, correct: t.correct + (correct ? 1 : 0) }));
    };
    window.addEventListener("illumed:learned", on);
    return () => window.removeEventListener("illumed:learned", on);
  }, []);

  if (hidden || !focus || !enabled) return null;
  const q = round?.[index];
  const start = async () => {
    if (!focus.topicId) return;
    const qs = await topicQuiz(focus.topicId, 3).catch(() => []);
    if (!qs.length) return;
    setRound(qs); setIndex(0); setPicked(null); setScore(0);
  };
  const finish = () => { setRound(null); refresh(); };

  return (
    <div className="pointer-events-auto w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-white/15 bg-[#13203a]/95 text-white shadow-[0_8px_24px_rgba(0,0,0,.25)]" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="gloss-off flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left">
        <BookOpen className="size-4 shrink-0 text-[#9ec5ff]" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-black">Learn: {focus.topicTitle}</span>
          <span className="block text-[10px] text-white/60">{today.answered} answered today · {focus.subject}</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 transition", open && "rotate-180")} aria-hidden />
      </button>
      {open && !round && (
        <div className="border-t border-white/10 p-3 text-xs">
          <p className="text-white/75">{focus.reason}. Questions you answer anywhere in the world count towards this topic, your quests and your estimated grade.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {focus.topicId && <button type="button" onClick={() => void start()} className="gloss-off min-h-10 rounded-xl bg-[#f2d9a6] font-black text-[#0d1726]">Quick round</button>}
            <a href={`/courses/${focus.courseId}${focus.topicId ? `/${focus.topicId}` : ""}`} target="_blank" rel="noreferrer" className={cn("gloss-off grid min-h-10 place-items-center rounded-xl bg-white/10 font-black", !focus.topicId && "col-span-2")}>Read the lesson</a>
          </div>
        </div>
      )}
      {round && q && (
        <div className="border-t border-white/10 p-3 text-xs" role="group" aria-label="Quick round">
          <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-white/50 uppercase">
            <span>Question {index + 1} of {round.length}</span>
            <button type="button" aria-label="Stop the round" onClick={finish}><X className="size-4" aria-hidden /></button>
          </div>
          <p className="mt-1 text-sm font-bold">{q.prompt}</p>
          <div className="mt-2 grid gap-1.5">
            {q.options.map((o, i) => (
              <button key={`${o}-${i}`} type="button" disabled={picked !== null}
                onClick={() => { setPicked(i); recordPick(q, i); if (i === q.answer) setScore((s) => s + 1); }}
                className={cn("gloss-off rounded-xl px-3 py-2 text-left font-bold ring-1", picked !== null && i === q.answer ? "bg-[#15987f] ring-[#15987f]" : picked === i ? "bg-[#c8322d] ring-[#c8322d]" : "bg-white/10 ring-white/15 hover:bg-white/15")}>
                {o}
              </button>
            ))}
          </div>
          {picked !== null && (
            <div className="mt-2">
              {q.explain && <p className="text-white/70">{q.explain}</p>}
              <button type="button" className="gloss-off mt-2 min-h-10 w-full rounded-xl bg-[#f2d9a6] font-black text-[#0d1726]"
                onClick={() => { if (index + 1 < round.length) { setIndex(index + 1); setPicked(null); } else finish(); }}>
                {index + 1 < round.length ? "Next question" : `Done · ${score}/${round.length}`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
