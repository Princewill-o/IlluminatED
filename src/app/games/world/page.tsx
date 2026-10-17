import type { Metadata } from "next";

import { WorldApp } from "@/components/game/world/world-app";
import { uniformFor, workplaceById } from "@/game/core/careers";
import { homeById } from "@/game/core/homes";
import { requireAccount } from "@/lib/account/server";
import { listOrgs, myMembership, staffFor } from "@/lib/employers/server";
import { loadCareer, loadHome } from "@/lib/game/careers-server";
import { loadPlayer } from "@/lib/game/server";
import { worldPass } from "@/lib/game/world-pass";
import { loadMyHomework } from "@/lib/school/server";
import { getSupabase } from "@/lib/social/server";

export const metadata: Metadata = { title: "Worlds" };

export default async function WorldPage({ searchParams }: { searchParams: Promise<{ map?: string; server?: string }> }) {
  const { map, server } = await searchParams;
  const account = await requireAccount("/games/world");
  const [player, orgs, membership, career, home, homework] = await Promise.all([loadPlayer(account.id), listOrgs(), myMembership(account.id), loadCareer(account.id), loadHome(account.id), loadMyHomework(account.id)]);
  const sbCars = await getSupabase();
  const cars = sbCars ? (((await sbCars.from("player_cars").select("car").eq("user_id", account.id)).data ?? []) as { car: string }[]).map((r) => r.car) : [];
  const a = career.active;
  const job = a ? { workplace: a.workplace, role: a.role, rank: a.rank, shifts: a.shifts, rankShifts: a.rankShifts, rankCorrect: a.rankCorrect, rankTotal: a.rankTotal } : null;
  const staff = await staffFor(orgs.map((o) => o.id));
  const bySlug = Object.fromEntries(orgs.map((o) => [o.slug, (staff[o.id] ?? []).map(({ userId, username, title }) => ({ userId, username, title }))]));

  // The logo on your back: the company where you've climbed highest (then best score).
  const badge =
    Object.entries(player.companies)
      .filter(([, c]) => c.shifts > 0)
      .sort(([, a], [, b]) => b.bestRank - a.bestRank || b.bestScore - a.bestScore)[0]?.[0] ?? null;
  const org = membership?.org.name ?? null;
  const { pass, publicKey } = worldPass({ id: account.id, username: account.profile.username, org, badge });

  const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/London" });
  const quests = [
    ...homework
      .filter((h) => !h.mine || new Date(h.dueAt) > new Date())
      .slice(0, 3)
      .map((h) => ({ id: h.id, title: `${h.className}: ${h.title}`, tag: "Homework", due: h.mine ? "Done" : `Due ${day(h.dueAt)}`, href: `/homework/${h.id}`, done: Boolean(h.mine) })),
    a
      ? { id: "shift", title: `Work a shift at ${workplaceById(a.workplace)?.name ?? "work"}`, tag: "Job", href: "/games/careers" }
      : { id: "job", title: "Get a job at the job centre", tag: "Job", href: "/games/careers" },
    { id: "bus", title: "Revise on the bus (walk to a bus stop)", tag: "Daily" },
    { id: "arcade", title: "Beat your best in the Arcade", tag: "Daily", href: "/games/arcade" },
  ];

  return (
    <WorldApp
      me={{ id: account.id, username: account.profile.username, avatar: uniformFor(job, player.avatar), org, badge, pass, publicKey }}
      offices={orgs.map(({ slug, name, sector, accent }) => ({ slug, name, sector, accent }))}
      staff={bySlug}
      initialMap={map ?? "city"}
      initialServer={server ?? null}
      job={job}
      clout={player.clout}
      quests={quests}
      cars={cars}
      homeworkDone={homework.filter((h) => h.mine).length}
      xp={player.xp}
      homework={homework.filter((h) => !h.mine).flatMap((h) => h.questions.map((q) => q.key))}
      home={{ style: homeById(home.current)?.style ?? 0, layout: home.layout }}
    />
  );
}
