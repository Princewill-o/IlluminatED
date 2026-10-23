"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Check, Gift, Sparkles } from "lucide-react";

import { claimQuest, questBoard, type Quest } from "@/app/games/quests/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { cn } from "@/lib/utils";

const WHERE: Record<string, string> = {
  "d-champ": "/games/championship", "w-champ": "/games/championship", "d-race-win": "/games/racing", "d-races": "/games/racing", "w-wins": "/games/racing",
  "d-quiz": "/practice", "d-study": "/games/study", "w-sessions": "/games/study", "d-shift": "/games/careers", "d-arcade": "/games/arcade",
};

/** Today's three quests and this week's three. Missing a day never loses anything. */
export function QuestBoard() {
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => { void questBoard().then(setQuests).catch(() => setQuests([])); }, []);
  if (!quests?.length) return null;
  const groups = [["Today's quests", quests.filter((q) => !q.weekly)], ["This week", quests.filter((q) => q.weekly)]] as const;
  return (
    <section className="rounded-[2rem] border-2 border-[#13203a]/10 bg-white p-5" aria-labelledby="quests-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="quests-title" className="flex items-center gap-2 text-xl font-black"><Sparkles className="size-5 text-[#7a5ce6]" aria-hidden /> Quests</h2>
        <p className="text-xs text-muted-foreground">New quests every day. No streaks to lose.</p>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {groups.map(([label, list]) => (
          <div key={label}>
            <p className="text-xs font-black tracking-widest text-muted-foreground uppercase">{label}</p>
            <ul className="mt-2 grid gap-2">
              {list.map((q) => {
                const done = q.progress >= q.target;
                return (
                  <li key={q.key} className={cn("flex items-center gap-3 rounded-2xl p-3", q.claimed ? "bg-[#e3f6ef]" : "bg-[#f7f1e6]")}>
                    <span className="min-w-0 flex-1">
                      <Link href={WHERE[q.key] ?? "/games"} className="block text-sm font-black hover:underline">{q.title}</Link>
                      <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-[#13203a]/10"><span className="block h-full rounded-full bg-[#7a5ce6] transition-[width]" style={{ width: `${(100 * q.progress) / q.target}%` }} /></span>
                      <span className="mt-1 block text-xs text-muted-foreground">{q.progress}/{q.target} · +{q.reward} Clout</span>
                    </span>
                    {q.claimed ? <Check className="size-6 text-[#15987f]" aria-label="Collected" /> : (
                      <button type="button" disabled={!done} onClick={async () => {
                        const r = await claimQuest(q.key);
                        setNote(r.ok ? `+${r.reward} Clout and XP!` : r.error);
                        if (r.ok) { notifyPlayerChanged(); setQuests(await questBoard()); }
                      }} className="jelly flex items-center gap-1 rounded-full bg-[#ffc83d] px-3 py-2 text-xs font-black text-[#0d1726] disabled:opacity-40">
                        <Gift className="size-3.5" aria-hidden /> Collect
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {note && <p role="status" className="mt-3 text-sm font-bold">{note}</p>}
    </section>
  );
}
