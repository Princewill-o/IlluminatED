"use client";

import { useEffect, useState } from "react";

import { NumberTicker } from "@/components/ui/magic/number-ticker";
import { normalisePlatformStats, type PlatformStats } from "@/lib/education/platform-stats";

export function PlatformTotals({ initial }: { initial: PlatformStats }) {
  const [stats,setStats]=useState(initial);
  useEffect(()=>{
    const controller=new AbortController();
    async function refresh() {
      if(document.hidden) return;
      try { const response=await fetch("/api/education/stats",{signal:controller.signal});if(response.ok)setStats(normalisePlatformStats(await response.json())); } catch { /* Keep the last successful totals. */ }
    }
    void refresh();
    const timer=window.setInterval(refresh,300000);
    return ()=>{controller.abort();window.clearInterval(timer);};
  },[]);
  const totals:[number,string][] = [
    [stats.questions,"practice questions, each with an answer and explanation"],
    [stats.practice_sets,"topic practice sets ready to assign"],
    [stats.subjects,"GCSE, A-level, BTEC and T Level subjects"],
    [stats.game_questions,"quiz challenges to play inside the game"],
    ...(stats.oak_lessons>0 ? [
      [stats.oak_lessons,"lessons ready for IllumED Slides and recall practice"],
      [stats.oak_units,"curriculum units across primary and secondary"],
      [stats.oak_subjects,"school subjects across Key Stages 1–4"],
      [stats.oak_key_stages,"key stages covered by the lesson library"],
      [stats.lesson_recall_questions,"self-check questions adapted from lesson text"],
    ] as [number,string][] : []),
    [184,"Locker items to mix into your own look"],
    [13,"company HQs with jobs to try in the city"],
  ];
  return <div className="container mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{totals.map(([value,label])=><div key={label} className="rounded-3xl bg-[var(--sky-card)] p-6 text-center ring-1 ring-[var(--sky-ring)] backdrop-blur"><NumberTicker value={value} className="text-5xl font-semibold tracking-[-0.035em] text-[var(--sky-ink)] [font-family:var(--font-geist-sans)] dark:text-[var(--sky-ink)]" /><p className="mt-2 text-sm text-[var(--sky-soft)]">{label}</p></div>)}</div>;
}
