"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import Link from "next/link";

import { LogOut, MapPin, Play } from "lucide-react";

/** Where a player left off, so "Continue playing" can drop them back there. */
export type ResumeSpot = { map: string; name: string; x: number; y: number; at: number };

const RESUME_KEY = "illuminated:resume";
const keyFor = (userId: string) => `${RESUME_KEY}:${userId}`;

export function saveResume(userId: string, spot: Omit<ResumeSpot, "at">) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ ...spot, x: Math.round(spot.x), y: Math.round(spot.y), at: Date.now() }));
  } catch { /* Resume is a convenience; play on without it. */ }
}

export function loadResume(userId: string): ResumeSpot | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const s = JSON.parse(raw) as ResumeSpot;
    return typeof s.map === "string" && Number.isFinite(s.x) && Number.isFinite(s.y) ? s : null;
  } catch { return null; }
}

export const resumeHref = (s: ResumeSpot) => `/games/world?map=${encodeURIComponent(s.map)}&x=${s.x}&y=${s.y}`;

/** Pause menu: carry on, or leave the game (your spot is saved for next time). */
export function GameMenu({ place, onContinue, onLeave }: { place: string; onContinue: () => void; onLeave: () => void }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  return (
    <div className="absolute inset-0 z-[100012] grid place-items-center bg-[#07101f]/60 p-4 backdrop-blur-sm" onClick={onContinue}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-menu-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[2rem] border border-white/15 bg-[#13203a]/90 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,.5)] backdrop-blur-xl"
      >
        <p className="text-xs font-black tracking-[0.2em] text-[#f2d9a6] uppercase">Paused</p>
        <h2 id="game-menu-title" className="mt-1 text-3xl font-black">Take a breather</h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-white/75"><MapPin className="size-4 shrink-0" aria-hidden />{place}</p>
        <div className="mt-6 grid gap-3">
          <button ref={first} type="button" onClick={onContinue} className="jelly flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f2d9a6] px-5 font-black text-[#0d1726] shadow-lg">
            <Play className="size-4 fill-current" aria-hidden /> Continue playing
          </button>
          <button type="button" onClick={onLeave} style={{ "--jelly": "#e5484d", "--jelly-hi": "#ff8a8d", "--jelly-edge": "#9b1c20", "--jelly-ink": "#fff" } as CSSProperties} className="jelly flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e5484d] px-5 font-black text-white">
            <LogOut className="size-4" aria-hidden /> Leave game
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-white/60">Your spot is saved. Pick up right here next time. Press Esc to close.</p>
      </section>
    </div>
  );
}

/** "Continue playing" on the Games page, shown once there's a saved spot. */
export function ContinuePlaying({ userId, className }: { userId: string; className?: string }) {
  const [spot, setSpot] = useState<ResumeSpot | null>(null);
  useEffect(() => setSpot(loadResume(userId)), [userId]);
  if (!spot) return null;
  return (
    <Link href={resumeHref(spot)} className={className}>
      <Play className="size-4 fill-current" aria-hidden /> Continue playing
      <span className="text-sm font-bold opacity-70">· {spot.name}</span>
    </Link>
  );
}
