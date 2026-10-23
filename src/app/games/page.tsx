import Image from "next/image";
import Link from "next/link";

import { ClipboardList, Gamepad2, Shirt } from "lucide-react";
import type { Metadata } from "next";

import { AvatarFigure } from "@/components/game/avatar";
import { ContinuePlaying } from "@/components/game/world/game-menu";
import { rankCompaniesFor } from "@/game/core/companies";
import { levelProgress, levelTitle } from "@/game/core/progression";
import { CEO_RANK } from "@/game/core/shift";
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
              <span className="size-2 animate-pulse rounded-full bg-[#6cc04a]" /> IllumED World is live
            </p>
            <h1 className="arcade-display mt-4 text-5xl leading-[0.95] md:text-7xl">
              Illum<span className="text-[#f2d9a6]">ED</span>
              <br />
              World.
            </h1>
            <p className="mt-4 text-lg leading-8 text-white/85">
              Jump into the Open World with players near you, or visit a world built by a Plus member. Catch the BL1, ride the Tube, work shifts
              and hand in homework, all while revising for real.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ContinuePlaying userId={account.id} className="arcade-btn inline-flex items-center gap-2 rounded-full bg-[#6cc04a] px-8 py-4 text-lg font-black text-[#0d1726]" />
              <Link href="/games/world" className="arcade-btn rounded-full bg-[#f2d9a6] px-8 py-4 text-lg font-black text-[#0d1726]">
                Play IllumED World →
              </Link>
              <Link href="/games/locker" className="jelly rounded-full bg-white/15 px-5 py-3 font-black backdrop-blur hover:bg-white/25">
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

      <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Shortcuts">
        {[
          { href: "/homework", title: "Homework", text: "Quests from your class", colour: "#15987f", Icon: ClipboardList },
          { href: "/practice", title: "Practice", text: "Quick questions, any subject", colour: "#2b5fd9", Icon: Gamepad2 },
          { href: "/games/locker", title: "Locker", text: "Outfits and looks", colour: "#13203a", Icon: Shirt },
        ].map(({ href, title, text, colour, Icon }) => (
          <Link key={title} href={href} className="group flex items-center gap-3 rounded-3xl border-2 border-white bg-card p-4 shadow-[0_4px_0_rgba(19,32,58,0.08)] transition hover:-translate-y-1">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white transition group-hover:rotate-[-6deg]" style={{ background: colour }}>
              <Icon className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block font-black">{title}</span>
              <span className="block text-xs text-muted-foreground">{text}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
