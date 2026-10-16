import type { Metadata } from "next";

import { Arcade } from "@/components/arcade/arcade";
import { requireAccount } from "@/lib/account/server";
import { loadArcade } from "@/lib/game/arcade-server";
import { loadPlayer } from "@/lib/game/server";

export const metadata: Metadata = { title: "Arcade" };

export default async function ArcadePage() {
  const account = await requireAccount("/games/arcade");
  const [player, owned] = await Promise.all([loadPlayer(account.id), loadArcade(account.id)]);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-12">
      <p className="text-xs font-black tracking-[0.3em] text-ink-lilac uppercase">The Arcade</p>
      <h1 className="arcade-display mt-2 text-4xl md:text-5xl">60-second revision games</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Unlock games with the Clout you earn at work and in Promotion Panic. No real money, ever. You have{" "}
        <strong className="text-foreground">{player.clout.toLocaleString("en-GB")} Clout</strong>.
      </p>
      <div className="mt-6">
        <Arcade owned={owned} clout={player.clout} />
      </div>
    </div>
  );
}
