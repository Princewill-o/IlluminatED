"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Ghost, X } from "lucide-react";

import { PLAYER, SCARY } from "./art";
import { HudSlot } from "./hud";
import { type QuizQuestion, useBankQuestions } from "./use-bank-questions";
import { earnSeasonXp } from "../season/pass-store";

import { ARCADE } from "@/game/core/arcade";
import { createRng, newSeed } from "@/game/core/rng";
import { BOT_REACH, CANDY_KEY, botPose, frightState, scaryBotsFor, type FrightState, type ScaryBot } from "@/game/core/scary-bots";
import type { WorldMap } from "@/game/core/world";
import { cn } from "@/lib/utils";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

/**
 * Fright Night HUD: candy counter, "scare it off" prompt when a Scary Bot is
 * close, and the bot's question. Answer right and the bot flees for the day.
 */
export function FrightNight({ map, userId, active, onOpen, onReward }: {
  map: WorldMap;
  userId: string;
  /** Event running and you're on a London street. */
  active: boolean;
  /** The question dialog is open (pauses the world). */
  onOpen: (open: boolean) => void;
  onReward: (text: string) => void;
}) {
  const bots = useMemo(() => scaryBotsFor(map), [map]);
  const storeKey = `${CANDY_KEY}:${userId}`;
  useEffect(() => {
    // Local debugging only: lets automated checks find the bots.
    if (process.env.NODE_ENV === "development") (window as unknown as { __bots?: unknown }).__bots = { bots, pose: botPose };
  }, [bots]);
  const [state, setState] = useState<FrightState>(() => {
    try { return frightState(localStorage.getItem(storeKey), today()); } catch { return frightState(null, today()); }
  });
  const [near, setNear] = useState<ScaryBot | null>(null);
  const [fight, setFight] = useState<ScaryBot | null>(null);
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  useEffect(() => {
    SCARY.on = active;
    SCARY.gone = new Set(state.scared);
    return () => { SCARY.on = false; };
  }, [active, state.scared]);

  useEffect(() => {
    try { localStorage.setItem(storeKey, JSON.stringify(state)); } catch { /* kept for this visit */ }
  }, [state, storeKey]);

  // Which bot (if any) is close enough to challenge.
  useEffect(() => {
    if (!active) { setNear(null); return; }
    const timer = window.setInterval(() => {
      const t = Date.now() / 1000;
      let best: ScaryBot | null = null, dist = BOT_REACH;
      for (const b of bots) {
        if (SCARY.gone.has(b.id)) continue;
        const p = botPose(b, t);
        const d = Math.hypot(p.x - PLAYER.x, p.y - PLAYER.y);
        if (d < dist) { best = b; dist = d; }
      }
      setNear(n => (n?.id === best?.id ? n : best));
    }, 250);
    return () => window.clearInterval(timer);
  }, [active, bots]);

  const start = (b: ScaryBot) => { setFight(b); openRef.current(true); };
  useEffect(() => {
    if (!near || fight) return;
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [role=dialog]")) return;
      if (e.key.toLowerCase() === "e") { e.stopImmediatePropagation(); start(near); }
    };
    window.addEventListener("keydown", key, { capture: true });
    return () => window.removeEventListener("keydown", key, { capture: true });
  }, [near, fight]);

  if (!active) return null;
  const left = bots.length - state.scared.length;
  return (
    <>
      <HudSlot area="tl" order={25}>
        <div className="flex items-center gap-2 rounded-2xl border-2 border-[#ff7a1a] bg-[#1a0f2e]/95 px-3 py-2 text-xs font-black whitespace-nowrap text-white shadow-lg">
          <Ghost className="size-4 text-[#ff7a1a]" aria-hidden />
          <span>Fright Night · 2× XP</span>
          <span className="rounded-full bg-[#ff7a1a] px-2 py-0.5 text-[#1a0f2e]">🍬 {state.candy}</span>
          <span className="text-white/70">{left} bots left today</span>
        </div>
      </HudSlot>
      {near && !fight && (
        <HudSlot area="bc" order={4}>
          <button type="button" onClick={() => start(near)} className="jelly flex items-center gap-2 rounded-full border-2 border-[#ff7a1a] bg-[#1a0f2e] px-4 py-2 text-sm font-black text-white shadow-xl">
            <span aria-hidden>🎃</span> Scare off {near.name} <kbd className="rounded bg-white/15 px-1.5 text-xs">E</kbd>
          </button>
        </HudSlot>
      )}
      {fight && (
        <BotQuestion
          bot={fight}
          onClose={() => { setFight(null); openRef.current(false); }}
          onWin={() => {
            const bonus = (state.candy + 1) % 5 === 0 ? 3 : 1;
            setState(s => ({ ...s, scared: [...new Set([...s.scared, fight.id])], candy: s.candy + bonus }));
            earnSeasonXp("eventWin");
            onReward(bonus > 1 ? `${fight.name} fled! +${bonus} candy (combo bonus) and double XP` : `${fight.name} fled! +1 candy and double XP`);
          }}
        />
      )}
    </>
  );
}

function BotQuestion({ bot, onClose, onWin }: { bot: ScaryBot; onClose: () => void; onWin: () => void }) {
  const rng = useMemo(() => createRng(newSeed()), []);
  const bank = useBankQuestions(3, () => ARCADE[Math.floor(rng() * ARCADE.length)].make(rng));
  const [q, setQ] = useState<QuizQuestion>(() => ARCADE[Math.floor(rng() * ARCADE.length)].make(rng));
  const swapped = useRef(false);
  useEffect(() => { if (bank.ready && !swapped.current) { swapped.current = true; setQ(bank.next()); } }, [bank]);
  const [picked, setPicked] = useState<number | null>(null);
  const right = picked === q.answer;
  return (
    <div className="absolute inset-0 z-[100008] grid place-items-center bg-[#0b0614]/75 p-4">
      <section role="dialog" aria-modal="true" aria-label={`${bot.name} challenges you`} className="w-full max-w-md rounded-3xl border-2 border-[#ff7a1a] bg-[#1a0f2e] p-6 text-white shadow-[0_0_60px_rgba(255,122,26,.35)]">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#ff7a1a] text-2xl" aria-hidden>🎃</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black">{bot.name}</h2>
            <p className="text-sm text-white/75">“{bot.taunt}”</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Run away" className="gloss-off grid size-9 place-items-center rounded-full hover:bg-white/10"><X className="size-5" /></button>
        </div>
        <p className="mt-5 text-2xl font-black">{q.prompt}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {q.options.map((o, i) => (
            <button key={i} type="button" disabled={picked !== null} onClick={() => { setPicked(i); if (i === q.answer) onWin(); }}
              className={cn("rounded-2xl border-2 bg-white/10 p-3 font-bold", picked !== null && i === q.answer ? "border-[#7dff8a]" : picked === i ? "border-[#ff3b6b]" : "border-transparent")}>
              {o}
            </button>
          ))}
        </div>
        {picked !== null && (
          <>
            <p className="mt-3 text-sm">{right ? `${bot.name} shrieks and zooms off into the night! 👻` : `Mwahaha! It was ${q.options[q.answer]}. Try another…`}</p>
            <button type="button" onClick={() => { if (right) onClose(); else { setQ(bank.next()); setPicked(null); } }} className="jelly mt-4 rounded-full bg-[#ff7a1a] px-5 py-2 font-black text-[#1a0f2e]">
              {right ? "Collect candy" : "Next question"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
