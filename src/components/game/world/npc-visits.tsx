"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Briefcase, GraduationCap, Sparkles, Users } from "lucide-react";

import { PLAYER, VISITOR, type VisitorKind } from "./art";
import { recordPick, type QuizQuestion } from "./use-bank-questions";

import { learningFocus, topicQuiz, type LearningFocus } from "@/app/games/world/actions";
import type { ActiveJob } from "@/components/careers/work";
import { trackDaily } from "@/components/game/engagement";
import { workplaceById } from "@/game/core/careers";
import { gameDateAt } from "@/game/core/game-clock";
import { safeSpot, TILE, type Portal, type WorldMap } from "@/game/core/world";
import { cn } from "@/lib/utils";

const NAMES: Record<VisitorKind, string[]> = {
  classmate: ["Maya", "Leo", "Zara", "Theo", "Amira", "Kai", "Isla", "Noah", "Priya", "Jayden"],
  coworker: ["Sam", "Jess", "Dev", "Ola", "Rory", "Bea"],
  mentor: ["Ms Okafor", "Mr Patel", "Dr Hughes", "Ms Rivera", "Mr Chen"],
};
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Each job has a daily shift at a fixed game hour, so coworkers know when to come and get you. */
export function shiftHour(workplace: string) {
  let h = 0;
  for (const c of workplace) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return [9, 13, 17][h % 3];
}

type Visit =
  | { kind: "classmate" | "mentor"; name: string; focus: LearningFocus; questions: QuizQuestion[] }
  | { kind: "coworker"; name: string; workplace: string; place: string; hour: number; door: Portal | null };

/**
 * People walk up to you in the world. A classmate brings a study quest on one
 * of your own course topics, a mentor brings a challenge on the topic holding
 * your grade back, and a coworker comes to fetch you before your shift.
 * Every answer counts towards your dashboard progress.
 */
