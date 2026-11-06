"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PANIC, PLAYER } from "./art";

import { type RunResult, finishShift, panicDeck } from "@/app/games/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { trackDaily } from "@/components/game/engagement";
import { play, soundOn } from "@/components/game/sound";
import { companyById } from "@/game/core/companies";
import { buildDeck } from "@/game/core/deck";
import { newSeed } from "@/game/core/rng";
import { RANKS, type ShiftState, accuracy, answer, currentQuestion, next, startShift } from "@/game/core/shift";
import { TILE, type WorldMap, blocked } from "@/game/core/world";
import { cn } from "@/lib/utils";

/**
 * Promotion Panic played on the floor of the world: four coloured pads appear around you,
 * the music plays, and wherever you're standing when it stops is your answer.
 */
const ROUND = 15;
const PADS = [
  { name: "Red", colour: "#e5484d" },
  { name: "Blue", colour: "#2b6fe0" },
  { name: "Yellow", colour: "#e8b10e" },
  { name: "Green", colour: "#2fa865" },
];
const short = (t: string, n = 34) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/** Four walkable spots around the player, a few tiles apart (world px). */
function padSpots(map: WorldMap, n: number) {
  const ox = PLAYER.x, oy = PLAYER.y;
  const dirs = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.4], [0, 1.4], [-1.4, 0], [1.4, 0]];
  const spots: { x: number; y: number }[] = [];
  for (const scale of [3.4, 2.6, 1.9, 4.2])
    for (const [dx, dy] of dirs) {
      if (spots.length >= n) break;
      const x = ox + dx * scale * TILE, y = oy + dy * scale * TILE * 0.8;
      if (blocked(map, x, y) || spots.some((s) => Math.hypot(s.x - x, s.y - y) < TILE * 2.7)) continue;
      spots.push({ x, y });
    }
  while (spots.length < n) spots.push({ x: ox + (spots.length - 1.5) * TILE * 2.8, y: oy - TILE * 2.5 });
  return spots;
}

/** A looping "musical chairs" tune, quickening as time runs out. */
function useRoundMusic(on: boolean, urgency: number) {
  const urgencyRef = useRef(urgency);
  urgencyRef.current = urgency;
  useEffect(() => {
    if (!on || !soundOn()) return;
    let ctx: AudioContext;
    try { ctx = new AudioContext(); } catch { return; }
    const tune = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 988, 784, 659, 587];
    let i = 0, stopped = false, timer = 0;
    const tick = () => {
      if (stopped) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = i % 2 ? "triangle" : "square";
      o.frequency.value = tune[i++ % tune.length];
      g.gain.setValueAtTime(0.045, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.18);
      timer = window.setTimeout(tick, 210 - urgencyRef.current * 100);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); void ctx.close().catch(() => {}); };
  }, [on]);
}

type Deck = NonNullable<Awaited<ReturnType<typeof panicDeck>>>;

