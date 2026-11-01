"use client";

import { useEffect, useRef, useState } from "react";

import dynamic from "next/dynamic";

import { X } from "lucide-react";

import { RewardGuide } from "./reward-guide";

const Racing = dynamic(() => import("../racing/racing-hub").then(m => m.RacingHub), { ssr: false });
const Championship = dynamic(() => import("../championship/championship").then(m => m.Championship), { ssr: false });
const WhatIf = dynamic(() => import("../what-if/what-if").then(m => m.WhatIf), { ssr: false });
const Season = dynamic(() => import("../season/season-pass").then(m => m.SeasonPass), { ssr: false });
const Schools = dynamic(() => import("../schools/school-league").then(m => m.SchoolLeague), { ssr: false });

export type EventGame = "racing" | "championship" | "what-if" | "events" | "rewards" | "schools";
const TITLES: Record<EventGame, string> = { racing: "Maths Racing", championship: "Championship", "what-if": "What If", events: "Events & rewards", rewards: "How rewards work", schools: "School league" };

export function EventArcade({ userId, initial = "events", onClose }: { userId: string; initial?: EventGame; onClose: () => void }) {
  const [game, setGame] = useState(initial);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); }
      if (e.key === "Tab") {
        const items = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, [tabindex="0"]') ?? []).filter(el => el.offsetParent !== null);
        const first = items[0], last = items.at(-1);
        if (e.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("keydown", key, true); previous?.focus(); };
  }, [onClose]);
  return (
    <section ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Event arcade" className="arcade absolute inset-0 z-[100020] overflow-y-auto bg-background text-foreground outline-none">
      <header className="sticky top-0 z-[60] flex flex-wrap items-center gap-2 border-b bg-background/95 p-3 backdrop-blur">
        <nav aria-label="Event games" className="flex flex-1 flex-wrap gap-2">
          {(Object.keys(TITLES) as EventGame[]).map(id => <button key={id} type="button" aria-pressed={id === game} onClick={() => setGame(id)} className={`rounded-full px-4 py-2 text-sm font-black ${id === game ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{TITLES[id]}</button>)}
        </nav>
        <button type="button" onClick={onClose} className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 font-bold"><X className="size-4" aria-hidden />Back to world</button>
      </header>
      <div className="event-game-content mx-auto max-w-6xl p-4 pb-16 sm:p-6" key={game}>
        {game === "racing" ? <Racing /> : game === "championship" ? <Championship /> : game === "what-if" ? <WhatIf userId={userId} /> : game === "schools" ? <Schools /> : game === "rewards" ? <RewardGuide /> : <Season userId={userId} />}
      </div>
    </section>
  );
}
