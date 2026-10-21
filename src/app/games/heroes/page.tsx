import type { Metadata } from "next";

import { HeroRush } from "@/components/game/season/hero-rush";
import { currentEvent } from "@/game/core/live-events";
import { requireAccount } from "@/lib/account/server";

const MODE_FOR: Record<string, "hero" | "space" | "case" | "cup"> = { "hero-week": "hero", "space-week": "space", "detective-week": "case", "sports-week": "cup" };

export const metadata: Metadata = { title: "Hero Rush" };

export default async function HeroesPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const account = await requireAccount("/games/heroes");
  const { mode } = await searchParams;
  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-10">
      <HeroRush userId={account.id} mode={mode === "space" || mode === "case" || mode === "cup" || mode === "hero" ? mode : MODE_FOR[currentEvent().event.id] ?? "hero"} />
    </div>
  );
}
