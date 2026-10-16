"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { Coffee, Lightbulb, SkipForward } from "lucide-react";

import { AvatarFigure, type Mood } from "./avatar";
import { Building } from "./building";
import { CompanyLogo } from "./company-logo";
import { play, setSoundOn, soundOn } from "./sound";

import {
  type RunResult,
  createChallenge,
  finishShift,
} from "@/app/games/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { companyById } from "@/game/core/companies";
import { type Avatar, cosmeticById, look } from "@/game/core/cosmetics";
import { type DeckSources, buildDeck } from "@/game/core/deck";
import { rewardsFor } from "@/game/core/progression";
import {
  feedbackLine,
  promotionLine,
  reviewLine,
  streakBanner,
} from "@/game/core/quips";
import { createRng, newSeed } from "@/game/core/rng";
import {
  CEO_RANK,
  MAX_STRIKES,
  POWER_UPS,
  type PowerUp,
  RANKS,
  type ShiftState,
  accuracy,
  answer,
  currentQuestion,
  next,
  startShift,
  timeLimitFor,
  applyPowerUp,
} from "@/game/core/shift";
import { cn } from "@/lib/utils";

const POWER_ICON = { coffee: Coffee, blame: SkipForward, tiggy: Lightbulb } as const;

export interface ChallengeInfo {
  code: string;
  seed: number;
  score: number;
  rank: number;
  username: string | null;
}

interface Props {
  companyId: string;
  sources: DeckSources;
  avatar: Avatar;
  dailyBonusReady: boolean;
  canSave: boolean;
  previousBest: number;
  challenge: ChallengeInfo | null;
}

type Screen = "intro" | "play" | "results";

const fmt = (n: number) => n.toLocaleString("en-GB");

