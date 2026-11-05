import Link from "next/link";

import { Sparkles } from "lucide-react";
import type { Metadata } from "next";


export const metadata: Metadata = { title: "Study agent · coming soon" };

/** The study agent isn't live yet: a clear coming-soon page instead of a half-working workspace. */
export default function AgentPage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6 px-4 pt-16 pb-24 text-center">
      <Sparkles className="mx-auto size-12 text-[#7a5ce6]" aria-hidden />
      <p className="text-sm font-black tracking-[0.3em] text-[#7a5ce6] uppercase">Coming soon</p>
      <h1 className="text-4xl font-black md:text-5xl">The IllumED study agent</h1>
      <p className="text-lg text-muted-foreground">
        A study helper that plans your revision week around your homework and exam dates, then quizzes you on what was set. It isn&apos;t
        switched on yet. Until then, everything else works: lessons, quizzes, the Championship and IllumED World.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/learn" className="rounded-full bg-[#2b5fd9] px-6 py-3 font-black text-white">Start learning</Link>
        <Link href="/games" className="rounded-full bg-[#13203a] px-6 py-3 font-black text-white">Play IllumED World</Link>
      </div>
    </div>
  );
}