export function NpcVisits({ enabled, map, job, playerName, onReward, onWaypoint, say }: {
  enabled: boolean;
  map: WorldMap;
  job: ActiveJob | null;
  playerName: string;
  onReward: () => void;
  onWaypoint: (portal: Portal, label: string) => void;
  say: (text: string, important?: boolean) => void;
}) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [talking, setTalking] = useState(false);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const pending = useRef(false);
  const nextAt = useRef(0);
  const study = useRef<"classmate" | "mentor">("classmate");

  const leave = useCallback(() => {
    VISITOR.leaving = true;
    setTalking(false);
    setVisit(null);
    setIndex(0); setPicked(null); setScore(0);
    nextAt.current = performance.now() + 100_000 + Math.random() * 50_000;
  }, []);

  // Decide who comes over next.
  const plan = useCallback(async (): Promise<Visit | null> => {
    if (job) {
      const hour = shiftHour(job.workplace), now = gameDateAt();
      const today = now.toISOString().slice(0, 10), key = `illuminated:shift-reminder:${job.workplace}:${today}`;
      let reminded = false;
      try { reminded = localStorage.getItem(key) === "1"; } catch { /* Optional. */ }
      const h = now.getUTCHours();
      if (!reminded && h >= hour - 2 && h < hour + 1) {
        try { localStorage.setItem(key, "1"); } catch { /* Optional. */ }
        const door = map.portals.find((p) => p.to.kind === "work" && p.to.workplace === job.workplace) ?? null;
        return { kind: "coworker", name: pick(NAMES.coworker), workplace: job.workplace, place: workplaceById(job.workplace)?.name ?? "work", hour, door };
      }
    }
    const focus = await learningFocus().catch(() => null);
    if (!focus?.topicId) return null;
    const questions = await topicQuiz(focus.topicId, 3).catch(() => []);
    if (!questions.length) return null;
    const kind = study.current;
    study.current = kind === "classmate" ? "mentor" : "classmate";
    return { kind, name: pick(NAMES[kind]), focus, questions };
  }, [job, map.portals]);

  // Send someone over every couple of minutes while you're out and about.
  useEffect(() => {
    if (!enabled) {
      if (VISITOR.active && !VISITOR.leaving) { VISITOR.active = false; setVisit(null); setTalking(false); }
      return;
    }
    if (!nextAt.current) nextAt.current = performance.now() + 35_000;
    const timer = window.setInterval(async () => {
      if (pending.current || VISITOR.active || performance.now() < nextAt.current) return;
      pending.current = true;
      const next = await plan();
      pending.current = false;
      if (!next) { nextAt.current = performance.now() + 60_000; return; }
      // Start a few tiles away on walkable ground and walk over.
      const angle = Math.random() * Math.PI * 2;
      const start = safeSpot(map, PLAYER.x + Math.cos(angle) * TILE * 7, PLAYER.y + Math.sin(angle) * TILE * 7);
      Object.assign(VISITOR, { active: true, id: VISITOR.id + 1, kind: next.kind, startX: start.x, startY: start.y, arrived: false, leaving: false });
      setVisit(next);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [enabled, map, plan]);

  // Development only: window.__demoVisit("classmate" | "mentor" | "coworker") sends someone over now.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __demoVisit?: (k: VisitorKind) => Promise<void> }).__demoVisit = async (k) => {
      const focus: LearningFocus = { topicId: "gcse-maths-linear-equations", topicTitle: "Linear equations", courseId: "gcse-maths", subject: "Maths", reason: "45% right so far", answered: 0, correct: 0 };
      const questions = await topicQuiz(focus.topicId, 3).catch(() => []);
      const next: Visit = k === "coworker" ? { kind: "coworker", name: "Sam", workplace: "pizzazz", place: "Pizzazz", hour: 13, door: map.portals.find((p) => p.id === "pizzazz") ?? null } : { kind: k, name: pick(NAMES[k]), focus, questions };
      const start = safeSpot(map, PLAYER.x + TILE * 6, PLAYER.y + TILE * 2);
      Object.assign(VISITOR, { active: true, id: VISITOR.id + 1, kind: k, startX: start.x, startY: start.y, arrived: false, leaving: false });
      setTalking(false); setVisit(next);
    };
  }, [map]);

  // Open the conversation when they reach you (or after a while, if the path was blocked).
  useEffect(() => {
    if (!visit || talking) return;
    const started = performance.now();
    const timer = window.setInterval(() => {
      if (VISITOR.arrived || performance.now() - started > 14_000) { setTalking(true); window.clearInterval(timer); }
    }, 200);
    return () => window.clearInterval(timer);
  }, [visit, talking]);

  if (!visit || !talking) return null;
  const Icon = visit.kind === "coworker" ? Briefcase : visit.kind === "mentor" ? GraduationCap : Users;
  const colour = visit.kind === "coworker" ? "#d97a2b" : visit.kind === "mentor" ? "#7a5ce6" : "#2b5fd9";
  const role = visit.kind === "coworker" ? "Coworker" : visit.kind === "mentor" ? "Mentor" : "Classmate";
  const questions = "questions" in visit ? visit.questions : [];
  const q = questions[index] ?? null;
  const done = visit.kind !== "coworker" && index >= questions.length;

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-24 z-[100003] mx-auto w-[min(32rem,calc(100%-1.5rem))]" onPointerDown={(e) => e.stopPropagation()}>
      <section role="dialog" aria-label={`${visit.name}, ${role}`} className="overflow-hidden rounded-3xl border-2 border-[#13203a] bg-[#f7f1e6] text-[#13203a] shadow-[0_8px_0_rgba(19,32,58,.35)]">
        <header className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: colour }}>
          <span className="grid size-10 place-items-center rounded-2xl bg-white/20"><Icon className="size-5" aria-hidden /></span>
          <span className="min-w-0 flex-1"><span className="block font-black">{visit.name}</span><span className="block text-xs font-bold opacity-85">{role}{visit.kind !== "coworker" && ` · ${visit.focus.subject}`}</span></span>
          <button type="button" onClick={leave} className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-black">Not now</button>
        </header>
        <div className="p-4 text-sm">
          {visit.kind === "coworker" && (
            <>
              <p className="font-bold">“Hey {playerName}! Your shift at {visit.place} starts at {String(visit.hour).padStart(2, "0")}:00. The manager asked me to come and find you. Coming?”</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="min-h-11 rounded-full bg-[#13203a] font-black text-white" onClick={() => { if (visit.door) onWaypoint(visit.door, visit.place); say(visit.door ? `Follow the marker to ${visit.place}.` : `Head to ${visit.place} when you're ready.`, true); leave(); }}>Head to work</button>
                <button type="button" className="min-h-11 rounded-full bg-white font-black ring-2 ring-[#13203a]/15" onClick={() => { say("Don't be late!"); leave(); }}>I&apos;ll be there soon</button>
              </div>
            </>
          )}
          {visit.kind !== "coworker" && index === 0 && picked === null && (
            <p className="font-bold">
              {visit.kind === "classmate"
                ? `“Hey ${playerName}! You do ${visit.focus.subject} too, right? I've got a test on ${visit.focus.topicTitle}. Can you help me with three questions?”`
                : `“${playerName}, a quick challenge. ${visit.focus.topicTitle} is the topic to work on in ${visit.focus.subject} (${visit.focus.reason.toLowerCase()}). Get two of these three right and you'll be closer to the next grade.”`}
            </p>
          )}
          {q && (
            <div className={cn(index === 0 && picked === null ? "mt-3" : "")}>
              <p className="text-[11px] font-black tracking-widest text-[#13203a]/55 uppercase">Quest · question {index + 1} of {questions.length}</p>
              <p className="mt-1 font-bold">{q.prompt}</p>
              <div className="mt-2 grid gap-1.5">
                {q.options.map((o, i) => (
                  <button key={`${o}-${i}`} type="button" disabled={picked !== null}
                    onClick={() => { setPicked(i); recordPick(q, i); if (i === q.answer) setScore((s) => s + 1); }}
                    className={cn("rounded-xl px-3 py-2 text-left font-bold ring-1", picked !== null && i === q.answer ? "bg-[#15987f] text-white ring-[#15987f]" : picked === i ? "bg-[#c8322d] text-white ring-[#c8322d]" : "bg-white ring-[#13203a]/15 hover:bg-[#eef3fb]")}>
                    {o}
                  </button>
                ))}
              </div>
              {picked !== null && (
                <>
                  {q.explain && <p className="mt-2 text-xs text-[#13203a]/75">{q.explain}</p>}
                  <button type="button" className="mt-3 min-h-11 w-full rounded-full bg-[#13203a] font-black text-white" onClick={() => { setIndex(index + 1); setPicked(null); }}>
                    {index + 1 < questions.length ? "Next question" : "Finish quest"}
                  </button>
                </>
              )}
            </div>
          )}
          {done && (
            <div className="text-center">
              <Sparkles className="mx-auto size-8" style={{ color: colour }} aria-hidden />
              <p className="mt-2 text-lg font-black">{score >= 2 ? "Quest complete!" : "Good try!"}</p>
              <p className="mt-1">
                {score >= 2
                  ? visit.kind === "classmate" ? `“Thanks ${playerName}, that really helped!” You got ${score}/${questions.length}.` : `“Great work. That's how grades go up.” You got ${score}/${questions.length}.`
                  : `You got ${score}/${questions.length}. ${visit.focus.topicTitle} is worth another look; it's saved on your dashboard.`}
              </p>
              <button type="button" className="mt-3 min-h-11 w-full rounded-full font-black text-white" style={{ background: colour }} onClick={() => { if (score >= 2) { onReward(); trackDaily({ quest: true }); } leave(); }}>
                {score >= 2 ? "Claim XP" : "Thanks"}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
