import type { Metadata } from "next";

import { WorldApp } from "@/components/game/world/world-app";
import { affiliationFor } from "@/game/core/affiliation";
import { awardsFor } from "@/game/core/awards";
import { uniformFor, workplaceById } from "@/game/core/careers";
import { homeById } from "@/game/core/homes";
import { requireAccount } from "@/lib/account/server";
import { COURSES } from "@/lib/data/courses";
import { QUESTION_BANK } from "@/lib/data/topics";
import { listOrgs, myMembership, staffFor } from "@/lib/employers/server";
import { loadCareer, loadHome } from "@/lib/game/careers-server";
import { loadPlayer } from "@/lib/game/server";
import { loadStudy } from "@/lib/game/study-server";
import { worldPass } from "@/lib/game/world-pass";
import { loadMyHomework } from "@/lib/school/server";
import { getSupabase } from "@/lib/social/server";

export const metadata: Metadata = { title: "Worlds" };

export default async function WorldPage({ searchParams }: { searchParams: Promise<{ map?: string; server?: string; build?: string }> }) {
  const { map, server, build } = await searchParams;
  const account = await requireAccount("/games/world");
  const organisations = listOrgs();
  const staffRequest = organisations.then(orgs => staffFor(orgs.map(org => org.id)));
  const carsRequest = (async () => {
    const sb = await getSupabase();
    if (!sb) return [] as string[];
    const result = await sb.from("player_cars").select("car").eq("user_id", account.id);
    return ((result.data ?? []) as {car:string}[]).map(row => row.car);
  })();
  const [player, orgs, membership, career, home, homework, learning, staff, cars] = await Promise.all([loadPlayer(account.id), organisations, myMembership(account.id), loadCareer(account.id), loadHome(account.id), loadMyHomework(account.id), loadStudy(account.id), staffRequest, carsRequest]);
  const preferred = new Set(account.details.subjects.map((subject) => subject.courseId));
  const studyCourses = COURSES.filter((course) => QUESTION_BANK.filter((question) => question.courseId === course.id).length >= 5)
    .sort((a, b) => Number(preferred.has(b.id)) - Number(preferred.has(a.id)) || a.title.localeCompare(b.title))
    .map(({ id, title, level }) => ({ id, title, level }));
  const awards = awardsFor({
    studySessions: learning.sessions, studyCorrect: learning.correct, studiedCourses: learning.courses.length,
    careerShifts: career.history.reduce((sum, record) => sum + record.shifts, 0),
    careerCorrect: career.history.reduce((sum, record) => sum + record.correct, 0),
    careerTotal: career.history.reduce((sum, record) => sum + record.total, 0),
    careerWorkplaces: new Set(career.history.filter((record) => record.shifts > 0).map((record) => record.workplace)).size,
  });
  const a = career.active;
  const job = a ? { workplace: a.workplace, role: a.role, rank: a.rank, shifts: a.shifts, rankShifts: a.rankShifts, rankCorrect: a.rankCorrect, rankTotal: a.rankTotal } : null;
  const bySlug = Object.fromEntries(orgs.map((o) => [o.slug, (staff[o.id] ?? []).map(({ userId, username, title }) => ({ userId, username, title }))]));

  // The logo on your back: the company where you've climbed highest (then best score).
  const achievementBadge =
    Object.entries(player.companies)
      .filter(([, c]) => c.shifts > 0)
      .sort(([, a], [, b]) => b.bestRank - a.bestRank || b.bestScore - a.bestScore)[0]?.[0] ?? null;
  const org = membership?.org.name ?? null;
  const occupation = a ? { workplace: a.workplace, role: a.role } : null;
  const subject = COURSES.find(c => c.id === account.details.subjects[0]?.courseId)?.subject ?? null;
  const affiliation = affiliationFor(occupation, subject, membership ? { name: membership.org.name, slug: membership.org.slug } : null);
  const badge = affiliation?.kind === "work" ? affiliation.logo : achievementBadge;
  const { pass, publicKey } = worldPass({ id: account.id, username: account.profile.username, org, badge, occupation, affiliation });

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
    { id: "study-room", title: "Complete a subject session in the Study Quarter", tag: "Study", href: "/games/study" },
    { id: "arcade", title: "Beat your best in the Arcade", tag: "Daily", href: "/games/arcade" },
  ];

  return (
    <WorldApp
      wantedResetToken={account.id === "f418310b-07f5-4865-aa4c-38cf126a3ef1" ? "developer-20261017" : undefined}
      me={{ id: account.id, username: account.profile.username, avatar: uniformFor(job, player.avatar), org, badge, pass, publicKey, affiliation }}
      offices={orgs.map(({ slug, name, sector, accent }) => ({ slug, name, sector, accent }))}
      staff={bySlug}
      initialMap={map ?? "city"}
      initialBuild={build === "1"}
      initialServer={server ?? null}
      job={job}
      clout={player.clout}
      quests={quests}
      cars={cars}
      homeworkDone={homework.filter((h) => h.mine).length}
      studyCourses={studyCourses}
      awards={awards}
      xp={player.xp}
      homework={homework.filter((h) => !h.mine).flatMap((h) => h.questions.map((q) => q.key))}
      home={{ ...home, style: homeById(home.current)?.style ?? 0 }}
    />
  );
}
