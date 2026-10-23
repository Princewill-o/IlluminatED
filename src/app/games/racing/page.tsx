import type { Metadata } from "next";

import { RacingHub } from "@/components/game/racing/racing-hub";
import { requireAccount } from "@/lib/account/server";

export const metadata: Metadata = { title: "Maths Racing" };

export default async function RacingPage() {
  await requireAccount("/games/racing");
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-12">
      <p className="text-xs font-black tracking-[0.3em] text-ink-lilac uppercase">Signature game</p>
      <h1 className="arcade-display mt-2 text-4xl md:text-5xl">Maths Racing</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Answer to accelerate. Correct answers boost your kart, wrong ones slow you down, so accuracy wins races. Eight worlds from number to
        A level calculus, boss races, time trials and ghost races against your friends.
      </p>
      <div className="mt-6">
        <RacingHub />
      </div>
    </div>
  );
}
