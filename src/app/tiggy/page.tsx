import Link from "next/link";

import type { Metadata } from "next";

import { CrisisHelp } from "@/components/crisis-help";
import { Note } from "@/components/kit";
import { Tiggy } from "@/components/tiggy";
import { TiggyChat } from "@/components/tiggy-chat";
import { requireAccount } from "@/lib/account/server";
import { aiEnabled } from "@/lib/ai";
import { getSupabase } from "@/lib/social/server";
import { premiumEnabled } from "@/lib/stripe";
import { TIGGY_DISCLAIMER } from "@/lib/tiggy";
import { getTiggyStatus } from "@/lib/tiggy-server";

export const metadata: Metadata = {
  title: "Ask Tiggy",
  description:
    "Tiggy, IlluminatED's AI study helper, explains topics step by step, gives hints on homework and helps you plan revision.",
};
export const dynamic = "force-dynamic";

export default async function TiggyPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const account = await requireAccount("/tiggy");
  const { upgraded } = await searchParams;
  const sb = await getSupabase();
  const status = sb ? await getTiggyStatus(sb) : null;
  const ready = aiEnabled && status !== null;

  return (
    <div className="container pt-6 pb-16 lg:pt-10">
      <header className="mb-8 max-w-3xl">
        <h1 className="text-4xl tracking-tight md:text-5xl">Ask Tiggy</h1>
        <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
          Your AI study helper for GCSE, A level, BTEC, T Levels and beyond.
          Tiggy explains things step by step and gives you hints before answers,
          so you learn it for yourself.
        </p>
      </header>

      {ready ? (
        <TiggyChat
          userId={account.id}
          initialStatus={status}
          premiumEnabled={premiumEnabled}
          upgraded={upgraded === "1"}
          crisis={<CrisisHelp compact />}
        />
      ) : (
        <div className="grid items-center gap-8 md:grid-cols-[12rem_1fr]">
          <Tiggy action="think" className="mx-auto w-32 md:w-44" />
          <div className="bg-card max-w-2xl rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">Tiggy is being set up</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              We're getting Tiggy ready to chat. Check back soon! Meanwhile, you
              can practise in the{" "}
              <Link
                href="/quizzes"
                className="text-primary underline underline-offset-4"
              >
                quiz centre
              </Link>
              , revise with{" "}
              <Link
                href="/flashcards"
                className="text-primary underline underline-offset-4"
              >
                flashcards
              </Link>{" "}
              or{" "}
              <Link
                href="/tutors"
                className="text-primary underline underline-offset-4"
              >
                ask a tutor
              </Link>
              .
            </p>
            <Note className="mt-5">
              If you need to talk to someone now, see{" "}
              <Link href="/safeguarding">getting help</Link>. In an emergency,
              call 999.
            </Note>
            <p className="text-muted-foreground mt-5 text-xs">
              {TIGGY_DISCLAIMER}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
