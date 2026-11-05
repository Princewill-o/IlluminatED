import Image from "next/image";
import Link from "next/link";

import { BookOpen, ChevronRight, ClipboardList, Globe2, LayoutDashboard, Shirt, Users } from "lucide-react";
import type { Metadata } from "next";

import { AvatarFigure } from "@/components/game/avatar";
import { ContinuePlaying } from "@/components/game/world/game-menu";
import { levelProgress, levelTitle } from "@/game/core/progression";
import { loadDashboard } from "@/lib/account/dashboard";
import { estimateGrade } from "@/lib/account/estimate";
import { requireAccount } from "@/lib/account/server";
import { loadPlayer } from "@/lib/game/server";

export const metadata: Metadata = { title: { absolute: "IllumED World" } };
export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-GB");

/** A chunky title-screen button. */
function MenuLink({ href, children, tone = "stone", big }: { href: string; children: React.ReactNode; tone?: "stone" | "gold" | "green" | "violet"; big?: boolean }) {
  const tones = {
    stone: "bg-[#2a3346] text-white border-[#141a26] hover:bg-[#344059] shadow-[inset_0_2px_0_rgba(255,255,255,.12)]",
    gold: "bg-[#f2d9a6] text-[#0d1726] border-[#a8864b] hover:bg-[#f7e2b8] shadow-[inset_0_2px_0_rgba(255,255,255,.5)]",
    green: "bg-[#6cc04a] text-[#0d1726] border-[#3f7a2a] hover:bg-[#7bd158] shadow-[inset_0_2px_0_rgba(255,255,255,.35)]",
    violet: "bg-[#7a5ce6] text-white border-[#4a34a4] hover:bg-[#8a6ef0] shadow-[inset_0_2px_0_rgba(255,255,255,.25)]",
  };
  return (
    <Link href={href} className={`gloss-off flex items-center justify-center gap-2 rounded-xl border-b-[5px] px-4 font-black tracking-wide transition active:translate-y-[3px] active:border-b-2 ${big ? "min-h-14 text-lg" : "min-h-12 text-sm"} ${tones[tone]}`}>
      {children}
    </Link>
  );
}

const PANEL = "rounded-2xl border-2 border-black/40 bg-[#0b1220]/75 p-4 text-white backdrop-blur-md";

/**
 * The main menu after signing in: a game title screen. Your character on the
 * left, the things you can do in the middle, your subjects and estimated
 * grades on the right, and the learning dashboard underneath.
 */