export function PromotionPanic(props: Props) {
  const company = companyById(props.companyId)!;
  const [screen, setScreen] = useState<Screen>("intro");
  const [seed, setSeed] = useState(() => props.challenge?.seed ?? newSeed());
  const [state, setState] = useState<ShiftState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [line, setLine] = useState<string>("");
  const [promo, setPromo] = useState<number | null>(null);
  const [sound, setSound] = useState(true);
  const [missed, setMissed] = useState<
    { prompt: string; answer: string; explain: string }[]
  >([]);
  const [save, setSave] = useState<{
    status: "idle" | "saving" | "saved" | "error";
    result?: RunResult;
    error?: string;
  }>({ status: "idle" });
  const [dailyBonus, setDailyBonus] = useState(props.dailyBonusReady);
  const quipRng = useRef(createRng(seed ^ 0x5bd1e995));
  const questionStart = useRef(0);
  const lastTick = useRef(-1);
  const stateRef = useRef<ShiftState | null>(null);

  useEffect(() => setSound(soundOn()), []);

  const begin = useCallback(
    (nextSeed = seed) => {
      const deck = buildDeck(company, props.sources, nextSeed);
      quipRng.current = createRng(nextSeed ^ 0x5bd1e995);
      setSeed(nextSeed);
      const fresh = startShift(deck);
      stateRef.current = fresh;
      setState(fresh);
      setMissed([]);
      setSave({ status: "idle" });
      setLine(
        `${company.boss.name}: "Welcome aboard, intern. Twelve tasks. Three strikes and you're out. Impress me."`,
      );
      setStartedAt(Date.now());
      questionStart.current = performance.now();
      lastTick.current = -1;
      setElapsed(0);
      setScreen("play");
      play("click", sound);
    },
    [company, props.sources, seed, sound],
  );

  // The question clock.
  useEffect(() => {
    if (screen !== "play" || state?.phase !== "question") return;
    const id = window.setInterval(() => {
      const used = (performance.now() - questionStart.current) / 1000;
      setElapsed(used);
      const left = Math.ceil(timeLimitFor(state) - used);
      if (left <= 3 && left > 0 && left !== lastTick.current) {
        lastTick.current = left;
        play("tick", sound);
      }
      if (used >= timeLimitFor(state)) {
        window.clearInterval(id);
        resolveRef.current(null);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [screen, state, sound]);

  const commit = useCallback((s: ShiftState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const resolve = useCallback(
    (choice: number | null) => {
      const s = stateRef.current;
      if (!s || s.phase !== "question") return;
      const used = (performance.now() - questionStart.current) / 1000;
      const limit = timeLimitFor(s);
      const after = answer(s, choice, Math.max(0, (limit - used) / limit));
      const q = currentQuestion(s);
      const r = after.last!;
      commit(after);
      setLine(feedbackLine(quipRng.current, company, r));
      if (!r.correct) {
        setMissed((m) => [
          ...m,
          { prompt: q.prompt, answer: q.options[q.answer], explain: q.explain },
        ]);
        play(after.fired ? "fired" : "wrong", sound);
      } else if (r.promotedTo !== null) {
        setPromo(r.promotedTo);
        play("promote", sound);
      } else {
        play("right", sound);
      }
    },
    [commit, company, sound],
  );
  const resolveRef = useRef(resolve);
  resolveRef.current = resolve;

  const advance = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.phase !== "feedback") return;
    setPromo(null);
    const n = next(s);
    commit(n);
    if (n.phase === "over") setScreen("results");
    else {
      questionStart.current = performance.now();
      lastTick.current = -1;
      setElapsed(0);
    }
  }, [commit]);

  const power = useCallback(
    (p: PowerUp) => {
      const s = stateRef.current;
      if (!s) return;
      const after = applyPowerUp(s, p, seed);
      if (after === s) return;
      commit(after);
      if (p === "blame")
        setLine(feedbackLine(quipRng.current, company, after.last!));
      if (p === "tiggy")
        setLine(
          'Tiggy: "Psst. I\'ve hidden two that are definitely wrong."',
        );
      if (p === "coffee")
        setLine(
          "Coffee break! +10 seconds. You feel unstoppable (and slightly jittery).",
        );
      play("click", sound);
    },
    [commit, company, seed, sound],
  );

  // Correct answers move on by themselves to keep the pace up. Wrong ones wait, so the explanation gets read.
  useEffect(() => {
    if (state?.phase !== "feedback" || !state.last) return;
    if (state.last.correct || state.last.skipped) {
      const id = window.setTimeout(
        advance,
        state.last.promotedTo !== null ? 2200 : 1400,
      );
      return () => window.clearTimeout(id);
    }
  }, [state?.phase, state?.last, advance]);

  // Keyboard: 1–4 to answer, Enter or Space to continue.
  useEffect(() => {
    if (screen === "results") return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(e.target.tagName)
      )
        return;
      if (screen === "intro" && e.key === "Enter") {
        e.preventDefault();
        begin();
        return;
      }
      if (!state) return;
      if (state.phase === "question") {
        const n = Number(e.key);
        const q = currentQuestion(state);
        if (n >= 1 && n <= q.options.length && !state.hidden.includes(n - 1)) {
          e.preventDefault();
          resolve(n - 1);
        }
      } else if (
        state.phase === "feedback" &&
        (e.key === "Enter" || e.key === " ")
      ) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, state, begin, resolve, advance]);

  // Save the finished shift once.
  useEffect(() => {
    if (screen !== "results" || !state || save.status !== "idle") return;
    if (!props.canSave) {
      setSave({
        status: "error",
        error: "Progress isn't saved in preview mode.",
      });
      return;
    }
    if (state.answered === 0) {
      setSave({
        status: "error",
        error: "You skipped everything, so there's nothing to save. Sneaky.",
      });
      return;
    }
    setSave({ status: "saving" });
    finishShift({
      company: company.id,
      seed,
      score: state.score,
      correct: state.correct,
      total: state.answered,
      bestStreak: state.bestStreak,
      durationMs: Math.max(1, Date.now() - startedAt),
      fired: state.fired,
      challenge: props.challenge?.seed === seed ? props.challenge.code : null,
    }).then((r) => {
      if (r.ok) {
        setSave({ status: "saved", result: r.result });
        notifyPlayerChanged();
        setDailyBonus(false);
      } else setSave({ status: "error", error: r.error });
    });
  }, [
    screen,
    state,
    save.status,
    props.canSave,
    props.challenge,
    company.id,
    seed,
    startedAt,
  ]);

  if (screen === "intro" || !state) {
    return (
      <Intro
        company={company}
        avatar={props.avatar}
        challenge={props.challenge}
        dailyBonus={dailyBonus}
        previousBest={props.previousBest}
        sound={sound}
        onSound={(on) => {
          setSound(on);
          setSoundOn(on);
        }}
        onStart={() => begin()}
      />
    );
  }

  if (screen === "results") {
    return (
      <Results
        company={company}
        avatar={props.avatar}
        state={state}
        missed={missed}
        save={save}
        dailyBonus={dailyBonus}
        challenge={props.challenge?.seed === seed ? props.challenge : null}
        previousBest={props.previousBest}
        onReplay={() => begin(newSeed())}
        onRetryChallenge={
          props.challenge ? () => begin(props.challenge!.seed) : undefined
        }
        durationMs={Date.now() - startedAt}
      />
    );
  }

  const q = currentQuestion(state);
  const limit = timeLimitFor(state);
  const left = Math.max(0, limit - elapsed);
  const r = state.last;
  const feedback = state.phase === "feedback" && r;
  const mood: Mood = feedback
    ? r.correct
      ? state.streak >= 3
        ? "cool"
        : "wow"
      : "sad"
    : "happy";
  const banner = streakBanner(state.streak);
  const bossMood: Mood = feedback
    ? r.skipped
      ? "wow"
      : r.correct
        ? r.promotedTo !== null
          ? "cool"
          : "happy"
        : "cross"
    : "happy";
  const nextRank = RANKS[state.rank + 1];

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 pb-16">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <CompanyLogo id={company.id} size={40} className="shrink-0" />
          <div>
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              {company.name}
            </p>
            <p className="text-sm font-bold">
              Task {state.index + 1} of {state.questions.length}
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5"
          aria-label={`${state.strikes} of ${MAX_STRIKES} strikes`}
        >
          {Array.from({ length: MAX_STRIKES }, (_, i) => (
            <span
              key={i}
              className={cn(
                "grid size-8 place-items-center rounded-lg border-2 text-sm font-black",
                i < state.strikes
                  ? "border-[#ff7a6b] bg-[#ff7a6b] text-[#0d1726]"
                  : "border-border text-foreground/30",
              )}
            >
              ✕
            </span>
          ))}
        </div>
        <div className="text-right">
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            Score
          </p>
          <p className="arcade-display text-2xl text-ink-lime tabular-nums">
            {fmt(state.score)}
          </p>
        </div>
      </div>

      {/* Promotion ladder */}
      <div className="mt-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">You are: </span>
            <strong className="text-ink-sun">
              {RANKS[state.rank].title}
            </strong>
          </p>
          {nextRank && (
            <p className="text-xs text-muted-foreground">
              Next: {nextRank.title} at {fmt(nextRank.min)}
            </p>
          )}
        </div>
        <div className="mt-2 grid grid-cols-8 gap-1" aria-hidden>
          {RANKS.map((rank, i) => {
            const nextMin = RANKS[i + 1]?.min ?? rank.min + 1300;
            const fill = Math.max(
              0,
              Math.min(1, (state.score - rank.min) / (nextMin - rank.min)),
            );
            return (
              <div
                key={rank.title}
                className="h-3 overflow-hidden rounded-full bg-foreground/[0.08]"
              >
                <div
                  className="h-full bg-[#ffd166] transition-[width] duration-500"
                  style={{ width: `${fill * 100}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage */}
      <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
        <div className="flex items-end gap-3 md:flex-col md:items-center">
          <div
            className={cn(
              feedback && !r.correct && !r.skipped && "arcade-shake",
              feedback && r.correct && "arcade-pop",
            )}
          >
            <AvatarFigure
              avatar={props.avatar}
              mood={mood}
              size={150}
              showPet={false}
            />
          </div>
          <div
            className="relative flex flex-1 items-start gap-2 self-stretch rounded-2xl rounded-bl-none border border-border bg-secondary p-3 text-sm leading-5 md:w-full md:flex-none md:self-auto md:rounded-tl-none md:rounded-bl-2xl"
            aria-live="polite"
          >
            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: company.accent }}>
              <AvatarFigure
                avatar={look(company.boss.look)}
                mood={bossMood}
                logo={company.id}
                headOnly
                size={48}
                title={company.boss.name}
                className="translate-y-[6%]"
              />
            </span>
            <span>
              <span className="block text-xs font-bold text-muted-foreground">{company.boss.name}</span>
              {line}
            </span>
          </div>
        </div>

        <div>
          {banner && state.phase === "question" && (
            <p className="arcade-pop mb-2 inline-block rounded-full bg-[#ff7a6b] px-3 py-1 text-xs font-black tracking-wider text-[#0d1726] uppercase">
              {state.streak} in a row · {banner}
            </p>
          )}
          {/* Timer */}
          <div className="flex items-center gap-3">
            <div
              className="h-4 flex-1 overflow-hidden rounded-full bg-foreground/[0.08]"
              role="progressbar"
              aria-label="Time left"
              aria-valuemin={0}
              aria-valuemax={Math.round(limit)}
              aria-valuenow={Math.round(left)}
            >
              <div
                className={cn(
                  "h-full",
                  left <= 5 ? "bg-[#ff7a6b]" : "bg-[#8fb4ff]",
                )}
                style={{ width: `${feedback ? 0 : (left / limit) * 100}%` }}
              />
            </div>
            <span
              className={cn(
                "w-10 text-right font-black tabular-nums",
                left <= 5 && "text-ink-coral",
              )}
            >
              {feedback ? "–" : Math.ceil(left)}s
            </span>
          </div>

          <div className="mt-3 rounded-3xl border border-border bg-card p-5">
            <p className="text-xs font-bold tracking-widest text-ink-lilac uppercase">
              {q.topic}
            </p>
            <h2 className="mt-2 text-xl leading-snug font-bold md:text-2xl">
              {q.prompt}
            </h2>
            <div
              className={cn(
                "mt-5 grid gap-3",
                q.options.length > 2 && "sm:grid-cols-2",
              )}
            >
              {q.options.map((opt, i) => {
                const hidden = state.hidden.includes(i);
                const isAnswer = i === q.answer;
                const chosen = feedback && r.chosen === i;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={state.phase !== "question" || hidden}
                    onClick={() => resolve(i)}
                    className={cn(
                      "arcade-btn flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-bold",
                      !feedback &&
                        !hidden &&
                        "border-transparent bg-brand text-white hover:bg-[#8d63ff]",
                      hidden &&
                        "border-dashed border-border bg-transparent text-foreground/30 line-through shadow-none",
                      feedback &&
                        isAnswer &&
                        "border-[#5fd3a5] bg-[#5fd3a5] text-[#0d1726]",
                      feedback &&
                        chosen &&
                        !isAnswer &&
                        "border-[#ff7a6b] bg-[#ff7a6b] text-[#0d1726]",
                      feedback &&
                        !isAnswer &&
                        !chosen &&
                        "border-border bg-secondary text-foreground/50 shadow-none",
                    )}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-black/25 text-sm">
                      {feedback && isAnswer
                        ? "✓"
                        : feedback && chosen
                          ? "✕"
                          : i + 1}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {feedback && (
              <div
                className="arcade-pop mt-5 rounded-2xl border border-border bg-secondary p-4"
                role="status"
              >
                <p
                  className={cn(
                    "text-lg font-black",
                    r.correct
                      ? "text-ink-mint"
                      : r.skipped
                        ? "text-ink-sun"
                        : "text-ink-coral",
                  )}
                >
                  {r.correct
                    ? `✓ Correct! +${fmt(r.points)}${state.streak >= 3 ? ` (streak ×${state.streak >= 9 ? 4 : state.streak >= 6 ? 3 : 2})` : ""}`
                    : r.skipped
                      ? "Skipped. No strike."
                      : r.timedOut
                        ? `Out of time. Strike ${state.strikes}!`
                        : `✕ Not quite. Strike ${state.strikes}!`}
                </p>
                {!r.correct && !r.skipped && (
                  <p className="mt-1 text-sm">
                    The answer was{" "}
                    <strong className="text-ink-mint">
                      {q.options[q.answer]}
                    </strong>
                    .
                  </p>
                )}
                {!r.skipped && (
                  <p className="mt-2 text-sm leading-6 text-foreground/80">
                    {q.explain}
                  </p>
                )}
                <button
                  type="button"
                  onClick={advance}
                  className="arcade-btn mt-4 rounded-full bg-[#f2d9a6] px-6 py-2.5 font-black text-[#0d1726]"
                >
                  {state.fired
                    ? "Uh oh… see your review"
                    : state.index + 1 >= state.questions.length
                      ? "Finish shift"
                      : "Next task"}{" "}
                  ↵
                </button>
              </div>
            )}
          </div>

          {/* Power-ups */}
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Power-ups">
            {(Object.keys(POWER_UPS) as PowerUp[]).map((p) => (
              <button
                key={p}
                type="button"
                disabled={!state.powerUps[p] || state.phase !== "question"}
                onClick={() => power(p)}
                title={POWER_UPS[p].help}
                className="arcade-btn flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm font-bold disabled:opacity-35 disabled:shadow-none"
              >
                {(() => { const I = POWER_ICON[p]; return <I className="size-4" aria-hidden />; })()}
                {POWER_UPS[p].name}
                <span className="sr-only">
                  : {POWER_UPS[p].help}
                  {state.powerUps[p] ? "" : " (used)"}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: press 1–4 to answer and Enter to continue.
          </p>
        </div>
      </div>

      {promo !== null && (
        <PromotionSplash rank={promo} onDone={() => setPromo(null)} />
      )}
    </div>
  );
}

function PromotionSplash({
  rank,
  onDone,
}: {
  rank: number;
  onDone: () => void;
}) {
  const p = promotionLine(rank);
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 9) * 0.08,
        color: ["#f2d9a6", "#ffd166", "#8fb4ff", "#ff7a6b", "#6bc6ff"][i % 5],
      })),
    [],
  );
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6"
      onClick={onDone}
      role="alert"
    >
      {pieces.map((c, i) => (
        <span
          key={i}
          className="arcade-confetti pointer-events-none absolute top-0 size-3 rounded-sm"
          style={{
            left: `${c.left}%`,
            background: c.color,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
      <div className="arcade-pop max-w-md rounded-3xl border-4 border-[#ffd166] bg-card p-8 text-center">
        <p className="text-sm font-black tracking-[0.3em] text-ink-sun uppercase">
          Promoted!
        </p>
        <p className="arcade-display mt-3 text-4xl text-foreground">{p.title}</p>
        <p className="mt-4 text-foreground/80">New perk: {p.perk}</p>
        {rank === CEO_RANK && (
          <p className="mt-3 font-bold text-ink-lime">
            You made CEO! Something special waits in your Locker…
          </p>
        )}
      </div>
    </div>
  );
}

function Intro({
  company,
  avatar,
  challenge,
  dailyBonus,
  previousBest,
  sound,
  onSound,
  onStart,
}: {
  company: NonNullable<ReturnType<typeof companyById>>;
  avatar: Avatar;
  challenge: ChallengeInfo | null;
  dailyBonus: boolean;
  previousBest: number;
  sound: boolean;
  onSound: (on: boolean) => void;
  onStart: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-16">
      <div className="grid items-center gap-6 rounded-3xl border border-border bg-card p-6 md:grid-cols-[1fr_auto] md:p-10">
        <div>
          <p className="text-xs font-black tracking-[0.25em] text-ink-lilac uppercase">
            Promotion Panic · {company.sector}
          </p>
          <h1 className="arcade-display mt-3 flex items-center gap-4 text-4xl md:text-6xl">
            <CompanyLogo id={company.id} size={56} className="shrink-0" />
            {company.name}
          </h1>
          <p className="mt-3 text-lg text-foreground/80 italic">
            “{company.tagline}”
          </p>
          <div className="mt-6 rounded-2xl border border-border bg-secondary p-4">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              New email · from {company.boss.name}, {company.boss.title}
            </p>
            <p className="mt-2 leading-7">
              Welcome, intern. Today you&apos;ll handle{" "}
              <strong>12 tasks</strong> on <strong>{company.revises}</strong>.
              Answer fast to climb from Intern to{" "}
              <strong className="text-ink-sun">CEO</strong>. Three strikes and
              security walks you out. No pressure. (Lots of pressure.)
            </p>
          </div>
          {challenge && (
            <p className="mt-4 rounded-2xl border-2 border-[#ff7a6b] bg-[#ff7a6b]/10 p-4 font-bold">
              Challenge:{" "}
              {challenge.username ? `@${challenge.username}` : "A player"}{" "}
              reached {RANKS[challenge.rank].title} with{" "}
              <span className="text-ink-lime">{fmt(challenge.score)}</span>.
              Same tasks, same order. Beat it.
            </p>
          )}
          <ul className="mt-5 grid gap-2 text-sm text-foreground/80 sm:grid-cols-3">
            {(Object.keys(POWER_UPS) as PowerUp[]).map((p) => (
              <li key={p} className="rounded-xl bg-foreground/[0.05] px-3 py-2">
                {(() => { const I = POWER_ICON[p]; return <I className="mr-1 inline size-4 align-[-3px]" aria-hidden />; })()}
                <strong>{POWER_UPS[p].name}</strong>
                <br />
                <span className="text-xs text-muted-foreground">
                  {POWER_UPS[p].help}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onStart}
              className="arcade-btn rounded-full bg-[#f2d9a6] px-8 py-4 text-lg font-black text-[#0d1726]"
            >
              Clock in ↵
            </button>
            <button
              type="button"
              onClick={() => onSound(!sound)}
              aria-pressed={sound}
              className="rounded-full border border-border px-4 py-2 text-sm font-bold"
            >
              {sound ? "Sound on" : "Sound off"}
            </button>
            {dailyBonus && (
              <span className="rounded-full bg-[#ffd166] px-3 py-1 text-xs font-black text-[#0d1726]">
                Daily Grind: double Clout on your first shift today
              </span>
            )}
          </div>
          {previousBest > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Your best here: {fmt(previousBest)}
            </p>
          )}
        </div>
        <div className="relative flex items-end justify-center gap-1">
          <Building
            shape={company.building}
            accent={company.accent}
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[320px] opacity-25"
          />
          <figure className="relative text-center">
            <AvatarFigure avatar={look(company.boss.look)} mood="cool" size={190} showPet={false} logo={company.id} title={`${company.boss.name}, your boss`} />
            <figcaption className="mt-1 text-xs font-bold text-muted-foreground">Your boss</figcaption>
          </figure>
          <figure className="relative text-center">
            <AvatarFigure avatar={avatar} size={190} clip="wave" />
            <figcaption className="mt-1 text-xs font-bold text-muted-foreground">You</figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}

function Results({
  company,
  avatar,
  state,
  missed,
  save,
  dailyBonus,
  challenge,
  previousBest,
  onReplay,
  onRetryChallenge,
  durationMs,
}: {
  company: NonNullable<ReturnType<typeof companyById>>;
  avatar: Avatar;
  state: ShiftState;
  missed: { prompt: string; answer: string; explain: string }[];
  save: { status: string; result?: RunResult; error?: string };
  dailyBonus: boolean;
  challenge: ChallengeInfo | null;
  previousBest: number;
  onReplay: () => void;
  onRetryChallenge?: () => void;
  durationMs: number;
}) {
  const [share, setShare] = useState<{
    status: "idle" | "busy" | "done" | "error";
    text?: string;
  }>({ status: "idle" });
  const acc = accuracy(state);
  const estimate = rewardsFor(
    { correct: state.correct, rank: state.rank },
    dailyBonus,
  );
  const res = save.result;
  const title = RANKS[state.rank].title;
  const seconds = Math.round(durationMs / 1000);

  const challengeFriend = async () => {
    if (!res) return;
    setShare({ status: "busy" });
    const r = await createChallenge(res.runId);
    if (!r.ok) return setShare({ status: "error", text: r.error });
    const url = `${window.location.origin}/games/challenge/${r.code}`;
    const text = `I made ${title} at ${company.name} in Promotion Panic with ${fmt(state.score)} points. Bet you can't beat it`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Promotion Panic challenge",
          text,
          url,
        });
        return setShare({ status: "done", text: "Challenge sent!" });
      }
    } catch {
      // Share sheet closed: fall back to copying.
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShare({ status: "done", text: `Link copied: ${url}` });
    } catch {
      setShare({ status: "done", text: url });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-16">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-10">
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
          <AvatarFigure
            avatar={avatar}
            mood={state.fired ? "sad" : state.rank >= 4 ? "cool" : "happy"}
            clip={state.fired ? "idle" : "wave"}
            size={190}
            className="mx-auto"
          />
          <div>
            <p className="text-xs font-black tracking-[0.25em] text-ink-lilac uppercase">
              Performance review · {company.name}
            </p>
            <h1 className="arcade-display mt-3 text-4xl md:text-5xl">
              {state.fired
                ? "You're FIRED!"
                : state.rank >= CEO_RANK
                  ? `${title}!`
                  : `Shift done: ${title}`}
            </h1>
            <p className="mt-4 leading-7 text-foreground/80">
              {reviewLine(company, {
                fired: state.fired,
                rank: state.rank,
                accuracy: acc,
              })}
            </p>
            {challenge && (
              <p
                className={cn(
                  "mt-4 rounded-2xl p-3 font-black",
                  state.score > challenge.score
                    ? "bg-[#5fd3a5] text-[#0d1726]"
                    : "bg-[#ff7a6b] text-[#0d1726]",
                )}
              >
                {state.score > challenge.score
                  ? `You beat ${challenge.username ? `@${challenge.username}` : "the challenge"} by ${fmt(state.score - challenge.score)}!`
                  : state.score === challenge.score
                    ? "A perfect tie. Rematch?"
                    : `So close. ${challenge.username ? `@${challenge.username} wins` : "They win"} by ${fmt(challenge.score - state.score)}.`}
              </p>
            )}
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Score", fmt(state.score)],
            ["Accuracy", `${acc}%`],
            ["Best streak", String(state.bestStreak)],
            [
              "Time",
              `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
            ],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-foreground/[0.05] p-4">
              <dt className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                {k}
              </dt>
              <dd className="arcade-display mt-2 text-2xl">{v}</dd>
            </div>
          ))}
        </dl>

        <div
          className="mt-4 rounded-2xl border border-border bg-secondary p-4"
          aria-live="polite"
        >
          {save.status === "saving" && <p>Saving your shift…</p>}
          {save.status === "error" && (
            <p className="text-ink-sun">
              {save.error} You&apos;d have earned about +{estimate.xp} XP and +
              {estimate.clout} Clout.
            </p>
          )}
          {res && (
            <div className="flex flex-wrap items-center gap-2 font-bold">
              <span className="rounded-full bg-[#8fb4ff] px-3 py-1 text-[#0d1726]">
                +{res.xp} XP
              </span>
              <span className="rounded-full bg-[#ffd166] px-3 py-1 text-[#0d1726]">
                +{res.clout} Clout
              </span>
              {res.dailyBonus && (
                <span className="rounded-full bg-[#f2d9a6] px-3 py-1 text-[#0d1726]">
                  Daily Grind ×2
                </span>
              )}
              <span className="rounded-full bg-foreground/[0.08] px-3 py-1">
                Level {res.level}
              </span>
              <span className="rounded-full bg-foreground/[0.08] px-3 py-1">
                {res.streak}-day streak
              </span>
              {res.newBest && previousBest > 0 && (
                <span className="rounded-full bg-[#ff7a6b] px-3 py-1 text-[#0d1726]">
                  New best here!
                </span>
              )}
              {res.capped && (
                <span className="text-sm font-normal text-muted-foreground">
                  You&apos;ve hit today&apos;s reward limit. Scores still count!
                </span>
              )}
            </div>
          )}
          {res && res.unlocked.length > 0 && (
            <p className="arcade-pop mt-3 rounded-xl bg-[#f2d9a6] p-3 font-black text-[#0d1726]">
              Unlocked:{" "}
              {res.unlocked
                .map((id) => cosmeticById(id)?.name ?? id)
                .join(", ")}
              !{" "}
              <Link href="/games/locker" className="underline">
                Put it on in your Locker
              </Link>
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onReplay}
            className="arcade-btn rounded-full bg-[#f2d9a6] px-6 py-3 font-black text-[#0d1726]"
          >
            Play again
          </button>
          {onRetryChallenge && (
            <button
              type="button"
              onClick={onRetryChallenge}
              className="arcade-btn rounded-full bg-[#ff7a6b] px-6 py-3 font-black text-[#0d1726]"
            >
              Retry the challenge
            </button>
          )}
          <button
            type="button"
            onClick={challengeFriend}
            disabled={!res || share.status === "busy"}
            className="arcade-btn rounded-full bg-brand px-6 py-3 font-black text-white disabled:opacity-40"
          >
            Challenge a friend
          </button>
          <Link
            href="/games"
            className="arcade-btn rounded-full border border-border bg-secondary px-6 py-3 font-black"
          >
            Back to the city
          </Link>
        </div>
        {share.text && (
          <p
            className={cn(
              "mt-3 text-sm break-all",
              share.status === "error" ? "text-ink-coral" : "text-ink-mint",
            )}
          >
            {share.text}
          </p>
        )}
      </div>

      {missed.length > 0 && (
        <section
          className="mt-6 rounded-3xl border border-border bg-card p-6"
          aria-labelledby="notes"
        >
          <h2 id="notes" className="text-xl font-black">
            Your revision notes from this shift
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The ones that got away. Read these, then go again.
          </p>
          <ul className="mt-4 space-y-3">
            {missed.map((m, i) => (
              <li key={i} className="rounded-2xl bg-foreground/[0.05] p-4">
                <p className="font-bold">{m.prompt}</p>
                <p className="mt-1 text-sm">
                  ✓ <strong className="text-ink-mint">{m.answer}</strong>
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground/80">
                  {m.explain}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
