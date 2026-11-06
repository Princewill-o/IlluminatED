"use client";

import { useEffect, useRef, useState } from "react";

import { HudSlot } from "./hud";

import { cn } from "@/lib/utils";

/** Booking in at the custody desk: cuffs checked, rights read, prints and photo, then into a cell. */
const STEPS = [
  { title: "Custody desk", line: "Custody officer: \"You've been arrested. I'm going to book you in.\"" },
  { title: "Your rights", line: "You have the right to free legal advice, to tell someone where you are, and to read the codes of practice." },
  { title: "Fingerprints", line: "Each finger is scanned onto the system." },
  { title: "Custody photo", line: "Look at the camera. Hold still." },
  { title: "Handcuffs off", line: "The cuffs come off. You're shown to holding cell 1." },
];

export function BookingIn({ charge, onDone }: { charge: string; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (step >= STEPS.length) { done.current(); return; }
    const t = window.setTimeout(() => setStep((s) => s + 1), step === 3 ? 1900 : 1500);
    return () => clearTimeout(t);
  }, [step]);
  const s = STEPS[Math.min(step, STEPS.length - 1)];
  return (
    <div className="fixed inset-0 z-[100012] grid place-items-center bg-[#0d1726]/80 p-4 text-white" role="status" aria-live="assertive">
      <style>{`@keyframes custody-flash{0%{opacity:0}8%{opacity:1}100%{opacity:0}}@keyframes custody-scan{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}`}</style>
      {step === 3 && <div className="pointer-events-none absolute inset-0 bg-white" style={{ animation: "custody-flash .9s ease-out .7s both" }} />}
      <section className="w-full max-w-lg rounded-3xl border-b-4 border-black/40 bg-[#13203a] p-6 shadow-2xl">
        <p className="text-xs font-black tracking-[0.25em] text-[#8fb4ff] uppercase">Police custody · {charge}</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#1f3f8a]">
            {step === 2 && <><span className="text-4xl" aria-hidden>☝</span><span className="absolute inset-x-0 h-6 bg-[#6bc6ff]/50" style={{ animation: "custody-scan .8s linear infinite" }} /></>}
            {step === 3 && <span className="text-4xl" aria-hidden>📷</span>}
            {step === 0 && <span className="text-4xl" aria-hidden>🗂</span>}
            {step === 1 && <span className="text-4xl" aria-hidden>⚖</span>}
            {step >= 4 && <span className="text-4xl" aria-hidden>🔓</span>}
          </div>
          <div>
            <p className="text-2xl font-black">{s.title}</p>
            <p className="mt-1 text-sm text-white/80">{s.line}</p>
          </div>
        </div>
        <div className="mt-5 flex gap-1.5">{STEPS.map((_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-[#6bc6ff]" : "bg-white/15")} />)}</div>
        <p className="mt-3 text-[11px] text-white/50">A fictional game. Real custody is covered by PACE Code C.</p>
      </section>
    </div>
  );
}

/** In the holding cell: time until the van to court, and the choice to ask for a solicitor. */
export function HoldingCellHud({ until, solicitor, onSolicitor }: { until: number; solicitor: boolean; onSolicitor: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <HudSlot area="tl" order={20}>
      <div className="pixel-panel w-[min(330px,100%)] p-4">
        <p className="text-xs font-black tracking-widest uppercase">Holding cell 1 · police custody</p>
        <p className="mt-1 text-lg font-black">Van to Crown Court in {left}s</p>
        <p className="mt-1 text-xs">You can&apos;t leave the cell. Officers will take you to court for your hearing.</p>
        <button type="button" disabled={solicitor} onClick={onSolicitor} className="pixel-button mt-3 w-full rounded-full bg-[#2b5fd9] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          {solicitor ? "Duty solicitor briefed: stronger defence in court" : "Ask for the duty solicitor (free)"}
        </button>
      </div>
    </HudSlot>
  );
}
