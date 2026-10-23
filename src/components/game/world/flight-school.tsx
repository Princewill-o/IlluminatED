"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BookOpen, Plane, X } from "lucide-react";

import { PLAYER, TUTOR } from "./art";
import { HudSlot } from "./hud";

import { ARCADE } from "@/game/core/arcade";
import { createRng, newSeed } from "@/game/core/rng";
import { TILE, type TutorialStation } from "@/game/core/world";
import { cn } from "@/lib/utils";

/** Set once a player has finished (or skipped) Flight School. */
export const FLIGHT_SCHOOL_KEY = "illuminated:flight-school";

type Step = {
  /** The objective, in a few words. */
  title: string;
  /** The keys to press. */
  keys: string[];
  /** Where Ava walks, in tiles (a path through the doorways). */
  path: [number, number][];
  say: string;
  /** "near": walk up to Ava. A station: use it. "phone": open your phone. */
  goal: "near" | "phone" | TutorialStation;
};

export const FLIGHT_STEPS: Step[] = [
  { path: [[7, 9]], goal: "near", title: "Walk to Ava", keys: ["W", "A", "S", "D"], say: "Welcome to IlluminatED Airport! I'm Ava, your guide. Walk over to me with WASD or the arrow keys (on a phone, drag the joystick)." },
  { path: [[9, 9], [12, 9], [15, 6]], goal: "near", title: "Follow Ava to check-in", keys: ["W", "A", "S", "D"], say: "Nice moves! Follow me through the doorway to the check-in desks." },
  { path: [[15, 5]], goal: "interact", title: "Check in at the desk", keys: ["E"], say: "Stand in front of the check-in desk and press E (or tap the button that pops up). That's how you use anything in London: doors, tills, buses, desks." },
  { path: [[15, 12], [19, 13], [22, 13], [25, 6]], goal: "near", title: "Follow Ava to security", keys: ["W", "A", "S", "D"], say: "Bag checked in. Now follow me to security." },
  { path: [[25, 5]], goal: "study", title: "Answer the security question", keys: ["E"], say: "Security asks a quick question from your subjects, just like jobs, buses and the police do in London. Walk up to the scanner, press E and answer it." },
  { path: [[27, 6], [31, 6], [34, 10]], goal: "near", title: "Into the departure lounge", keys: ["W", "A", "S", "D"], say: "Clever! Follow me into the departure lounge." },
  { path: [[34, 11]], goal: "eat", title: "Grab a snack at the café", keys: ["E"], say: "Your needs (hunger, energy, mood) drop over time. Keep them topped up. Grab a snack at the café counter with E." },
  { path: [[38, 8]], goal: "phone", title: "Open your phone, then close it", keys: ["📱"], say: "Your phone has the map, buses, jobs, friends and calls. Tap the phone button (bottom right) to open it, then close it again." },
  { path: [[39, 5]], goal: "board", title: "Board at Gate 1", keys: ["E"], say: "You're ready! One rule: break the law and the police will chase you. Walk to Gate 1 and press E to fly to London." },
];

/** Ava walks along a step's path one point at a time (~3 tiles a second); true once she's at the end. */
function useAvaWalk(step: number) {
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const path = FLIGHT_STEPS[step]?.path ?? [];
    const timers: number[] = [];
    setArrived(false);
    TUTOR.active = true;
    let from = { x: TUTOR.x / TILE - 0.5, y: TUTOR.y / TILE - 0.5 }, at = 0;
    for (const [x, y] of path) {
      const delay = at;
      timers.push(window.setTimeout(() => { TUTOR.x = (x + 0.5) * TILE; TUTOR.y = (y + 0.5) * TILE; }, delay));
      at += (Math.hypot(x - from.x, y - from.y) / 3) * 1000;
      from = { x, y };
    }
    timers.push(window.setTimeout(() => setArrived(true), at));
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [step]);
  return arrived;
}

