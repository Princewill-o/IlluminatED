import type { Metadata } from "next";

import Link from "next/link";

import { QuestBoard } from "@/components/game/quests/quest-board";

export const metadata: Metadata = { title: "Quests" };

/** Daily and weekly quests from the games menu: claim Clout for what you've done. */
export default function QuestsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-10">
      <Link href="/games" className="text-sm font-bold text-muted-foreground hover:underline">← Games</Link>
      <h1 className="arcade-display mt-2 text-4xl md:text-5xl">Quests</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Daily and weekly goals across IlluminatED. Finish one and claim your Clout.</p>
      <div className="mt-6"><QuestBoard /></div>
    </div>
  );
}
