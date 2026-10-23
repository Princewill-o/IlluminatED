import type { Metadata } from "next";

import { WhatIf } from "@/components/game/what-if/what-if";
import { requireAccount } from "@/lib/account/server";

export const metadata: Metadata = { title: "What If" };

export default async function WhatIfPage() {
  const account = await requireAccount("/games/what-if");
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-12">
      <p className="text-xs font-black tracking-[0.3em] text-ink-lilac uppercase">Life story</p>
      <h1 className="arcade-display mt-2 text-4xl md:text-5xl">What If?</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Live a whole life, one year at a time. Chase your dream job, make surprising choices and see where they take you, then carry on as your
        children.
      </p>
      <div className="mt-6">
        <WhatIf userId={account.id} />
      </div>
    </div>
  );
}
