"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { GameIcon } from "./game-icons";

const keyFor = (userId: string) => `illuminated:welcome-seen:${userId}`;

/**
 * The welcome video: plays full screen the first time someone signs in (or
 * whenever the page has ?welcome=1). They can skip at any time; at the end
 * it offers Play World or the main menu.
 */
export function WelcomeVideo({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(keyFor(userId)) === "1"; } catch { /* Optional. */ }
    const asked = new URLSearchParams(window.location.search).get("welcome") === "1";
    if (!seen || asked) setOpen(true);
  }, [userId]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const close = () => {
    try { localStorage.setItem(keyFor(userId), "1"); } catch { /* Optional. */ }
    video.current?.pause();
    setOpen(false);
    if (window.location.search.includes("welcome=1")) window.history.replaceState(null, "", window.location.pathname);
  };
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome to IllumED" className="fixed inset-0 z-[200000] grid place-items-center bg-[#0b1220]">
      <video ref={video} className="h-full w-full object-contain" src="/landing/welcome.mp4" poster="/landing/welcome-poster.jpg" autoPlay muted playsInline onEnded={() => setEnded(true)}>
        <track kind="captions" />
      </video>
      <button type="button" onClick={close} className="absolute top-4 right-4 min-h-12 rounded-full border-4 border-[#1b1835] bg-white px-6 font-black text-[#1b1835] shadow-[0_5px_0_#1b1835] transition active:translate-y-1 active:shadow-none">
        Skip intro
      </button>
      {ended && (
        <div className="absolute inset-0 grid place-items-center bg-[#0b1220]/70 p-6">
          <div className="grid w-full max-w-sm gap-3 text-center">
            <p className="text-3xl font-black text-white">You&apos;re all set!</p>
            <Link href="/games/world" onClick={close} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-4 border-[#1b1835] bg-[#f2d9a6] text-xl font-black text-[#1b1835] shadow-[0_6px_0_#1b1835]"><GameIcon name="play" size={30} /> Play World</Link>
            <button type="button" onClick={close} className="min-h-12 rounded-2xl border-4 border-[#1b1835] bg-white font-black text-[#1b1835] shadow-[0_6px_0_#1b1835]">Go to the main menu</button>
            <button type="button" onClick={() => { setEnded(false); if (video.current) { video.current.currentTime = 0; void video.current.play(); } }} className="text-sm font-bold text-white/70 underline">Watch again</button>
          </div>
        </div>
      )}
    </div>
  );
}