/** Ava's speech bubble and progress; drives the guide and spots "walk to me" goals. */
export function FlightSchoolGuide({ step, onNext, onSkip }: { step: number; onNext: () => void; onSkip: () => void }) {
  const s = FLIGHT_STEPS[step];
  const arrived = useAvaWalk(step);
  const next = useRef(onNext);
  next.current = onNext;
  useEffect(() => {
    if (!s || s.goal !== "near") return;
    const timer = window.setInterval(() => {
      const end = s.path[s.path.length - 1];
      const d = Math.hypot(PLAYER.x / TILE - (end[0] + 0.5), PLAYER.y / TILE - (end[1] + 0.5));
      if (d < 2.4) { window.clearInterval(timer); next.current(); }
    }, 250);
    return () => window.clearInterval(timer);
  }, [s, step]);
  useEffect(() => {
    // Local debugging only: lets automated walkthroughs read positions.
    if (process.env.NODE_ENV === "development") (window as unknown as { __flight?: unknown }).__flight = { PLAYER, TUTOR };
    return () => { TUTOR.active = false; };
  }, []);
  if (!s) return null;
  return (
    <HudSlot area="tc" order={5}>
      <section aria-live="polite" aria-label="Airport guide" className="w-[min(26rem,calc(100vw-1.5rem))] rounded-3xl border-2 border-[#2b5fd9] bg-[#f7f1e6] p-4 text-[#13203a] shadow-xl">
        <div className="flex items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2b5fd9] text-sm font-black text-white" aria-hidden>A</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black tracking-widest text-[#2b5fd9] uppercase">Airport · step {step + 1} of {FLIGHT_STEPS.length}</p>
            <p className="text-sm font-black">Ava</p>
          </div>
          <button type="button" onClick={onSkip} className="gloss-off rounded-full px-3 py-1 text-xs font-bold text-[#5a6272] hover:bg-black/5">Skip</button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#2b5fd9] px-3 py-2 text-white">
          <span className="text-[10px] font-black tracking-widest uppercase opacity-80">Objective</span>
          <span className="min-w-0 flex-1 text-sm font-black">{s.title}</span>
          <span className="flex shrink-0 gap-1" aria-label={`Keys: ${s.keys.join(", ")}`}>
            {s.keys.map((k) => <kbd key={k} className="grid min-w-6 place-items-center rounded-md border-b-2 border-[#13203a]/40 bg-white px-1.5 py-0.5 font-mono text-[11px] font-black text-[#13203a]">{k}</kbd>)}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed">{s.say}</p>
        <div className="mt-3 flex gap-1" aria-hidden>
          {FLIGHT_STEPS.map((_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < step ? "bg-[#15987f]" : i === step ? "bg-[#2b5fd9]" : "bg-[#13203a]/15")} />)}
        </div>
        {s.goal === "near" && !arrived && <p className="mt-2 text-xs text-[#5a6272]">Ava is walking… follow her.</p>}
      </section>
    </HudSlot>
  );
}

/** The help-desk explainer opened from the first interactive station. */
export function FlightSchoolDesk({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[100008] grid place-items-center bg-black/60 p-4">
      <section role="dialog" aria-modal="true" aria-label="Check-in desk" className="w-full max-w-md rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a]">
        <p className="text-xs font-black tracking-widest text-[#2b5fd9] uppercase">Boarding pass · LHR → London</p>
        <h2 className="mt-1 text-2xl font-black">You&apos;re checked in!</h2>
        <p className="mt-3 leading-relaxed">That&apos;s interacting. In London you&apos;ll use it on doors, bus stops, shop tills, desks and people.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li><b>Move:</b> WASD, arrow keys or the joystick</li>
          <li><b>Interact:</b> E, Enter or tap the pop-up button</li>
          <li><b>Map:</b> M, or the minimap in the corner</li>
          <li><b>Chat:</b> the blue Chat button (be kind)</li>
        </ul>
        <button type="button" onClick={onClose} className="jelly mt-5 rounded-full bg-[#2b5fd9] px-5 py-2 font-black text-white">Got it</button>
      </section>
    </div>
  );
}

