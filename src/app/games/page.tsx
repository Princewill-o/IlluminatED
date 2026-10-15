import Link from "next/link";

import { Map as MapIcon } from "lucide-react";
import type { Metadata } from "next";

import { AvatarFigure } from "@/components/game/avatar";
import { Building } from "@/components/game/building";
import { CompanyLogo } from "@/components/game/company-logo";
import { isRecommended, rankCompaniesFor } from "@/game/core/companies";
import { levelProgress, levelTitle } from "@/game/core/progression";
import { CEO_RANK, RANKS } from "@/game/core/shift";
import { requireAccount } from "@/lib/account/server";
import { loadPlayer } from "@/lib/game/server";

export const metadata: Metadata = { title: { absolute: "IlluminatED City" } };

const fmt = (n: number) => n.toLocaleString("en-GB");

export default async function GamesHome() {
  const account = await requireAccount("/games");
  const player = await loadPlayer(account.id);
  const courseIds = account.details.subjects.map((s) => s.courseId);
  const companies = rankCompaniesFor(courseIds);
  const lp = levelProgress(player.xp);
  const ceos = companies.filter(
    (c) => (player.companies[c.id]?.bestRank ?? 0) >= CEO_RANK,
  ).length;
  const first = companies[0];

  return (
    <div id="city" className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      {!player.ready && (
        <p className="mb-4 rounded-2xl border border-[#ffd166] p-3 text-sm text-ink-sun">
          Saving isn&apos;t switched on yet, so you can play but your progress
          won&apos;t be kept.
        </p>
      )}

      <Link
        href="/games/world"
        className="mb-4 flex items-center gap-4 overflow-hidden rounded-3xl border-2 border-[#c6f36b] bg-card p-4 transition active:scale-[0.99] md:p-5"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#c6f36b] text-[#0b0910]" aria-hidden>
          <MapIcon className="size-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-black">Enter the world</span>
          <span className="block text-sm text-muted-foreground">
            Walk the city with other players, visit company offices on Careers Campus and meet verified employers.
          </span>
        </span>
        <span className="hidden rounded-full bg-[#c6f36b] px-4 py-2 text-sm font-black text-[#0b0910] sm:block">Join a server →</span>
      </Link>
      <section className="grid items-center gap-6 rounded-3xl bg-brand p-6 text-white md:grid-cols-[1fr_auto] md:p-10">
        <div>
          <p className="text-xs font-black tracking-[0.3em] text-white/75 uppercase">
            Now hiring · Promotion Panic
          </p>
          <h1 className="arcade-display mt-3 text-5xl md:text-7xl">
            Intern to CEO.
            <br />
            <span className="text-[#c6f36b]">One shift.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8">
            Pick a (totally made-up) company, answer real revision questions
            against the clock, and get promoted before your three strikes run
            out. Earn Clout, unlock outfits and challenge your mates.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/games/promotion-panic/${first.id}`}
              className="arcade-btn rounded-full bg-[#c6f36b] px-8 py-4 text-lg font-black text-[#0b0910]"
            >
              Quick shift at {first.name} →
            </Link>
            {player.dailyBonusReady && (
              <span className="rounded-full bg-[#0b0910] px-4 py-2 text-sm font-black text-[#ffd166]">
                Daily Grind ready: double Clout
              </span>
            )}
          </div>
        </div>
        <div className="rounded-3xl bg-card p-5 text-foreground">
          <AvatarFigure
            avatar={player.avatar}
            size={190}
            className="mx-auto"
          />
          <p className="mt-3 text-center font-black">
            @{account.profile.username}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Level {lp.level} · {levelTitle(lp.level)}
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/[0.08]"
            role="progressbar"
            aria-label="Progress to next level"
            aria-valuenow={Math.round(lp.fraction * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-[#a67fff]"
              style={{ width: `${lp.fraction * 100}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-foreground/[0.05] p-2">
              <p className="text-lg font-black text-ink-sun">
                {fmt(player.clout)}
              </p>
              Clout
            </div>
            <div className="rounded-xl bg-foreground/[0.05] p-2">
              <p className="text-lg font-black text-ink-coral">
                {player.streak}
              </p>
              Day streak
            </div>
            <div className="rounded-xl bg-foreground/[0.05] p-2">
              <p className="text-lg font-black text-ink-lime">
                {ceos}/{companies.length}
              </p>
              CEO of
            </div>
          </div>
          <Link
            href="/games/locker"
            className="mt-4 block rounded-full border border-border py-2 text-center text-sm font-bold hover:bg-hover"
          >
            Open your Locker
          </Link>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="map">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="map" className="arcade-display text-3xl">
              The city
            </h2>
            <p className="mt-1 text-muted-foreground">
              Every building is a company. Every company is a subject in
              disguise.
            </p>
          </div>
          <p className="text-sm font-bold text-ink-lime">
            Become CEO everywhere to complete the collection ({ceos}/
            {companies.length})
          </p>
        </div>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => {
            const prog = player.companies[c.id];
            const forYou = isRecommended(c, courseIds);
            return (
              <li key={c.id}>
                <Link
                  href={`/games/promotion-panic/${c.id}`}
                  className="group block h-full overflow-hidden rounded-3xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary focus-visible:-translate-y-1"
                >
                  <div
                    className="relative px-6 pt-6"
                    style={{ background: `color-mix(in srgb, ${c.accent} 24%, var(--card))` }}
                  >
                    <Building
                      shape={c.building}
                      accent={c.accent}
                      className="mx-auto h-36 w-full"
                    />
                    {forYou && (
                      <span className="absolute top-4 left-4 rounded-full bg-[#c6f36b] px-3 py-1 text-xs font-black text-[#0b0910]">
                        For you
                      </span>
                    )}
                    {(prog?.bestRank ?? 0) >= CEO_RANK && (
                      <span className="absolute top-4 right-4 rounded-full bg-[#ffd166] px-3 py-1 text-xs font-black text-[#0b0910]">
                        CEO
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <p
                      className="text-xs font-bold tracking-widest uppercase"
                      style={{ color: `color-mix(in srgb, ${c.accent} 55%, var(--foreground))` }}
                    >
                      {c.sector} · {c.revises}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <CompanyLogo id={c.id} size={36} className="shrink-0" />
                      <h3 className="arcade-display text-2xl">{c.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-foreground/80 italic">
                      “{c.tagline}”
                    </p>
                    <p className="mt-4 text-sm">
                      {prog ? (
                        <>
                          Best:{" "}
                          <strong className="text-ink-sun">
                            {RANKS[prog.bestRank].title}
                          </strong>{" "}
                          · {fmt(prog.bestScore)} pts
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Not hired yet. Boss: {c.boss.name}
                        </span>
                      )}
                    </p>
                    <span className="mt-4 inline-block rounded-full bg-brand px-4 py-2 text-sm font-black text-white group-hover:bg-[#8d63ff]">
                      {prog ? "Clock in again" : "Start as intern"} →
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        className="mt-10 grid gap-4 md:grid-cols-2"
        aria-label="Coming soon"
      >
        {[
          [
            "Live Arena",
            "Class vs class quiz battles on the big screen. Join with a PIN.",
          ],
          [
            "Experience Sims",
            "Actually do the job: fix laptops at Macrosoft, run a ward round at St Plaster's.",
          ],
        ].map(([title, text]) => (
          <div
            key={title}
            className="rounded-3xl border-2 border-dashed border-border p-6"
          >
            <p className="text-xs font-black tracking-[0.25em] text-ink-sun uppercase">
              Under construction
            </p>
            <h2 className="arcade-display mt-3 text-2xl">
              {title}
            </h2>
            <p className="mt-2 text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
