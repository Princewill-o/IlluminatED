"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Sparkles } from "lucide-react";

import { PASS_EVENT } from "./pass-store";

import { currentEvent, timeLeft } from "@/game/core/live-events";

/** The live event, pinned in the city HUD. */
export function EventBanner({ className = "", onOpen }: { className?: string; onOpen?: () => void }) {
  const [{ event, endsAt }, setNow] = useState(() => currentEvent());
  useEffect(() => {
    const t = setInterval(() => setNow(currentEvent()), 60_000);
    return () => clearInterval(t);
  }, []);
  return (
    <Link
      href={event.href}
      onClick={onOpen ? (e) => { e.preventDefault(); onOpen(); } : undefined}
      className={`flex items-center gap-2 rounded-2xl border-[3px] border-[#1d1a4a] px-3 py-2 text-xs font-black text-white shadow-[3px_3px_0_#1d1a4a] ${className}`}
      style={{ background: `linear-gradient(120deg, ${event.colours[0]}, ${event.colours[0]} 55%, ${event.colours[1]})` }}
    >
      <Sparkles className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="block truncate">Live: {event.name}</span>
        <span className="block font-bold text-white/85">Play {event.game} · {timeLeft(endsAt)}</span>
      </span>
    </Link>
  );
}

/** "+10 Season XP" pops up wherever XP is earned. */
export function SeasonXpToast() {
  const [toasts, setToasts] = useState<{ id: number; gained: number }[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const gained = (e as CustomEvent<{ gained: number }>).detail?.gained ?? 0;
      if (!gained) return;
      const id = ++n;
      setToasts((t) => [...t.slice(-2), { id, gained }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1600);
    };
    window.addEventListener(PASS_EVENT, on);
    return () => window.removeEventListener(PASS_EVENT, on);
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-24 z-[100030] flex flex-col items-end gap-1 md:bottom-6">
      {toasts.map((t) => (
        <span key={t.id} className="rounded-full border-2 border-[#1d1a4a] bg-[#ffd23f] px-3 py-1 text-sm font-black text-[#1d1a4a] shadow-[3px_3px_0_#1d1a4a] [animation:rush-pop_1.6s_ease-out_forwards]">
          +{t.gained} Season XP
        </span>
      ))}
    </div>
  );
}
