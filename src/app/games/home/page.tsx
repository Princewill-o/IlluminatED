import Link from "next/link";

import type { Metadata } from "next";


import { HomeEditor } from "@/components/careers/home-editor";
import { requireAccount } from "@/lib/account/server";
import { loadHome } from "@/lib/game/careers-server";
import { loadPlayer } from "@/lib/game/server";

export const metadata: Metadata = { title: "Your home" };

export default async function HomePage() {
  const account = await requireAccount("/games/home");
  const [player, home] = await Promise.all([loadPlayer(account.id), loadHome(account.id)]);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-12">
      <p className="text-xs font-black tracking-[0.3em] text-ink-lilac uppercase">Your home</p>
      <h1 className="arcade-display mt-2 text-4xl md:text-5xl">Make it yours</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Move things around, buy furniture with the Clout you earn at work, and save up to move house. Everything saves to your account and shows up when you walk
        in from{" "}
        <Link href="/games/world?map=home" className="font-bold text-ink-lilac underline">
          Worlds
        </Link>
        .
      </p>
      <div className="mt-6">
        <HomeEditor owned={home.owned} current={home.current} layout={home.layout} bought={home.furniture} clout={player.clout} />
      </div>
    </div>
  );
}
