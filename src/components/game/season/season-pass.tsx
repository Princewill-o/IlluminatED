"use client";

import { useEffect, useRef } from "react";

import Link from "next/link";

import { Check, Crown, Lock, Sparkles, Zap } from "lucide-react";

import { usePass } from "./pass-store";
import { useIllumship } from "../city/membership";

import { currentEvent, timeLeft } from "@/game/core/live-events";
import { type Reward, SEASON, TRACK, XP_FOR, canClaim, tierFor, tierProgress } from "@/game/core/season";

function RewardChip({ r }: { r: Reward }) {
  if (r.kind === "item")
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/characters/chibi/${r.id}.webp`} alt="" className="mx-auto h-20 w-auto" />;
  if (r.kind === "frame") return <span className="mx-auto block size-14 rounded-2xl border-[5px] bg-white/60" style={{ borderColor: r.colour }} aria-hidden />;
  const Icon = r.kind === "boost" ? Zap : r.kind === "emote" ? Sparkles : Crown;
  return <Icon className="mx-auto size-10 text-[#5b56c8] dark:text-[#b3afff]" aria-hidden />;
}

export function SeasonPass({ userId }: { userId: string }) {
  const premium = useIllumship();
  const { pass, claim, setTitle } = usePass(userId);
  const tier = tierFor(pass.xp);
  const { event, endsAt } = currentEvent();
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    strip.current?.querySelector(`[data-tier="${Math.max(1, tier)}"]`)?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [tier]);
  const ready = TRACK.reduce((n, _, i) => n + (canClaim(pass, i + 1, "free", premium) ? 1 : 0) + (canClaim(pass, i + 1, "premium", premium) ? 1 : 0), 0);
  const daysLeft = Math.max(0, Math.ceil((SEASON.endsAt - Date.now()) / 86_400_000));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border-[3px] border-[#1d1a4a] bg-[linear-gradient(135deg,#2b5fd9,#6a4bd6_55%,#ff6fa9)] p-6 text-white shadow-[6px_6px_0_#1d1a4a] sm:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/heroes/quotient.webp" alt="" className="pointer-events-none absolute -right-2 -bottom-4 hidden h-56 sm:block" />
        <p className="text-sm font-bold text-white/80">{daysLeft} days left in the season</p>
        <h1 className="mt-1 text-3xl font-black sm:text-5xl">{SEASON.name}</h1>
        <div className="mt-5 flex max-w-xl items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border-[3px] border-[#1d1a4a] bg-[#ffd23f] text-2xl font-black text-[#1d1a4a]">{tier}</span>
          <div className="flex-1">
            <div className="h-5 overflow-hidden rounded-full border-2 border-[#1d1a4a] bg-white/30">
              <div className="h-full rounded-full bg-[#ffd23f] transition-[width] duration-700" style={{ width: `${tierProgress(pass.xp) * 100}%` }} />
            </div>
            <p className="mt-1 text-sm text-white/85">
              {tier >= SEASON.tiers ? "Season complete. Legend." : `${Math.round((1 - tierProgress(pass.xp)) * SEASON.xpPerTier)} XP to tier ${tier + 1}`} · {pass.xp} XP total
            </p>
          </div>
        </div>
        <p className="mt-4 max-w-xl text-sm text-white/85">
          Earn XP by learning: {XP_FOR.correct} per correct answer, {XP_FOR.homework} per homework handed in, {XP_FOR.eventWin} for winning the event game.
          {event.xpBoost > 1 && ` ${event.name} is on: ${event.xpBoost}x XP (${timeLeft(endsAt)}).`}
          {pass.boostUntil > Date.now() && " Double XP active."}
        </p>
        {ready > 0 && <p className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-sm font-black text-[#1d1a4a]">{ready} reward{ready === 1 ? "" : "s"} ready to claim</p>}
      </section>

      {!premium && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-[3px] border-[#1d1a4a] bg-[#ffd23f] p-5 text-[#1d1a4a] shadow-[4px_4px_0_#1d1a4a]">
          <div>
            <p className="text-lg font-black">Unlock the premium track with Plus</p>
            <p className="text-sm">All six Lumen League hero suits, double-XP boosts, frames and titles. Core revision stays free.</p>
          </div>
          <Link href="/pricing" className="jelly rounded-xl border-[3px] border-[#1d1a4a] bg-[#5b56c8] px-5 py-3 font-black text-white shadow-[3px_3px_0_#1d1a4a]">See Plus</Link>
        </section>
      )}

      <section aria-label="Season tiers">
        <div ref={strip} className="flex gap-3 overflow-x-auto pb-4 [scrollbar-width:thin]">
          {TRACK.map(([free, prem], i) => {
            const t = i + 1;
            const reached = tier >= t;
            return (
              <div key={t} data-tier={t} className="w-36 shrink-0">
                <p className={`mb-2 text-center text-sm font-black ${reached ? "text-[#5b56c8] dark:text-[#b3afff]" : "text-muted-foreground"}`}>Tier {t}</p>
                {([["free", free], ["premium", prem]] as const).map(([track, r]) => {
                  const claimed = pass[track].includes(t);
                  const ok = canClaim(pass, t, track, premium);
                  const locked = track === "premium" && !premium;
                  return (
                    <button
                      key={track}
                      type="button"
                      disabled={!ok}
                      onClick={() => claim(t, track, premium)}
                      className={`relative mb-2 flex h-40 w-full flex-col justify-between rounded-2xl border-[3px] p-3 text-center transition ${track === "premium" ? "border-[#6a4bd6] bg-[#efe9ff] dark:bg-[#2a2370]" : "border-[#1d1a4a] bg-card dark:border-white/60"} ${ok ? "animate-pulse shadow-[0_0_0_4px_#ffd23f]" : ""} ${!reached ? "opacity-60" : ""}`}
                    >
                      <span className="text-[10px] font-black tracking-wider uppercase">{track === "premium" ? "Plus" : "Free"}</span>
                      <RewardChip r={r} />
                      <span className="text-xs leading-tight font-bold">{r.label}</span>
                      {claimed && <Check className="absolute top-2 right-2 size-5 rounded-full bg-[#2e9d55] p-0.5 text-white" aria-label="Claimed" />}
                      {locked && <Lock className="absolute top-2 right-2 size-4" aria-label="Plus only" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      {pass.titles.length > 0 && (
        <section className="rounded-3xl border bg-card p-5">
          <h2 className="font-black">Your titles</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {pass.titles.map((t) => (
              <button key={t} type="button" onClick={() => setTitle(pass.title === t ? null : t)} className={`jelly rounded-full border-2 px-3 py-1 text-sm font-bold ${pass.title === t ? "border-[#5b56c8] bg-[#5b56c8] text-white" : "border-border"}`}>
                {t}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
