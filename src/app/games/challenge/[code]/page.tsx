import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { AvatarFigure } from "@/components/game/avatar";
import { Building } from "@/components/game/building";
import { companyById } from "@/game/core/companies";
import { RANKS } from "@/game/core/shift";
import { loadChallenge } from "@/lib/game/server";
import { getViewer } from "@/lib/social/server";

type Params = { code: string };

const fmt = (n: number) => n.toLocaleString("en-GB");

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const c = await loadChallenge((await params).code);
  const company = c && companyById(c.company);
  if (!c || !company)
    return { title: "Challenge not found", robots: { index: false } };
  const text = `${RANKS[c.rank].title} at ${company.name} with ${fmt(c.score)} points. Think you can beat it?`;
  return {
    title: `Promotion Panic challenge: ${company.name}`,
    description: text,
    robots: { index: false },
    openGraph: {
      title: "You've been challenged on IlluminatED",
      description: text,
    },
  };
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { code } = await params;
  const [c, viewer] = await Promise.all([loadChallenge(code), getViewer()]);
  const company = c && companyById(c.company);
  if (!c || !company) notFound();
  const playHref = `/games/promotion-panic/${company.id}?challenge=${c.code}`;
  const who = c.username ? `@${c.username}` : "A player";

  return (
    <div id="challenge" className="mx-auto max-w-4xl px-4 pt-8 pb-10">
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="bg-[#ff7a6b] px-6 py-3 text-center text-sm font-black tracking-[0.3em] text-[#0d1726] uppercase">
          You&apos;ve been challenged
        </div>
        <div className="grid items-center gap-6 p-6 md:grid-cols-[auto_1fr] md:p-10">
          <div className="flex items-end justify-center gap-2">
            <AvatarFigure
              avatar={c.avatar}
              mood="cool"
              size={200}
              clip="wave"
              title={`${who}'s avatar`}
            />
          </div>
          <div>
            <h1 className="arcade-display text-4xl md:text-5xl">
              {who} made{" "}
              <span className="text-ink-sun">{RANKS[c.rank].title}</span> at{" "}
              {company.name}
            </h1>
            <p className="mt-4 text-lg">
              Score to beat:{" "}
              <strong className="arcade-display text-3xl text-ink-lime">
                {fmt(c.score)}
              </strong>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Same 12 tasks, same order.{" "}
              {c.attempts > 0
                ? `${c.attempts} ${c.attempts === 1 ? "person has" : "people have"} tried, ${c.beaten} beat it.`
                : "Nobody has tried yet. Be first."}
            </p>
            <p className="mt-4 text-foreground/80 italic">
              {company.name}: “{company.tagline}” · revising {company.revises}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={playHref}
                className="arcade-btn rounded-full bg-[#f2d9a6] px-8 py-4 text-lg font-black text-[#0d1726]"
              >
                {viewer ? "Accept the challenge →" : "Log in to accept →"}
              </Link>
              <Link
                href="/"
                className="rounded-full border border-border px-6 py-4 font-bold"
              >
                What&apos;s IlluminatED?
              </Link>
            </div>
            {!viewer && (
              <p className="mt-3 text-xs text-muted-foreground">
                IlluminatED is free revision for GCSE, A level, BTEC and T Level
                learners. Promotion Panic is how we make it fun.
              </p>
            )}
          </div>
        </div>
        <div className="border-t border-border bg-secondary px-6 pt-4">
          <Building
            shape={company.building}
            accent={company.accent}
            className="mx-auto h-28 w-48"
          />
        </div>
      </section>
    </div>
  );
}
