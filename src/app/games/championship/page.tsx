import type { Metadata } from "next";

import { Championship } from "@/components/game/championship/championship";
import { requireAccount } from "@/lib/account/server";

export const metadata: Metadata = { title: "IllumED Championship" };

export default async function ChampionshipPage() {
  await requireAccount("/games/championship");
  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-12">
      <Championship />
    </div>
  );
}
