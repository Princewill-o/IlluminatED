import Image from "next/image";
import Link from "next/link";

import { BadgeCheck, Briefcase, ClipboardList, Gamepad2, Shirt, Sofa } from "lucide-react";
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

  return (
    <div id="city" className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      {!player.ready && (
        <p className="mb-4 rounded-2xl border border-[#ffd166] p-3 text-sm text-ink-sun">
          Saving isn&apos;t switched on yet, so you can play but your progress
          won&apos;t be kept.
        </p>
      )}

      <section className="relative overflow-hidden rounded-[2rem] bg-[#13203a] text-white shadow-[0_10px_0_rgba(19,32,58,0.15)]">
        <Image src="/landing/game-city-life.webp" alt="" fill priority sizes="(max-width: 1200px) 100vw, 1150px" className="object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#13203a] via-[#13203a]/75 to-transparent" />
        <div className="relative grid gap-6 p-6 md:grid-cols-[1fr_260px] md:p-10">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black tracking-[0.2em] uppercase backdrop-blur">
              <span className="size-2 animate-pulse rounded-full bg-[#6cc04a]" /> London is live
            </p>
            <h1 className="arcade-display mt-4 text-5xl leading-[0.95] md:text-7xl">
              Your life.
              <br />
              <span className="text-[#f2d9a6]">Your London.</span>
            </h1>
            <p className="mt-4 text-lg leading-8 text-white/85">
              Catch the BL1, ride the Tube, hire a Lyme bike, work shifts and hand in homework, all while revising for real. We&apos;ll put you on the
              server nearest you.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/games/world" className="arcade-btn rounded-full bg-[#f2d9a6] px-8 py-4 text-lg font-black text-[#0d1726]">
                Play London →
              </Link>
              <Link href="/games/locker" className="rounded-full bg-white/15 px-5 py-3 font-black backdrop-blur hover:bg-white/25">
                Edit your character
              </Link>
              {player.dailyBonusReady && <span className="rounded-full bg-[#0d1726] px-4 py-2 text-sm font-black text-[#ffd166]">Daily Grind ready: double Clout</span>}
            </div>
          </div>
          <div className="self-end rounded-3xl bg-[#f7f1e6] p-5 text-[#13203a]">
            <AvatarFigure avatar={player.avatar} size={150} className="mx-auto" />
            <p className="mt-2 text-center font-black">@{account.profile.username}</p>
            <p className="text-center text-xs text-[#13203a]/70">
              Level {lp.level} · {levelTitle(lp.level)}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#13203a]/10" role="progressbar" aria-label="Progress to next level" aria-valuenow={Math.round(lp.fraction * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-[#2b5fd9]" style={{ width: `${lp.fraction * 100}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[11px] font-bold">
              <div className="rounded-xl bg-white p-2">
                <p className="text-lg font-black text-[#c98a00]">{fmt(player.clout)}</p>Clout
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-lg font-black text-[#d4536a]">{player.streak}</p>Streak
              </div>
              <div className="rounded-xl bg-white p-2">
                <p className="text-lg font-black text-[#15987f]">
                  {ceos}/{companies.length}
                </p>
                CEO of
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" aria-label="Things to do">
        {[
          { href: "/games/world?phone=1", title: "Promotion Panic", text: "Intern to CEO in one shift", colour: "#2b5fd9", Icon: Briefcase },
          { href: "/games/world?phone=1", title: "Jobs", text: "Interviews and shifts", colour: "#e0a100", Icon: BadgeCheck },
          { href: "/homework", title: "Homework", text: "Quests from your class", colour: "#15987f", Icon: ClipboardList },
          { href: "/games/world", title: "Games Hub", text: "Tycoon, draughts and more", colour: "#d4536a", Icon: Gamepad2 },
          { href: "/games/world?phone=1", title: "Your flat", text: "Decorate and upgrade", colour: "#7a5ce6", Icon: Sofa },
          { href: "/games/locker", title: "Locker", text: "Outfits and looks", colour: "#13203a", Icon: Shirt },
        ].map(({ href, title, text, colour, Icon }) => (
          <Link key={title} href={href} className="group rounded-3xl border-2 border-white bg-card p-4 shadow-[0_4px_0_rgba(19,32,58,0.08)] transition hover:-translate-y-1">
            <span className="grid size-11 place-items-center rounded-2xl text-white transition group-hover:rotate-[-6deg]" style={{ background: colour }}>
              <Icon className="size-6" aria-hidden />
            </span>
            <p className="mt-3 font-black">{title}</p>
            <p className="text-xs text-muted-foreground">{text}</p>
          </Link>
        ))}
      </section>

      <section className="mt-10" aria-labelledby="map">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="map" className="arcade-display text-3xl">
              The city
            </h2>
            <p className="mt-1 text-muted-foreground">
              Join the city, then visit a company or call using your in-game phone. Company cards here show your progress.
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
                <article className="block h-full overflow-hidden rounded-3xl border border-border bg-card">
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
                      <span className="absolute top-4 left-4 rounded-full bg-[#f2d9a6] px-3 py-1 text-xs font-black text-[#0d1726]">
                        For you
                      </span>
                    )}
                    {(prog?.bestRank ?? 0) >= CEO_RANK && (
                      <span className="absolute top-4 right-4 rounded-full bg-[#ffd166] px-3 py-1 text-xs font-black text-[#0d1726]">
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
                    <span className="mt-4 inline-block rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
                      Call from your game phone
                    </span>
                  </div>
                </article>
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
