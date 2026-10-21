"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { Heart, Rocket, Search, Timer, Trophy } from "lucide-react";

import { earnSeasonXp, usePass } from "./pass-store";
import { useIllumship } from "../city/membership";

import { type Hero, HEROES, VILLAIN } from "@/game/core/heroes";
import { currentEvent, timeLeft } from "@/game/core/live-events";
import { QUESTION_BANK, type BankQuestion } from "@/lib/data/topics";

/**
 * Hero Rush: the live-event game. Pick a Lumen League hero, answer questions to
 * charge your power and knock out The Fog before it fogs your memory. Answering
 * your hero's own subject hits harder. Other event weeks reuse the same engine
 * with a different goal (fuel a rocket, crack a case, win a cup).
 */
type Mode = "hero" | "space" | "case" | "cup";
const SKIN: Record<Mode, { title: string; goal: string; meter: string; win: string; lose: string }> = {
  hero: { title: "Hero Rush", goal: `Knock out ${VILLAIN.name}`, meter: `${VILLAIN.name} HP`, win: "The Fog is cleared. London remembers!", lose: "The Fog rolled in. Regroup and try again." },
  space: { title: "Orbit Rush", goal: "Reach orbit before the fuel runs out", meter: "Distance to orbit", win: "Orbit reached. Stage separation complete!", lose: "Out of fuel. Back to the launch pad." },
  case: { title: "Case Rush", goal: "Crack the Thames case before the tide turns", meter: "Mystery left", win: "Case closed. Brilliant deduction!", lose: "The trail went cold. Re-open the case." },
  cup: { title: "Cup Rush", goal: "Win the final", meter: "Points to win", win: "Champions! Lift that cup.", lose: "Knocked out. There's always next season." },
};

const ROUNDS = 12;
/** Free players get this many runs a day; Plus members play as much as they like. */
const FREE_RUNS = 5;
const today = () => new Date().toISOString().slice(0, 10);
const SECONDS = 20;
const MAX_HP: number = VILLAIN.hp;

function shuffle<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Damage for a correct answer, including the hero's power. */
function damage(h: Hero, q: BankQuestion, streak: number, hits: number) {
  let d = 70 + Math.min(streak, 6) * 15;
  if (h.topics.test(q.topicTitle)) d *= 1.5;
  if (h.id === "quotient" && hits === 0) d *= 2;
  if (h.id === "photon") d += 30;
  if (h.id === "catalyst") d += Math.min(streak, 6) * 15;
  if (h.id === "byte" && hits < 3) d *= 2;
  return Math.round(d);
}

