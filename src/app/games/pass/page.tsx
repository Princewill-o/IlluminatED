import type { Metadata } from "next";

import { SeasonPass } from "@/components/game/season/season-pass";
import { requireAccount } from "@/lib/account/server";

export const metadata: Metadata = { title: "Season Pass" };

export default async function PassPage() {
  const account = await requireAccount("/games/pass");
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      <SeasonPass userId={account.id} />
    </div>
  );
}
