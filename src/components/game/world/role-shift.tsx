"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Coins, Sparkles } from "lucide-react";

import { PLAYER, PLAYER_WORK } from "./art";
import type { Place } from "./city-map";

import { finishRoleJob, startRoleJob } from "@/app/games/world/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { TaskCard } from "@/components/careers/task-card";
import { WorkInterface } from "@/components/careers/work-interface";
import { workplaceRoute } from "@/game/core/daily-jobs";
import { createRng } from "@/game/core/rng";
import { roleStepTask } from "@/game/core/role-tasks";
import { type PracticalRole, jobSteps, jobSpots, levelForXp, payFor, roleTiers, skillScore, tierIndex } from "@/game/core/roles";
import { TILE, type WorldMap } from "@/game/core/world";

type Phase = "walk" | "skill" | "task" | "doing" | "paying" | "done";
type Reward = { pay: number; xp: number; level: number; levelUp: boolean; tierUp: string | null; practice: boolean; note?: string };

/**
 * A shift in a practical role. Each job is a run of steps: walk to the glowing spot,
 * do the skill check (stop the marker in the green), then your character does the work
 * with the matching animation. The server pays the finished job.
 */
export function RoleShift({ role, level: startLevel, map, onTarget, onBusy, onPaid, onEnd }: {
  role: PracticalRole;
  level: number;
  map: WorldMap;
  onTarget: (p: Place | null) => void;
  onBusy: (busy: boolean) => void;
  onPaid: (clout: number) => void;
  onEnd: () => void;
}) {
  const [level, setLevel] = useState(startLevel);
  const [job, setJob] = useState(0);
  const steps = useMemo(() => jobSteps(role, level), [role, level]);
  const [claim, setClaim] = useState<string | null>(null);
  const [practice, setPractice] = useState(false);
  const [seed] = useState(() => Math.floor(Math.random() * 1e6));
   
  const spots = useMemo(() => {
    // Indoors, work happens at the furniture: desks, counters, tills, beds. Outdoors, spread nearby.
    const furniture = map.kind !== "city" && map.kind !== "campus" ? workplaceRoute(map) : [];
    if (furniture.length >= 3) return steps.map((_, i) => furniture[(i + job) % furniture.length]);
    return jobSpots(map, { x: PLAYER.x, y: PLAYER.y }, steps.length, seed + job * 97);
  }, [map, steps, seed, job]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("walk");
  const [distance, setDistance] = useState(Infinity);
  const scores = useRef<number[]>([]);
  const [shiftPay, setShiftPay] = useState(0);
  const [reward, setReward] = useState<Reward | null>(null);
  const [error, setError] = useState("");
  const xpRef = useRef<number | null>(null);
  const step = steps[index], spot = spots[index];
  // Some steps are a real decision in the job's own tool (till, ticket rail, monitor, tablet...).
  const realTask = useMemo(() => roleStepTask(role.id, index, createRng(seed + job * 131 + index * 17)), [role.id, index, seed, job]);
  const begin = useCallback(() => setPhase(realTask ? "task" : "skill"), [realTask]);

  // Clock in for each job.
  useEffect(() => {
    let alive = true;
    setClaim(null);
    void startRoleJob(role.id).then((r) => {
      if (!alive) return;
      if (!r.ok) { setPractice(true); setError(r.error); return; }
      if (r.claim) setClaim(r.claim); else setPractice(true);
    }).catch(() => { if (alive) setPractice(true); });
    return () => { alive = false; };
  }, [role.id, job]);

  useEffect(() => { onBusy(phase === "skill" || phase === "doing"); return () => onBusy(false); }, [phase, onBusy]);
  useEffect(() => {
    if (!spot || phase === "done" || phase === "paying") { onTarget(null); return; }
    onTarget({ id: `role-${role.id}-${index}`, name: `${role.title}: ${step.label}`, kind: "job", x: spot.x, y: spot.y });
    const tick = () => setDistance(Math.hypot(PLAYER.x - spot.x, PLAYER.y - spot.y));
    tick();
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
  }, [spot, step, index, phase, role, onTarget]);
  useEffect(() => () => { onTarget(null); PLAYER_WORK.activity = null; }, [onTarget]);

  // The skill check: a marker sweeps across; stop it in the green zone. Faster at higher tiers.
  const tier = tierIndex(level);
  const zone = useMemo(() => ({ centre: 0.25 + ((seed + index * 37 + job * 11) % 50) / 100, width: Math.max(0.12, 0.26 - tier * 0.025) }), [seed, index, job, tier]);
  const [marker, setMarker] = useState(0);
  const skillStart = useRef(0);
  const lockRef = useRef<(value?: number) => void>(() => {});
  useEffect(() => {
    if (phase !== "skill") return;
    skillStart.current = performance.now();
    let raf = 0;
    const speed = 0.7 + tier * 0.12;
    const loop = () => {
      const t = (performance.now() - skillStart.current) / 1000;
      setMarker(0.5 - 0.5 * Math.cos(t * speed * Math.PI));
      if (t > 6) { lockRef.current(0.2); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const finishJob = useCallback(async () => {
    setPhase("paying");
    const accuracy = scores.current.reduce((a, b) => a + b, 0) / Math.max(1, scores.current.length);
    if (practice || !claim) {
      setReward({ pay: payFor(role, steps.length, accuracy), xp: 0, level, levelUp: false, tierUp: null, practice: true });
      setPhase("done");
      return;
    }
    const r = await finishRoleJob(claim, steps.length, accuracy).catch(() => null);
    if (!r || !r.ok) { setError(r?.error ?? "Couldn't save the job."); setReward({ pay: 0, xp: 0, level, levelUp: false, tierUp: null, practice: true, note: r?.error }); setPhase("done"); return; }
    const newLevel = levelForXp(r.total_xp);
    const tierUp = tierIndex(newLevel) > tierIndex(level) ? roleTiers(role)[tierIndex(newLevel)].title : null;
    xpRef.current = r.total_xp;
    setReward({ pay: r.pay, xp: r.xp, level: newLevel, levelUp: newLevel > level, tierUp, practice: false, note: r.capped ? "Daily Clout cap reached: XP still counts." : undefined });
    setShiftPay((n) => n + r.pay);
    if (r.pay) onPaid(r.pay);
    notifyPlayerChanged();
    window.dispatchEvent(new CustomEvent("illumed:reward", { detail: { clout: r.pay, label: role.done, xp: r.xp, role: role.title } }));
    setLevel(newLevel);
    setPhase("done");
  }, [practice, claim, role, steps.length, level, onPaid]);

  const lock = useCallback((value?: number) => {
    const score = value ?? skillScore(marker, zone.centre, zone.width);
    scores.current[index] = score;
    setPhase("doing");
    PLAYER_WORK.activity = step.action;
    window.setTimeout(() => {
      PLAYER_WORK.activity = null;
      if (index + 1 >= steps.length) void finishJob();
      else { setIndex((i) => i + 1); setPhase("walk"); }
    }, 1800);
  }, [marker, zone, index, step, steps.length, finishJob]);
  useEffect(() => { lockRef.current = lock; }, [lock]);

  const near = distance < TILE * 1.8;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key !== "e" && e.key !== "E" && e.key !== " ") return;
      if (phase === "walk" && near) { e.preventDefault(); begin(); }
      else if (phase === "skill") { e.preventDefault(); lock(); }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [phase, near, lock, begin]);

  const nextJob = () => { scores.current = []; setIndex(0); setReward(null); setError(""); setPhase("walk"); setJob((j) => j + 1); };
  const quality = (v: number) => v >= 0.9 ? "Perfect" : v >= 0.7 ? "Good" : v >= 0.4 ? "OK" : "Sloppy";

  return (
    <>
      <aside className="absolute top-28 left-1/2 z-[70] w-[min(380px,calc(100%-24px))] -translate-x-1/2 overflow-hidden rounded-2xl border-b-4 border-black/40 bg-[#13203a]/95 text-white shadow-xl" aria-live="polite">
        <div className="flex items-center gap-2 px-4 py-2" style={{ background: role.colour }}>
          <p className="text-xs font-black tracking-widest uppercase">{role.title} · {roleTiers(role)[tier].title}</p>
          <p className="ml-auto flex items-center gap-1 text-xs font-black"><Coins className="size-3.5" />{shiftPay} this shift</p>
        </div>
        <div className="p-4">
          {phase !== "done" && phase !== "paying" && step && (
            <>
              <p className="text-[11px] font-bold text-white/60">Job {job + 1} · step {index + 1} of {steps.length}</p>
              <p className="mt-1 text-lg leading-tight font-black">{step.label}</p>
              <div className="mt-2 flex gap-1">{steps.map((_, i) => <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < index ? role.colour : i === index ? "#ffd166" : "rgba(255,255,255,.15)" }} />)}</div>
              {practice && error && index === 0 && phase === "walk" && (
                <p className="mt-2 rounded-xl bg-white/10 p-2 text-xs">{error} Practice jobs don't pay.{role.plus && <> <a href="/pricing" className="font-black text-[#ffd166] underline">See Plus</a></>}</p>
              )}
              {phase === "walk" && <p className="mt-3 text-sm">{near ? "You're at the spot." : `${Math.ceil(distance / TILE)} tiles away · follow the glowing pin`}</p>}
              {phase === "walk" && (
                <button type="button" disabled={!near} onClick={begin} className="mt-3 min-h-11 w-full rounded-full bg-[#ffd166] px-4 font-black text-[#13203a] disabled:opacity-40">{near ? (realTask ? `Open: ${realTask.title} (E)` : "Start (E)") : "Walk to the spot"}</button>
              )}
              {phase === "skill" && (
                <div className="mt-3">
                  <p className="text-xs font-bold text-white/70">Stop the marker in the green to do it well.</p>
                  <div className="relative mt-2 h-8 overflow-hidden rounded-full bg-white/10">
                    <span className="absolute inset-y-0 rounded-full bg-[#6cc04a]/80" style={{ left: `${(zone.centre - zone.width / 2) * 100}%`, width: `${zone.width * 100}%` }} />
                    <span className="absolute inset-y-0 w-1.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_white]" style={{ left: `${marker * 100}%` }} />
                  </div>
                  <button type="button" onClick={() => lock()} className="mt-2 min-h-11 w-full rounded-full bg-white px-4 font-black text-[#13203a]">Now! (E / Space)</button>
                </div>
              )}
              {phase === "doing" && (
                <div className="mt-3">
                  <p className="text-sm font-black text-[#ffd166]">{quality(scores.current[index] ?? 0)} · working…</p>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full" style={{ background: role.colour, animation: "role-work 1.8s linear forwards" }} /></div>
                  <style>{"@keyframes role-work{from{width:0}to{width:100%}}"}</style>
                </div>
              )}
            </>
          )}
          {phase === "paying" && <p className="text-sm font-bold">Handing in the job…</p>}
          {phase === "done" && reward && (
            <div>
              <p className="text-lg font-black">{role.done}!</p>
              {reward.practice
                ? <p className="mt-1 text-sm text-white/80">{reward.note ?? error ?? ""} {reward.note || error ? "" : "Practice job"} (would pay about {reward.pay} Clout).</p>
                : <p className="mt-1 text-2xl font-black text-[#ffd166]">+{reward.pay} Clout <span className="text-base text-white/80">· +{reward.xp} XP</span></p>}
              {reward.levelUp && <p className="mt-1 flex items-center gap-1 text-sm font-black text-[#7ee08a]"><Sparkles className="size-4" /> Level {reward.level}!{reward.tierUp ? ` Promoted to ${reward.tierUp}.` : ""}</p>}
              {reward.note && !reward.practice && <p className="mt-1 text-xs text-white/70">{reward.note}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={nextJob} className="min-h-11 flex-1 rounded-full bg-[#ffd166] px-4 font-black text-[#13203a]">Next job</button>
                <button type="button" onClick={onEnd} className="min-h-11 rounded-full bg-white/10 px-4 font-bold">End shift</button>
              </div>
            </div>
          )}
          {phase !== "done" && <button type="button" onClick={onEnd} className="mt-2 text-xs text-white/60 underline">End shift</button>}
        </div>
      </aside>
      {phase === "task" && realTask && (
        <div className="fixed inset-0 z-[100008] grid place-items-center overflow-y-auto bg-black/60 p-3">
          <section role="dialog" aria-label={realTask.title} className="my-4 w-full max-w-3xl [color-scheme:light]">
            <p className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-black tracking-widest text-white uppercase" style={{ background: role.colour }}>{role.title} · {step.label}</p>
            <WorkInterface taskKind={String(realTask.kind)} place={role.id}>
              <TaskCard bare task={realTask} index={index} total={steps.length} onDone={(correct) => lock(correct ? 1 : 0.15)} />
            </WorkInterface>
          </section>
        </div>
      )}
    </>
  );
}

/** "+40 Clout — Pizza order completed" toasts, with the career XP shown separately. */
export function RewardToasts() {
  const [items, setItems] = useState<{ id: number; clout: number; label: string; xp: number; role: string }[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ clout: number; label: string; xp: number; role: string }>).detail;
      if (!d) return;
      const id = Date.now() + Math.random();
      setItems((list) => [...list.slice(-2), { id, ...d }]);
      window.setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), 4200);
    };
    window.addEventListener("illumed:reward", on);
    return () => window.removeEventListener("illumed:reward", on);
  }, []);
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed top-20 right-4 z-[100009] grid gap-2" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="rounded-2xl border-b-4 border-black/30 bg-[#13203a] px-4 py-2.5 text-white shadow-xl" style={{ animation: "reward-in .35s cubic-bezier(.2,1.4,.4,1)" }}>
          <p className="flex items-center gap-1.5 text-sm font-black"><Coins className="size-4 text-[#ffd166]" /><span className="text-[#ffd166]">+{t.clout} Clout</span> · {t.label}</p>
          {t.xp > 0 && <p className="text-[11px] font-bold text-white/70">+{t.xp} career XP · {t.role}</p>}
        </div>
      ))}
      <style>{"@keyframes reward-in{from{transform:translateX(40px) scale(.9);opacity:0}to{transform:none;opacity:1}}"}</style>
    </div>
  );
}
