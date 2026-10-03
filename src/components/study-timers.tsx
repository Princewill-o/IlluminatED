"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { Clock3, Moon, Pause, Play, RotateCcw } from "lucide-react";

type Mode = "pomodoro" | "exam";
const MINUTE = 60_000;

function clock(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function StudyTimer({ mode }: { mode: Mode }) {
  const exam = mode === "exam";
  const [minutes, setMinutes] = useState(exam ? 90 : 25);
  const [remaining, setRemaining] = useState((exam ? 90 : 25) * MINUTE);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [prompt, setPrompt] = useState<"pause" | "end" | null>(null);
  const keepWorking = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (prompt) keepWorking.current?.focus(); }, [prompt]);

  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const next = Math.max(0, endAt - Date.now());
      setRemaining(next);
      if (next === 0) setEndAt(null);
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [endAt]);

  const start = () => {
    const duration = started ? remaining : minutes * MINUTE;
    if (duration <= 0) return;
    setRemaining(duration);
    setStarted(true);
    setEndAt(Date.now() + duration);
  };
  const confirm = () => {
    if (prompt === "pause") {
      setRemaining(Math.max(0, (endAt ?? Date.now()) - Date.now()));
      setEndAt(null);
    } else {
      setEndAt(null);
      setStarted(false);
      setRemaining(minutes * MINUTE);
    }
    setPrompt(null);
  };

  return (
    <div className={exam ? "fixed inset-0 z-[90] overflow-y-auto bg-slate-950 px-6 py-12 text-white sm:px-12" : "rounded-3xl border bg-white p-6 text-slate-950 shadow-sm"}>
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className={exam ? "rounded-full bg-blue-500/20 p-4 text-blue-300" : "rounded-full bg-blue-50 p-4 text-blue-700"}>
          {exam ? <Moon aria-hidden /> : <Clock3 aria-hidden />}
        </span>
        <h2 className="mt-5 text-2xl font-bold">{exam ? "Exam mode" : "Focus timer"}</h2>
        <p className={exam ? "mt-2 max-w-lg text-sm text-slate-300" : "mt-2 max-w-lg text-sm text-slate-600"}>
          {exam ? "Open your downloaded paper, set its time, and work without distractions. Pausing or ending asks you to confirm." : "Try 25 minutes of focused revision, then take a five-minute break."}
        </p>
        <label className="mt-7 text-sm font-medium" htmlFor={`${mode}-minutes`}>Duration in minutes</label>
        <input id={`${mode}-minutes`} type="number" min="1" max="240" value={minutes} disabled={started} onChange={(event) => {
          const value = Math.min(240, Math.max(1, Number(event.target.value) || 1));
          setMinutes(value);
          setRemaining(value * MINUTE);
        }} className={exam ? "mt-2 w-24 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-center text-white" : "mt-2 w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-center"} />
        <p className="mt-7 text-7xl font-bold tabular-nums tracking-tight sm:text-8xl" role="timer" aria-label={`${Math.ceil(remaining / MINUTE)} minutes remaining`}>{clock(remaining)}</p>
        <p className={exam ? "mt-3 text-sm text-slate-300" : "mt-3 text-sm text-slate-600"} role="status">
          {remaining === 0 ? "Time is up. You can review your answers now." : endAt ? "Timer running" : started ? "Timer paused" : "Ready when you are"}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {endAt === null && remaining > 0 && <button onClick={start} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500"><Play size={18} aria-hidden />{started ? "Resume" : "Start"}</button>}
          {endAt !== null && <button onClick={() => setPrompt("pause")} className="inline-flex items-center gap-2 rounded-full border border-current px-6 py-3 font-semibold"><Pause size={18} aria-hidden />Pause</button>}
          {started && <button onClick={() => setPrompt("end")} className="inline-flex items-center gap-2 rounded-full border border-current px-6 py-3 font-semibold"><RotateCcw size={18} aria-hidden />End session</button>}
        </div>
        {exam && <div className="mt-8 flex flex-wrap justify-center gap-5 text-sm text-blue-300">
          {!started && <Link href="/dashboard" className="underline underline-offset-4">Back to dashboard</Link>}
          {!started && <Link href="/resources" className="underline underline-offset-4">Get a practice paper</Link>}
        </div>}
        {prompt && <div role="alertdialog" aria-modal="true" aria-labelledby={`${mode}-confirm-title`} className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-left text-slate-950 shadow-2xl">
            <h3 id={`${mode}-confirm-title`} className="text-lg font-bold">{prompt === "pause" ? "Pause your timer?" : "Finish this session?"}</h3>
            <p className="mt-2 text-sm text-slate-600">{prompt === "pause" ? "Your remaining time will be kept until you resume." : "Your timer will reset. Make sure you are ready to finish."}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button ref={keepWorking} onClick={() => setPrompt(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Keep working</button>
              <button onClick={confirm} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{prompt === "pause" ? "Pause" : "Finish"}</button>
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}