export default async function GamesHome() {
  const account = await requireAccount("/games");
  const [player, dash] = await Promise.all([loadPlayer(account.id), loadDashboard(account.id, account.details)]);
  const lp = levelProgress(player.xp);
  const next = dash.recommendations.slice(0, 3);
  const weekGoal = 50;

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#0b1220]">
      <video className="world-menu-drift absolute inset-0 h-full w-full object-cover opacity-45" src="/landing/menu-gameplay.mp4" poster="/landing/menu-gameplay-poster.jpg" autoPlay muted loop playsInline aria-hidden tabIndex={-1} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(11,18,32,.1),rgba(11,18,32,.9)_70%)]" />

      <div className="relative mx-auto max-w-7xl px-4 pt-8 pb-12">
        {!player.ready && (
          <p className="mx-auto mb-4 max-w-xl rounded-2xl border border-[#ffd166] bg-black/40 p-3 text-center text-sm text-[#ffd166]">
            Saving isn&apos;t switched on yet, so you can play but your progress won&apos;t be kept.
          </p>
        )}

        {/* Logo */}
        <div className="flex flex-col items-center text-white">
          <div className="flex items-center gap-3">
            <Image src="/brand/lion-head.webp" alt="" width={84} height={84} className="size-14 drop-shadow-[0_6px_0_rgba(0,0,0,.35)] sm:size-20" priority />
            <h1 className="text-5xl leading-none font-black tracking-tight sm:text-7xl" style={{ textShadow: "0 4px 0 #13203a, 0 8px 0 rgba(0,0,0,.35)" }}>
              Illum<span className="text-[#f2d9a6]">ED</span>
            </h1>
          </div>
          <p className="-mt-1 text-xl font-black tracking-[0.5em] text-[#9ec5ff] uppercase sm:text-2xl" style={{ textShadow: "0 3px 0 #13203a" }}>World</p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          {/* Left: your character */}
          <aside className={`${PANEL} order-2 lg:order-1`} aria-label="Your character">
            <AvatarFigure avatar={player.avatar} size={150} className="mx-auto" />
            <p className="mt-2 text-center text-lg font-black">@{account.profile.username}</p>
            <p className="text-center text-xs text-white/65">Level {lp.level} · {levelTitle(lp.level)}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Progress to next level" aria-valuenow={Math.round(lp.fraction * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-[#6cc04a]" style={{ width: `${lp.fraction * 100}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-center text-[11px] font-bold text-white/70">
              <div className="rounded-xl bg-white/10 p-2"><p className="text-lg font-black text-[#ffd166]">{fmt(player.clout)}</p>Clout</div>
              <div className="rounded-xl bg-white/10 p-2"><p className="text-lg font-black text-[#ff8fa3]">{player.streak}</p>Day streak</div>
            </div>
            <div className="mt-3 grid gap-2">
              <MenuLink href="/games/locker" tone="violet"><Shirt className="size-4" aria-hidden /> Change your look</MenuLink>
            </div>
            {player.dailyBonusReady && <p className="mt-3 rounded-xl bg-[#ffd166]/15 p-2 text-center text-xs font-black text-[#ffd166]">Daily Grind ready: double Clout today</p>}
          </aside>

          {/* Middle: what you can do */}
          <nav className="order-1 mx-auto grid w-full max-w-md content-start gap-3 lg:order-2" aria-label="Main menu">
            <MenuLink href="/games/world" tone="gold" big><Globe2 className="size-5" aria-hidden /> Play World</MenuLink>
            <ContinuePlaying userId={account.id} className="gloss-off flex min-h-12 items-center justify-center gap-2 rounded-xl border-b-[5px] border-[#3f7a2a] bg-[#6cc04a] px-4 text-sm font-black text-[#0d1726] hover:bg-[#7bd158]" />
            <div className="grid grid-cols-2 gap-3">
              <MenuLink href="/courses"><BookOpen className="size-4" aria-hidden /> Learn</MenuLink>
              <MenuLink href="/games/quests"><ClipboardList className="size-4" aria-hidden /> Quests</MenuLink>
              <MenuLink href="/games/friends"><Users className="size-4" aria-hidden /> Friends</MenuLink>
              <MenuLink href="/dashboard"><LayoutDashboard className="size-4" aria-hidden /> Dashboard</MenuLink>
            </div>
          </nav>

          {/* Right: subjects and estimated grades */}
          <aside className={`${PANEL} order-3`} aria-labelledby="subjects-title">
            <h2 id="subjects-title" className="text-sm font-black tracking-widest text-[#9ec5ff] uppercase">Your subjects</h2>
            {!dash.subjects.length && (
              <p className="mt-3 text-sm text-white/70">You haven&apos;t picked any subjects yet. <Link href="/dashboard/settings" className="font-black text-[#f2d9a6] underline">Add your subjects</Link> to see your progress and an estimated grade.</p>
            )}
            <ul className="mt-3 grid gap-3">
              {dash.subjects.map((s) => {
                const answered = s.topics.reduce((n, t) => n + t.seen, 0);
                const est = estimateGrade(s.course.route, { accuracy: s.accuracy, started: s.started, topics: s.topics.length, answered });
                return (
                  <li key={s.course.id}>
                    <Link href={`/courses/${s.course.id}`} className="block rounded-xl bg-white/5 p-3 transition hover:bg-white/10">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate font-black">{s.course.subject}</span>
                          <span className="block text-[11px] text-white/60">{s.started}/{s.topics.length} topics started{s.accuracy !== null && ` · ${Math.round(s.accuracy * 100)}% right`}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block rounded-lg bg-[#f2d9a6] px-2 py-0.5 text-lg leading-tight font-black text-[#0d1726]">{est?.grade ?? "?"}</span>
                          <span className="block text-[10px] text-white/50">estimate</span>
                        </span>
                      </span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
                        <span className="block h-full rounded-full bg-[#9ec5ff]" style={{ width: `${s.topics.length ? Math.max(3, (s.started / s.topics.length) * 100) : 0}%` }} />
                      </span>
                      <span className="mt-1 block text-[11px] text-white/60">
                        {est ? (est.next ? `Keep practising to reach ${est.next}${est.confidence === "low" ? " · answer more for a better estimate" : ""}` : "Top grade. Keep it fresh!") : "Answer a few questions to get an estimate"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[10px] leading-4 text-white/45">Estimates are what you might get if you sat the exam today, worked out from your practice here. They aren&apos;t official predictions.</p>
          </aside>
        </div>

        {/* Learning dashboard */}
        <section className="mt-6 grid gap-4 lg:grid-cols-2" aria-label="Learning dashboard">
          <div className={PANEL}>
            <h2 className="text-sm font-black tracking-widest text-[#9ec5ff] uppercase">Learn next</h2>
            {!next.length && <p className="mt-3 text-sm text-white/70">Pick a subject and try a few questions. We&apos;ll suggest topics from there.</p>}
            <ul className="mt-3 grid gap-2">
              {next.map((r) => (
                <li key={`${r.stat.course.id}-${r.stat.topic.id}`}>
                  <Link href={`/courses/${r.stat.course.id}/${r.stat.topic.id}`} className="flex items-center gap-2 rounded-xl bg-white/5 p-2.5 hover:bg-white/10">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">{r.stat.topic.title}</span>
                      <span className="block truncate text-[11px] text-white/60">{r.stat.course.subject} · {r.reason}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-white/50" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className={PANEL}>
            <h2 className="text-sm font-black tracking-widest text-[#9ec5ff] uppercase">This week</h2>
            <p className="mt-3 text-4xl font-black">{dash.thisWeekAnswered}<span className="text-base text-white/60"> / {weekGoal} questions</span></p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15" aria-hidden><div className="h-full bg-[#ffd166]" style={{ width: `${Math.min(100, (dash.thisWeekAnswered / weekGoal) * 100)}%` }} /></div>
            <div className="mt-4 grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold text-white/65">
              <div className="rounded-lg bg-white/5 p-1.5"><p className="text-base font-black text-white">{dash.mastery["not-started"]}</p>New</div>
              <div className="rounded-lg bg-white/5 p-1.5"><p className="text-base font-black text-[#ff8fa3]">{dash.mastery["needs-work"]}</p>Needs work</div>
              <div className="rounded-lg bg-white/5 p-1.5"><p className="text-base font-black text-[#ffd166]">{dash.mastery["getting-there"]}</p>Getting there</div>
              <div className="rounded-lg bg-white/5 p-1.5"><p className="text-base font-black text-[#6cc04a]">{dash.mastery.secure}</p>Secure</div>
            </div>
            <p className="mt-3 text-xs text-white/60">Every question you get right in the world or here earns XP and Clout.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