export function HeroRush({ userId, mode }: { userId: string; mode: Mode }) {
  usePass(userId); // remembers the account for Season XP
  const skin = SKIN[mode];
  const { event, endsAt } = currentEvent();
  const [hero, setHero] = useState<Hero | null>(null);
  const [qs, setQs] = useState<BankQuestion[]>([]);
  const [round, setRound] = useState(0);
  const [hp, setHp] = useState<number>(MAX_HP);
  const [hearts, setHearts] = useState(3);
  const [streak, setStreak] = useState(0);
  const [hits, setHits] = useState(0);
  const [twist, setTwist] = useState(true);
  const [healed, setHealed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const [pops, setPops] = useState<{ id: number; text: string; good: boolean }[]>([]);
  const [shake, setShake] = useState(0);
  const [best, setBest] = useState(0);
  const popId = useRef(0);
  const plus = useIllumship();
  const [runs, setRuns] = useState(0);
  const runsKey = `illuminated:rush-runs:${userId}:${today()}`;
  useEffect(() => {
    try {
      setRuns(Number(localStorage.getItem(runsKey)) || 0);
    } catch {
      /* ignore */
    }
  }, [runsKey]);
  const outOfRuns = !plus && runs >= FREE_RUNS;
  const over = hero && (hp <= 0 || hearts <= 0 || round >= ROUNDS);
  const won = hp <= 0;
  const q = qs[round];

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(`illuminated:rush-best:${userId}`)) || 0);
    } catch {
      /* ignore */
    }
  }, [userId]);

  const start = (h: Hero) => {
    if (outOfRuns) return;
    const used = runs + 1;
    setRuns(used);
    try {
      localStorage.setItem(runsKey, String(used));
    } catch {
      /* ignore */
    }
    const mine = QUESTION_BANK.filter((x) => h.topics.test(x.topicTitle));
    const pool = shuffle([...shuffle(mine).slice(0, 6), ...shuffle(QUESTION_BANK)]).filter((x, i, a) => a.findIndex((y) => y.key === x.key) === i);
    setQs(pool.slice(0, ROUNDS));
    setHero(h);
    setRound(0); setHp(MAX_HP); setHearts(3); setStreak(0); setHits(0); setTwist(true); setHealed(false); setPicked(null); setLeft(SECONDS);
  };

  const pop = (text: string, good: boolean) => {
    const id = ++popId.current;
    setPops((p) => [...p, { id, text, good }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1100);
  };

  const answer = useCallback(
    (i: number) => {
      if (!hero || !q || picked !== null || over) return;
      setPicked(i);
      const correct = i === q.answer;
      if (correct || (hero.id === "quill" && twist)) {
        if (!correct) setTwist(false);
        const d = damage(hero, q, streak, hits);
        setHp((v) => Math.max(0, v - d));
        setStreak((s) => s + 1);
        setHits((n) => n + 1);
        setShake((s) => s + 1);
        pop(correct ? `-${d}` : `Plot twist! -${d}`, true);
        if (correct) earnSeasonXp("correct");
      } else {
        setStreak(0);
        if (hero.id === "helix" && !healed) {
          setHealed(true);
          pop("Regenerate! No heart lost", true);
        } else {
          setHearts((h) => h - 1);
          pop(mode === "hero" ? "The Fog strikes!" : mode === "space" ? "Engine stall!" : mode === "case" ? "Wrong lead!" : "Goal conceded!", false);
        }
      }
      setTimeout(() => {
        setPicked(null);
        setLeft(SECONDS);
        setRound((r) => r + 1);
      }, 1300);
    },
    [hero, q, picked, over, streak, hits, twist, healed, mode],
  );

  // Countdown: running out of time counts as a wrong answer.
  useEffect(() => {
    if (!hero || over || picked !== null) return;
    if (left <= 0) {
      answer(-1);
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [hero, over, picked, left, answer]);

  // Rewards once, when the run ends.
  const settled = useRef(false);
  useEffect(() => {
    if (!over) {
      settled.current = false;
      return;
    }
    if (settled.current) return;
    settled.current = true;
    earnSeasonXp(won ? "eventWin" : "eventPlay");
    const score = (MAX_HP - hp) + hearts * 100 + (won ? 500 : 0);
    if (score > best) {
      setBest(score);
      try {
        localStorage.setItem(`illuminated:rush-best:${userId}`, String(score));
      } catch {
        /* ignore */
      }
    }
  }, [over, won, hp, hearts, best, userId]);

  const header = useMemo(
    () => (
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#5b56c8] dark:text-[#b3afff]">
            Live event: {event.name} · {timeLeft(endsAt)} {event.xpBoost > 1 && `· ${event.xpBoost}x Season XP`}
          </p>
          <h1 className="arcade-display mt-1 text-4xl md:text-5xl">{skin.title}</h1>
          {mode !== "hero" && <p className="text-sm"><Link href="/games/heroes?mode=hero" className="underline">Play Hero Rush instead</Link></p>}
          <p className="mt-1 text-muted-foreground">{skin.goal}. Correct answers charge your hero; your own subject hits 1.5x harder.</p>
        </div>
        <Link href="/games/pass" className="rounded-xl border-[3px] border-[#1d1a4a] bg-[#ffd23f] px-4 py-2 font-black text-[#1d1a4a] shadow-[3px_3px_0_#1d1a4a]">
          Season Pass
        </Link>
      </div>
    ),
    [event, endsAt, skin],
  );

  if (!hero)
    return (
      <div className="space-y-6">
        {header}
        <p className="font-bold">Choose your hero</p>
        {plus ? (
          <p className="text-sm text-muted-foreground">Plus: unlimited runs.</p>
        ) : outOfRuns ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[3px] border-[#1d1a4a] bg-[#ffd23f] p-4 text-[#1d1a4a] shadow-[3px_3px_0_#1d1a4a]">
            <p className="font-bold">You&apos;ve used today&apos;s {FREE_RUNS} free runs. They come back tomorrow, or get unlimited runs with Plus.</p>
            <Link href="/pricing" className="rounded-xl border-[3px] border-[#1d1a4a] bg-[#5b56c8] px-4 py-2 font-black text-white">See Plus</Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{FREE_RUNS - runs} of {FREE_RUNS} free runs left today. Plus members play unlimited.</p>
        )}
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {HEROES.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => start(h)}
                disabled={outOfRuns}
                className="group flex disabled:cursor-not-allowed disabled:opacity-50 h-full w-full flex-col items-center rounded-3xl border-[3px] border-[#1d1a4a] p-4 text-center shadow-[5px_5px_0_#1d1a4a] transition hover:-translate-y-1"
                style={{ background: `linear-gradient(160deg, ${h.colours.trim}, #ffffff)` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/heroes/${h.id}.webp`} alt="" className="h-36 w-auto transition group-hover:scale-105" />
                <span className="mt-2 text-lg font-black text-[#1d1a4a]">{h.name}</span>
                <span className="text-xs font-bold text-[#1d1a4a]/70">{h.subject}</span>
                <span className="mt-2 text-xs text-[#1d1a4a]">{h.power}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Best score: {best}. Want to battle other players live? Try Quiz Battle in the <Link href="/games/hub" className="underline">Games Hall</Link>.
        </p>
      </div>
    );

  return (
    <div className="space-y-5">
      {header}
      <section className="relative grid items-end gap-4 overflow-hidden rounded-3xl border-[3px] border-[#1d1a4a] bg-[linear-gradient(180deg,#1b1650,#3a2d8a_60%,#6a4bd6)] p-5 text-white shadow-[6px_6px_0_#1d1a4a] sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/heroes/${hero.id}.webp`} alt={hero.name} className={`h-40 w-auto transition-transform duration-300 ${picked !== null && picked === q?.answer ? "translate-x-10 -rotate-6" : ""}`} />
          <p className="font-black">{hero.name}</p>
          <p className="flex gap-1" aria-label={`${hearts} hearts left`}>
            {[0, 1, 2].map((i) => <Heart key={i} className={`size-5 ${i < hearts ? "fill-[#ff6f91] text-[#ff6f91]" : "text-white/30"}`} />)}
          </p>
        </div>
        <div className="text-center text-sm font-bold">
          <p>Round {Math.min(round + 1, ROUNDS)} / {ROUNDS}</p>
          {streak > 1 && <p className="mt-1 rounded-full bg-[#ffd23f] px-3 py-1 text-[#1d1a4a]">Streak x{streak}</p>}
        </div>
        <div className="relative flex flex-col items-center">
          {mode === "hero" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={shake} src={won ? "/heroes/fog-hurt.webp" : "/heroes/fog.webp"} alt={VILLAIN.name} className={`h-36 w-auto ${shake ? "[animation:rush-shake_0.45s]" : ""} ${won ? "opacity-40 transition-opacity duration-700" : ""}`} />
          ) : (
            <span key={shake} className={`grid size-32 place-items-center rounded-full border-4 border-white/80 bg-white/15 ${shake ? "[animation:rush-shake_0.45s]" : ""}`}>
              {mode === "space" ? <Rocket className={`size-16 transition-transform duration-500 ${won ? "-translate-y-6" : ""}`} aria-hidden /> : mode === "case" ? <Search className="size-16" aria-hidden /> : <Trophy className={`size-16 ${won ? "text-[#ffd23f]" : ""}`} aria-hidden />}
            </span>
          )}
          <div className="mt-2 h-4 w-48 overflow-hidden rounded-full border-2 border-white/80 bg-black/30" role="meter" aria-label={skin.meter} aria-valuenow={hp} aria-valuemin={0} aria-valuemax={MAX_HP}>
            <div className="h-full bg-[linear-gradient(90deg,#ff6f91,#ffd23f)] transition-[width] duration-500" style={{ width: `${(hp / MAX_HP) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs">{skin.meter}: {hp}</p>
          {pops.map((p) => (
            <span key={p.id} className={`pointer-events-none absolute top-6 text-2xl font-black [animation:rush-pop_1.1s_ease-out_forwards] ${p.good ? "text-[#ffd23f]" : "text-[#ff6f91]"}`}>{p.text}</span>
          ))}
        </div>
      </section>

      {over ? (
        <section className="rounded-3xl border-[3px] border-[#1d1a4a] bg-card p-6 text-center shadow-[5px_5px_0_#1d1a4a]">
          <Trophy className={`mx-auto size-12 ${won ? "text-[#ffb02e]" : "text-muted-foreground"}`} aria-hidden />
          <h2 className="mt-2 text-2xl font-black">{won ? skin.win : skin.lose}</h2>
          <p className="mt-1 text-muted-foreground">You landed {hits} hit{hits === 1 ? "" : "s"}. Season XP earned for every correct answer{won ? ", plus the win bonus" : ""}.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button type="button" disabled={outOfRuns} onClick={() => start(hero)} className="disabled:opacity-50 rounded-xl border-[3px] border-[#1d1a4a] bg-[#5b56c8] px-5 py-3 font-black text-white shadow-[3px_3px_0_#1d1a4a]">Play again</button>
            <button type="button" onClick={() => setHero(null)} className="rounded-xl border-[3px] border-[#1d1a4a] bg-white px-5 py-3 font-black text-[#1d1a4a] shadow-[3px_3px_0_#1d1a4a]">Change hero</button>
            <Link href="/games/pass" className="rounded-xl border-[3px] border-[#1d1a4a] bg-[#ffd23f] px-5 py-3 font-black text-[#1d1a4a] shadow-[3px_3px_0_#1d1a4a]">Claim rewards</Link>
          </div>
        </section>
      ) : (
        q && (
          <section className="rounded-3xl border-[3px] border-[#1d1a4a] bg-card p-5 shadow-[5px_5px_0_#1d1a4a] dark:border-white/60">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-muted-foreground">{q.topicTitle}{hero.topics.test(q.topicTitle) && <span className="ml-2 rounded-full bg-[#ffd23f] px-2 py-0.5 text-[#1d1a4a]">Your subject: 1.5x</span>}</span>
              <span className={`flex items-center gap-1 font-black ${left <= 5 ? "text-[#c4433a]" : ""}`}><Timer className="size-4" aria-hidden />{left}s</span>
            </div>
            <p className="mt-3 text-xl font-black">{q.q}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {q.options.map((o, i) => {
                const state = picked === null ? "" : i === q.answer ? "bg-[#b9f0c9] text-[#1d1a4a]" : i === picked ? "bg-[#ffb3c7] text-[#1d1a4a]" : "opacity-60";
                return (
                  <button key={i} type="button" disabled={picked !== null} onClick={() => answer(i)} className={`rounded-2xl border-[3px] border-[#1d1a4a] px-4 py-3 text-left font-bold shadow-[3px_3px_0_#1d1a4a] transition hover:-translate-y-0.5 dark:border-white/60 ${state}`}>
                    {o}
                  </button>
                );
              })}
            </div>
            {picked !== null && q.explain && <p className="mt-3 text-sm text-muted-foreground">{q.explain}</p>}
          </section>
        )
      )}
    </div>
  );
}