/** One practice question at the training desk. */
export function FlightSchoolQuiz({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const rng = useMemo(() => createRng(newSeed()), []);
  const [q, setQ] = useState(() => ARCADE[0].make(rng));
  const [picked, setPicked] = useState<number | null>(null);
  const right = picked === q.answer;
  return (
    <div className="absolute inset-0 z-[100008] grid place-items-center overflow-y-auto bg-black/60 p-4">
      <section role="dialog" aria-modal="true" aria-label="Practice desk" className="w-full max-w-md rounded-3xl bg-[#f7f1e6] p-6 text-[#13203a]">
        <div className="flex items-center gap-2">
          <BookOpen className="size-6 text-[#2b5fd9]" />
          <h2 className="flex-1 text-xl font-black">Practice desk</h2>
          <button type="button" onClick={onClose} aria-label="Close practice desk"><X className="size-5" /></button>
        </div>
        <p className="mt-5 text-2xl font-black">{q.prompt}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {q.options.map((o, i) => (
            <button key={i} type="button" disabled={picked !== null} onClick={() => setPicked(i)}
              className={cn("rounded-2xl border-2 bg-white p-3 font-bold", picked !== null && i === q.answer ? "border-[#15987f]" : picked === i ? "border-[#c8322d]" : "border-transparent")}>
              {o}
            </button>
          ))}
        </div>
        {picked !== null && (
          <>
            <p className="mt-3 text-sm">{right ? "Correct! In London that earns XP and Clout." : `Not quite: it was ${q.options[q.answer]}. Try another.`}</p>
            <button type="button" onClick={() => { if (right) onDone(); else { setQ(ARCADE[0].make(rng)); setPicked(null); } }} className="jelly mt-4 rounded-full bg-[#2b5fd9] px-5 py-2 font-black text-white">
              {right ? "Continue" : "Next question"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

const FLIGHT_MS = 6500;

/** Take-off from Flight School, over the clouds, and landing in London. */
export function PlaneCutscene({ onArrive }: { onArrive: () => void }) {
  const finish = useRef(onArrive);
  finish.current = onArrive;
  useEffect(() => {
    const timer = window.setTimeout(() => finish.current(), FLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="fixed inset-0 z-[100012] overflow-hidden bg-[#7ec3f0] text-white" role="status" aria-live="assertive">
      <style jsx>{`
        @keyframes fs-sky { 0% { background-position: 0 0; } 100% { background-position: -2000px 0; } }
        @keyframes fs-plane { 0% { transform: translate(-60vw, 30vh) rotate(-14deg) scale(.7); } 25% { transform: translate(-10vw, 0) rotate(-4deg) scale(1); } 70% { transform: translate(5vw, -2vh) rotate(0deg) scale(1); } 100% { transform: translate(70vw, 22vh) rotate(10deg) scale(.6); } }
        @keyframes fs-cloud { from { transform: translateX(110vw); } to { transform: translateX(-60vw); } }
        @keyframes fs-city { 0%, 55% { transform: translateY(100%); } 100% { transform: translateY(0); } }
        @keyframes fs-dusk { 0%, 50% { opacity: 0; } 100% { opacity: .55; } }
        @media (prefers-reduced-motion: reduce) { .fs-anim { animation: none !important; } }
      `}</style>
      <div className="absolute inset-0 bg-gradient-to-b from-[#3f8fd6] via-[#7ec3f0] to-[#cfe9f9]" />
      <div className="fs-anim absolute inset-0 bg-gradient-to-b from-[#f2a65a]/0 via-[#f2a65a]/40 to-[#ff7e5f]/60" style={{ animation: `fs-dusk ${FLIGHT_MS}ms ease-in both` }} />
      {[18, 38, 58, 74].map((top, i) => (
        <span key={top} className="fs-anim absolute h-14 w-64 rounded-full bg-white/80 blur-[2px]" style={{ top: `${top}%`, animation: `fs-cloud ${2.6 + i * 0.7}s linear ${i * 0.4}s infinite` }} />
      ))}
      {/* London skyline rising into view as we descend. */}
      <svg className="fs-anim absolute inset-x-0 bottom-0 h-[34%] w-full" viewBox="0 0 1200 260" preserveAspectRatio="none" style={{ animation: `fs-city ${FLIGHT_MS}ms ease-out both` }} aria-hidden>
        <path fill="#26364f" d="M0 260V180h60v-40h40v40h50v-70h30v70h40v-50h60l10-60 10 60h30v-90h12v-30h6v30h12v90h40v-40l40-30 40 30v40h50v-120h20v-20h20v20h20v120h40v-60h70v60h30v-30a60 60 0 0 1 120 0v30h40v-80h40v80h60v-50h50v50h70v-30h40v30h60v80z" />
        <circle cx="905" cy="150" r="70" fill="none" stroke="#26364f" strokeWidth="6" />
        <rect y="235" width="1200" height="25" fill="#2f6a8c" />
      </svg>
      <div className="fs-anim absolute top-1/2 left-1/2 -mt-10 -ml-24" style={{ animation: `fs-plane ${FLIGHT_MS}ms ease-in-out both` }}>
        <Plane className="size-48 rotate-45 fill-white text-[#13203a] drop-shadow-[0_18px_20px_rgba(0,0,0,.35)]" strokeWidth={1.2} aria-hidden />
      </div>
      <div className="absolute inset-x-4 top-8 mx-auto max-w-xl rounded-3xl border border-white/30 bg-[#13203a]/85 p-5 text-center shadow-xl backdrop-blur">
        <p className="text-xs font-black tracking-[.18em] text-[#f2d9a6] uppercase">Flight IL101 · Terminal 1 to London</p>
        <p className="mt-2 text-2xl font-black">Next stop: London</p>
        <p className="mt-1 text-sm text-white/75">Your new life starts on landing. Study, work, explore and level up.</p>
        <button type="button" onClick={() => finish.current()} className="pointer-events-auto mt-4 min-h-10 rounded-full border border-white/35 px-5 text-xs font-bold hover:bg-white/10">Skip flight</button>
      </div>
    </div>
  );
}