export function PanicFloor({ companyId, map, onExit }: { companyId: string; map: WorldMap; onExit: () => void }) {
  const company = companyById(companyId);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [state, setState] = useState<ShiftState | null>(null);
  const [stage, setStage] = useState<"loading" | "ready" | "round" | "reveal" | "done">("loading");
  const [count, setCount] = useState(3);
  const [left, setLeft] = useState(ROUND);
  const [standing, setStanding] = useState(-1);
  const [saved, setSaved] = useState<RunResult | string | null>(null);
  const [seed, setSeed] = useState(newSeed);
  const roundStart = useRef(0);
  const shiftStart = useRef(0);
  const stateRef = useRef<ShiftState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    let live = true;
    void panicDeck(companyId).then((d) => { if (live) { setDeck(d); setStage("ready"); } }).catch(() => live && setStage("ready"));
    return () => { live = false; PANIC.active = false; PANIC.pads = []; PANIC.version++; };
  }, [companyId]);

  const layPads = useCallback((s: ShiftState) => {
    const q = currentQuestion(s);
    const spots = padSpots(map, q.options.length);
    PANIC.pads = q.options.map((o, i) => ({ ...spots[i], colour: PADS[i % 4].colour, label: `${PADS[i % 4].name}: ${short(o)}` }));
    PANIC.answer = q.answer;
    PANIC.reveal = false;
    PANIC.active = true;
    PANIC.version++;
    roundStart.current = performance.now();
    setLeft(ROUND);
    setStage("round");
  }, [map]);

  // Countdown, then the first round.
  useEffect(() => {
    if (stage !== "ready" || !deck || !company) return;
    if (count > 0) { const t = window.setTimeout(() => { setCount((c) => c - 1); play("tick", soundOn()); }, 900); return () => clearTimeout(t); }
    const fresh = startShift(buildDeck(company, deck.sources, seed));
    shiftStart.current = Date.now();
    setState(fresh);
    layPads(fresh);
  }, [stage, count, deck, company, seed, layPads]);

  const lock = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.phase !== "question") return;
    const used = (performance.now() - roundStart.current) / 1000;
    const chosen = PANIC.pads.findIndex((p) => Math.hypot(PLAYER.x - p.x, PLAYER.y - p.y) < TILE * 1.35);
    const after = answer(s, chosen >= 0 ? chosen : null, Math.max(0, 1 - used / ROUND));
    setState(after);
    PANIC.reveal = true;
    setStage("reveal");
    play(after.last?.correct ? (after.last.promotedTo ? "promote" : "right") : "wrong", soundOn());
    if (after.last?.correct) trackDaily({ answered: 1 });
  }, []);

  // The round clock, and which pad you're standing on.
  useEffect(() => {
    if (stage !== "round") return;
    const id = window.setInterval(() => {
      const used = (performance.now() - roundStart.current) / 1000;
      setLeft(Math.max(0, ROUND - used));
      setStanding(PANIC.pads.findIndex((p) => Math.hypot(PLAYER.x - p.x, PLAYER.y - p.y) < TILE * 1.35));
      if (used >= ROUND) { window.clearInterval(id); lock(); }
    }, 100);
    const key = (e: KeyboardEvent) => { if ((e.key === "e" || e.key === "E" || e.key === "Enter") && PANIC.pads.some((p) => Math.hypot(PLAYER.x - p.x, PLAYER.y - p.y) < TILE * 1.35)) lock(); };
    window.addEventListener("keydown", key);
    return () => { window.clearInterval(id); window.removeEventListener("keydown", key); };
  }, [stage, lock]);

  // After the reveal: next round, or the end of the shift.
  useEffect(() => {
    if (stage !== "reveal" || !state) return;
    const t = window.setTimeout(() => {
      const moved = next(state);
      setState(moved);
      if (moved.phase === "over") {
        PANIC.active = false; PANIC.version++;
        setStage("done");
        if (deck?.canSave && company)
          void finishShift({ company: company.id, seed, score: moved.score, correct: moved.correct, total: moved.answered || 1, bestStreak: moved.bestStreak, durationMs: Math.max(1, Date.now() - shiftStart.current), fired: moved.fired, workplace: deck.workplace, currentlyEmployed: deck.currentlyEmployed, challenge: null })
            .then((r) => { setSaved(r.ok ? r.result : r.error); if (r.ok) notifyPlayerChanged(); })
            .catch(() => setSaved("Couldn't save this shift."));
      } else layPads(moved);
    }, 3200);
    return () => clearTimeout(t);
  }, [stage, state, deck, company, seed, layPads]);

  useRoundMusic(stage === "round", Math.max(0, 1 - left / ROUND));

  if (!company) return null;
  const q = state && state.phase !== "over" ? currentQuestion(state) : null;
  const last = state?.last;
  return (
    <>
      {/* Question board along the top; the floor is the answer sheet. */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[36] flex justify-center px-3">
        <section className="pointer-events-auto w-full max-w-2xl rounded-2xl border-b-4 border-black/40 bg-[#13203a]/95 p-4 text-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 text-xs font-black tracking-wide uppercase">
            <span className="text-[#ffd166]">Promotion Panic · {company.name}</span>
            {state && <span>{fmt(state.score)} pts · {RANKS[state.rank].title} · {"✕".repeat(state.strikes)}{"○".repeat(Math.max(0, 3 - state.strikes))}</span>}
          </div>
          {stage === "loading" && <p className="mt-3 text-lg font-black">{company.boss.name} is setting up the floor…</p>}
          {stage === "ready" && (
            <div className="mt-2">
              <p className="text-lg font-black">Musical colours! When the music stops, stand on the right colour.</p>
              <p className="mt-1 text-sm text-white/75">Walk onto a pad. You have {ROUND} seconds each round. Press E on a pad to lock in early for extra points.</p>
              <p className="mt-2 text-4xl font-black text-[#ffd166]">{count || "Go!"}</p>
            </div>
          )}
          {q && (stage === "round" || stage === "reveal") && (
            <>
              <p className="mt-2 text-xs font-bold text-white/60">Task {state!.index + 1} of {state!.questions.length} · {q.topic}</p>
              <p className="mt-1 text-lg leading-snug font-black">{q.prompt}</p>
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {q.options.map((o, i) => (
                  <li key={i} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ring-2 transition",
                    stage === "reveal" ? (i === q.answer ? "ring-white" : "opacity-40 ring-transparent") : standing === i ? "ring-white" : "ring-transparent")}
                    style={{ background: `${PADS[i % 4].colour}cc` }}>
                    <span className="shrink-0 rounded-md bg-black/25 px-1.5 py-0.5 text-[10px] uppercase">{PADS[i % 4].name}</span>{o}
                  </li>
                ))}
              </ul>
              {stage === "round" && (
                <div className="mt-3">
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#ffd166] transition-[width] duration-100" style={{ width: `${(left / ROUND) * 100}%` }} /></div>
                  <p className="mt-1.5 text-center text-sm font-black">{Math.ceil(left)}s · {standing >= 0 ? `You're on ${PADS[standing].name}${" · press E to lock in"}` : "Get to a pad!"}</p>
                </div>
              )}
              {stage === "reveal" && last && (
                <p className={cn("mt-3 rounded-xl px-3 py-2 text-sm font-black", last.correct ? "bg-[#2fa865]" : "bg-[#7b342b]")}>
                  {last.correct ? `Correct! +${last.points}${last.promotedTo ? ` · Promoted to ${RANKS[last.promotedTo].title}!` : ""}` : last.timedOut ? `Off the pads! It was ${PADS[q.answer % 4].name}.` : `Not that one. It was ${PADS[q.answer % 4].name}.`}
                  <span className="mt-1 block text-xs font-bold text-white/85">{q.explain}</span>
                </p>
              )}
            </>
          )}
          {stage === "done" && state && (
            <div className="mt-2">
              <p className="text-2xl font-black">{state.fired ? "Three strikes. You're fired… for today." : `Shift over: ${RANKS[state.rank].title}!`}</p>
              <p className="mt-1 text-sm">{fmt(state.score)} points · {accuracy(state)}% right · best streak {state.bestStreak}{deck && deck.previousBest ? ` · your best ${fmt(deck.previousBest)}` : ""}</p>
              {saved && <p className="mt-1 text-sm font-bold text-[#ffd166]">{typeof saved === "string" ? saved : `+${saved.xp} XP · +${saved.clout} Clout${saved.newBest ? " · new best!" : ""}`}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" className="min-h-11 flex-1 rounded-xl border-b-4 border-[#a8864b] bg-[#f2d9a6] font-black text-[#13203a]"
                  onClick={() => { setSaved(null); setSeed(newSeed()); setCount(3); setState(null); setStage("ready"); }}>Play again</button>
                <button type="button" className="min-h-11 flex-1 rounded-xl border-b-4 border-black/30 bg-white/10 font-black" onClick={onExit}>Back to the world</button>
              </div>
            </div>
          )}
          {stage !== "done" && <button type="button" onClick={onExit} className="mt-2 text-xs font-bold text-white/60 underline">Leave the game</button>}
        </section>
      </div>
    </>
  );
}
const fmt = (n: number) => n.toLocaleString("en-GB");
