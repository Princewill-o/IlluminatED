"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Coins, Lock, X } from "lucide-react";

import { acceptRoleOffer, finishRoleInterview, finishRoleJob, loadRoleCareers, startRoleInterview, startRoleJob } from "@/app/games/world/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { TaskCard } from "@/components/careers/task-card";
import { WorkInterface } from "@/components/careers/work-interface";
import { HiringFlow } from "@/components/game/world/hiring";
import { addLocalHire, useRoleHiresState } from "@/components/game/world/role-hires";
import { roleSpec } from "@/game/core/interview";
import { createRng } from "@/game/core/rng";
import { roleStepTask } from "@/game/core/role-tasks";
import { jobSteps, levelForXp, payFor, roleById, skillScore, tierIndex } from "@/game/core/roles";

/** Practical roles that fit inside the existing games: the crew that keeps each one running. */
export const GAME_ROLES: { game: string; role: string; title: string; blurb: string }[] = [
  { game: "racing", role: "mechanic", title: "Pit mechanic", blurb: "Maths Racing's karts need tyres, checks and quick fixes between heats." },
  { game: "championship", role: "security", title: "Championship steward", blurb: "Check wristbands, guide the crowd and keep the stands safe." },
  { game: "championship", role: "nurse", title: "First-aid tent", blurb: "Look after anyone who feels unwell at the weekly tournament." },
  { game: "quiz", role: "cashier", title: "Quiz night snack bar", blurb: "Serve drinks and snacks to the Quiz Battle crowd." },
  { game: "tycoon", role: "builder", title: "London Tycoon site crew", blurb: "Build the flats players buy on the board." },
  { game: "panic", role: "cleaner", title: "Promotion Panic floor crew", blurb: "Reset the colour pads and keep the floor safe between rounds." },
];

type Phase = "ready" | "skill" | "task" | "doing" | "paying" | "done";

/** Apply and interview on site before your first job in a role. */
export function GameRoleJob({ entry, onClose }: { entry: (typeof GAME_ROLES)[number]; onClose: () => void }) {
  const { hires, ready } = useRoleHiresState();
  const [justHired, setJustHired] = useState(false);
  const claim = useRef<string | null>(null);
  const role = roleById(entry.role)!;
  const spec = useMemo(() => ({ ...roleSpec(role), title: entry.title, place: entry.title }), [role, entry.title]);
  if (!ready) return null;
  if (!justHired && !hires.has(role.id))
    return (
      <HiringFlow spec={spec} here playerName="" onClose={onClose} onHired={() => setJustHired(true)}
        start={async () => { const r = await startRoleInterview(role.id); if (!r.ok) return r; claim.current = r.claim; return { ok: true, seed: r.seed }; }}
        submit={(seed, answers) => finishRoleInterview(role.id, claim.current, seed, answers)}
        accept={async () => { const r = await acceptRoleOffer(claim.current); if (r.ok) addLocalHire(role.id); return r; }} />
    );
  return <GameRoleJobShift entry={entry} onClose={onClose} />;
}

