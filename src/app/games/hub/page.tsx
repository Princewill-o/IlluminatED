import type { Metadata } from "next";

import { GamesHub } from "@/components/game/hub/games-hub";
import { requireAccount } from "@/lib/account/server";

export const metadata: Metadata = { title: "Games Hub" };

export default async function HubPage() {
  const account = await requireAccount("/games/hub");
  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-10">
      <GamesHub me={{ id: account.id, username: account.profile.username }} />
    </div>
  );
}
