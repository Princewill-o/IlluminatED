"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { Globe2, LogOut, MapPin, Play } from "lucide-react";

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
export function GameMenu({ place, onContinue, onLeave, onSwitch, onEvents }: { place: string; onContinue: () => void; onLeave: () => void; onSwitch?: () => void; onEvents?: () => void }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  return (
    <div className="pixel-menu-backdrop absolute inset-0 z-[100012] grid place-items-center p-4" onClick={onContinue}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-menu-title"
        onClick={(e) => e.stopPropagation()}
        className="pixel-panel pixel-menu w-full max-w-sm"
      >
        <div className="pixel-ribbon text-center text-sm">Game paused</div>
        <div className="pixel-menu-body">
        <h2 id="game-menu-title" className="font-black">Take a breather</h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-bold"><MapPin className="size-4 shrink-0" aria-hidden />{place}</p>
        <div className="mt-6 grid gap-3">
          <button ref={first} type="button" onClick={onContinue} className="pixel-button pixel-button--green flex min-h-12 items-center justify-center gap-2 px-5">
            <Play className="size-4 fill-current" aria-hidden /> Continue playing
          </button>
          {onEvents && <button type="button" onClick={onEvents} className="pixel-button pixel-button--purple min-h-12 px-5">Racing, Championship & What If</button>}
          {onSwitch && (
            <button type="button" onClick={onSwitch} className="pixel-button flex min-h-12 items-center justify-center gap-2 px-5">
              <Globe2 className="size-4" aria-hidden /> Switch world
            </button>
          )}
          <button type="button" onClick={onLeave} className="pixel-button pixel-button--orange flex min-h-12 items-center justify-center gap-2 px-5">
            <LogOut className="size-4" aria-hidden /> Leave game
          </button>
        </div>
        <p className="mt-5 text-center text-xs font-semibold leading-5">Your spot is saved. Pick up right here next time. Press Esc to close.</p>
        </div>
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