/** One paid job for a role, set inside a game venue. Pay comes from the same server check as world jobs. */
function GameRoleJobShift({ entry, onClose }: { entry: (typeof GAME_ROLES)[number]; onClose: () => void }) {
  const role = roleById(entry.role)!;
  const [level, setLevel] = useState(1);
  const steps = useMemo(() => jobSteps(role, level), [role, level]);
  const [claim, setClaim] = useState<string | null>(null);
  const [practice, setPractice] = useState(false);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [marker, setMarker] = useState(0);
  const [result, setResult] = useState<{ pay: number; xp: number; practice: boolean } | null>(null);
  const [seed] = useState(() => Math.floor(Math.random() * 1e6));
  const scores = useRef<number[]>([]);
  const step = steps[index];
  const task = useMemo(() => roleStepTask(role.id, index, createRng(seed + index * 17)), [role.id, index, seed]);
  const zone = useMemo(() => ({ centre: 0.25 + ((seed + index * 37) % 50) / 100, width: Math.max(0.12, 0.26 - tierIndex(level) * 0.025) }), [seed, index, level]);

  useEffect(() => {
    let alive = true;
    void loadRoleCareers().then((c) => { if (alive) setLevel(levelForXp(c[role.id]?.xp ?? 0)); }).catch(() => {});
    void startRoleJob(role.id).then((r) => {
      if (!alive) return;
      if (!r.ok) { setPractice(true); setError(r.error); } else if (r.claim) setClaim(r.claim); else setPractice(true);
    }).catch(() => { if (alive) setPractice(true); });
    return () => { alive = false; };
  }, [role.id]);

  useEffect(() => {
    if (phase !== "skill") return;
    const start = performance.now();
    let raf = 0;
    const loop = () => { const t = (performance.now() - start) / 1000; setMarker(0.5 - 0.5 * Math.cos(t * (0.7 + tierIndex(level) * 0.12) * Math.PI)); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, level]);

  const finish = useCallback(async () => {
    setPhase("paying");
    const accuracy = scores.current.reduce((a, b) => a + b, 0) / Math.max(1, scores.current.length);
    if (practice || !claim) { setResult({ pay: payFor(role, steps.length, accuracy), xp: 0, practice: true }); setPhase("done"); return; }
    const r = await finishRoleJob(claim, steps.length, accuracy).catch(() => null);
    if (!r || !r.ok) { setError(r?.error ?? "Couldn't save the job."); setResult({ pay: 0, xp: 0, practice: true }); setPhase("done"); return; }
    setResult({ pay: r.pay, xp: r.xp, practice: false });
    notifyPlayerChanged();
    window.dispatchEvent(new CustomEvent("illumed:reward", { detail: { clout: r.pay, label: role.done, xp: r.xp, role: role.title } }));
    setPhase("done");
  }, [practice, claim, role, steps.length]);

  const record = useCallback((score: number) => {
    scores.current[index] = score;
    setPhase("doing");
    // The work itself takes a moment, like on a real shift.
    window.setTimeout(() => {
      if (index + 1 >= steps.length) void finish();
      else { setIndex((i) => i + 1); setPhase("ready"); }
    }, 2600);
  }, [index, steps.length, finish]);

  return (
    <div className="fixed inset-0 z-[100012] grid place-items-center overflow-y-auto bg-black/60 p-3" role="dialog" aria-label={entry.title}>
      <section className="my-4 w-full max-w-3xl overflow-hidden rounded-3xl border-[3px] border-[#141020] bg-[#f7f1e6] text-[#13203a] shadow-[0_8px_0_#141020] [color-scheme:light]">
        <header className="flex items-center gap-3 px-5 py-3 text-white" style={{ background: role.colour }}>
          <p className="text-sm font-black tracking-wide uppercase">{entry.title} · {role.title}</p>
          <button type="button" onClick={onClose} aria-label="Leave the job" className="ml-auto grid size-9 place-items-center rounded-full bg-black/20"><X className="size-4" /></button>
        </header>
        <div className="p-5">
          {phase !== "done" && phase !== "paying" && step && (
            <>
              <p className="text-xs font-bold text-[#13203a]/60">Step {index + 1} of {steps.length}</p>
              <p className="text-xl font-black">{step.label}</p>
              <div className="mt-2 flex gap-1">{steps.map((_, i) => <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < index ? role.colour : i === index ? "#f2a541" : "rgba(0,0,0,.1)" }} />)}</div>
              {practice && error && index === 0 && <p className="mt-3 flex items-start gap-2 rounded-xl bg-black/5 p-3 text-sm">{role.plus && <Lock className="mt-0.5 size-4 shrink-0" />}{error} Practice jobs don&apos;t pay.</p>}
              {phase === "ready" && <button type="button" onClick={() => setPhase(task ? "task" : "skill")} className="mt-4 min-h-11 w-full rounded-full bg-[#13203a] px-4 font-black text-white">{task ? `Open: ${task.title}` : "Start this step"}</button>}
              {phase === "skill" && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-[#13203a]/70">Stop the marker in the green to do it well.</p>
                  <div className="relative mt-2 h-8 overflow-hidden rounded-full bg-black/10">
                    <span className="absolute inset-y-0 rounded-full bg-[#6cc04a]" style={{ left: `${(zone.centre - zone.width / 2) * 100}%`, width: `${zone.width * 100}%` }} />
                    <span className="absolute inset-y-0 w-1.5 -translate-x-1/2 rounded-full bg-[#13203a]" style={{ left: `${marker * 100}%` }} />
                  </div>
                  <button type="button" onClick={() => record(skillScore(marker, zone.centre, zone.width))} className="mt-2 min-h-11 w-full rounded-full bg-[#f2a541] px-4 font-black">Now!</button>
                </div>
              )}
              {phase === "task" && task && (
                <div className="mt-4">
                  <WorkInterface taskKind={String(task.kind)} place={role.id}>
                    <TaskCard bare task={task} index={index} total={steps.length} onDone={(ok) => record(ok ? 1 : 0.15)} />
                  </WorkInterface>
                </div>
              )}
              {phase === "doing" && (
                <div className="mt-4">
                  <p className="text-sm font-black">Working…</p>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full" style={{ background: role.colour, animation: "game-role-work 2.6s linear forwards" }} /></div>
                  <style>{"@keyframes game-role-work{from{width:0}to{width:100%}}"}</style>
                </div>
              )}
            </>
          )}
          {phase === "paying" && <p className="font-bold">Handing in the job…</p>}
          {phase === "done" && result && (
            <div>
              <p className="text-xl font-black">{role.done}!</p>
              {result.practice
                ? <p className="mt-1 text-sm">{error || "Practice job"} (would pay about {result.pay} Clout).</p>
                : <p className="mt-1 flex items-center gap-1.5 text-2xl font-black text-[#c85a00]"><Coins className="size-6" />+{result.pay} Clout <span className="text-base text-[#13203a]/70">· +{result.xp} XP</span></p>}
              <button type="button" onClick={onClose} className="mt-4 min-h-11 rounded-full bg-[#13203a] px-6 font-black text-white">Done</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
