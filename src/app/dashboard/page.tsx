import Link from "next/link";

import { ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { ImportProgress } from "@/components/account/import-progress";
import { ReadinessPanel } from "@/components/account/readiness-panel";
import {
  ExamCountdown,
  MasteryChart,
  SubjectChart,
  WeeklyChart,
} from "@/components/dashboard/widgets";
import { Empty, Section } from "@/components/kit";
import { NextSteps } from "@/components/next-steps";
import { Q4CampaignArtwork } from "@/components/q4-campaign-artwork";
import { timeAgo } from "@/components/social/util";
import { StudyTimer } from "@/components/study-timers";
import { TiggyTour, TourButton } from "@/components/tiggy-tour";
import {
  loadDashboard,
  STATUS_TEXT,
  type TopicStat,
  type TopicStatus,
} from "@/lib/account/dashboard";
import { stageLabel, yearLabel } from "@/lib/account/details";
import { isTutor, requireAccount } from "@/lib/account/server";
import { TOPICS } from "@/lib/data/topics";
import { STATUS_LABELS, helpLabel, speedLabel } from "@/lib/tutoring";
import { listMyRequests } from "@/lib/tutoring-server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your dashboard" };
export const dynamic = "force-dynamic";

const pct = (n: number | null) =>
  n === null ? "–" : `${Math.round(n * 100)}%`;

const STATUS_CLS: Record<TopicStatus, string> = {
  "not-started": "text-muted-foreground",
  "needs-work": "text-destructive",
  "getting-there": "text-warm-text",
  secure: "text-success",
};

function Bar({ value }: { value: number | null }) {
  return (
    <span
      className="bg-border relative block h-1.5 w-full overflow-hidden rounded-full"
      aria-hidden
    >
      {value !== null && (
        <span
          className="bg-primary absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${Math.max(3, Math.round(value * 100))}%` }}
        />
      )}
    </span>
  );
}

function TopicRow({ s }: { s: TopicStat }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_7rem_5rem]">
      <Link
        href={`/courses/${s.course.id}/${s.topic.id}`}
        className="hover:text-primary min-w-0 text-sm font-medium"
      >
        {s.topic.title}
        {s.flagged && (
          <span className="text-muted-foreground ml-2 text-xs font-normal">
            You asked for help
          </span>
        )}
      </Link>
      <span
        className={cn(
          "text-xs font-medium sm:order-last sm:text-right",
          STATUS_CLS[s.status],
        )}
      >
        {STATUS_TEXT[s.status]}
      </span>
      <span className="col-span-2 sm:col-span-1">
        <Bar value={s.accuracy} />
      </span>
      <span className="text-muted-foreground hidden text-xs tabular-nums sm:block">
        {s.answered}/{s.questions} questions · {pct(s.accuracy)}
      </span>
    </li>
  );
}

export default async function DashboardPage() {
  const account = await requireAccount("/dashboard");
  const { details, profile } = account;
  const [data, requests] = await Promise.all([
    loadDashboard(account.id, details),
    listMyRequests(account.id),
  ]);

  const activeRequests = requests.filter(
    (r) => r.status === "open" || r.status === "matched",
  );

  return (
    <>
      <TiggyTour userId={account.id} name={profile.username} />
      <div className="container pt-6 lg:pt-10">
        <Q4CampaignArtwork compact />
      </div>
      <header className="container pt-6 pb-8 lg:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-muted-foreground text-sm">
              {stageLabel(details.stage)} · {yearLabel(details.yearGroup)} ·{" "}
              {details.subjects.length} subject
              {details.subjects.length === 1 ? "" : "s"}
            </p>
            <h1 className="mt-2 text-4xl tracking-tight md:text-5xl">
              Hi, {profile.username}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {isTutor(account) && (
              <Link
                href="/tutors/desk"
                className="hover:bg-muted rounded-full border px-4 py-2 font-medium"
              >
                Tutor desk
              </Link>
            )}
            <TourButton className="hover:bg-muted rounded-full border px-4 py-2 font-medium" />
            <Link
              href="/calculator"
              className="hover:bg-muted rounded-full border px-4 py-2 font-medium"
            >
              Grade calculator
            </Link>
            <Link
              href="/dashboard/settings"
              className="hover:bg-muted rounded-full border px-4 py-2 font-medium"
            >
              Edit details
            </Link>
            <Link
              href="/tutors/request"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 py-2 font-semibold"
            >
              Request a tutor
            </Link>
          </div>
        </div>
        <div className="mt-8">
          <ExamCountdown
            examDate={details.examDate}
            examLabel={
              details.examDate
                ? new Date(`${details.examDate}T12:00:00Z`).toLocaleDateString(
                    "en-GB",
                    {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "Europe/London",
                    },
                  )
                : null
            }
            qualification={stageLabel(details.stage)}
            thisWeekAnswered={data.thisWeekAnswered}
          />
        </div>
      </header>

      <ReadinessPanel data={data} details={details} />

      <section className="container grid gap-5 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" aria-label="Study tools and community">
        <StudyTimer mode="pomodoro" />
        <div className="relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-sky-50 via-white to-violet-100 p-7 text-slate-950">
          <div aria-hidden className="absolute -right-8 -top-8 size-36 rounded-full bg-yellow-300/60" />
          <div aria-hidden className="absolute bottom-6 right-8 size-16 rotate-12 rounded-2xl bg-blue-300/60" />
          <p className="relative text-xs font-bold uppercase tracking-widest text-blue-700">One account, more ways to grow</p>
          <h2 className="relative mt-3 text-2xl font-bold">Meet IlluminatED Social</h2>
          <p className="relative mt-3 max-w-sm text-sm leading-6 text-slate-700">Ask students about sixth form, university and apprenticeships, swap advice, and explore what comes next.</p>
          <div className="relative mt-6 flex flex-wrap gap-2">
            <Link href="/social" className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-bold text-white">Explore Social</Link>
            <Link href="/exam-mode" className="rounded-full border border-blue-700 px-5 py-2.5 text-sm font-bold text-blue-800">Open exam mode</Link>
          </div>
          <p className="relative mt-6 text-xs font-semibold text-violet-800">Study games are coming soon 🎮</p>
        </div>
      </section>

      <Section id="next-steps" title="Plan what comes next" rule={false}>
        <NextSteps
          userId={account.id}
          initialYear={details.yearGroup}
          compact
        />
      </Section>

      <div className="container">
        <Link
          href="/tiggy"
          className="group bg-card hover:border-primary/60 mb-6 flex items-center gap-4 rounded-2xl border p-4 sm:p-5"
        >
          <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-full">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="group-hover:text-primary block font-semibold">
              Ask Tiggy
            </span>
            <span className="text-muted-foreground block text-sm">
              Stuck on something? Get a step-by-step explanation or a hint from
              your AI study helper.
            </span>
          </span>
          <ArrowRight
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden
          />
        </Link>
        <ImportProgress
          userId={account.id}
          topicCourses={Object.fromEntries(
            TOPICS.map((t) => [t.id, t.courseId]),
          )}
        />
        {data.loadError && (
          <p role="alert" className="text-destructive text-sm">
            Some of your progress couldn't be loaded. Refresh the page to try
            again.
          </p>
        )}
      </div>

      <section aria-labelledby="progress-title" className="container pt-6 pb-4">
        <h2 id="progress-title" className="sr-only">
          Your progress
        </h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="bg-card rounded-3xl border p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-semibold">Practice each week</h3>
              <span className="text-muted-foreground text-xs">
                Last 8 weeks
              </span>
            </div>
            <dl className="mt-3 flex gap-6 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Answered</dt>
                <dd className="text-xl font-semibold tabular-nums">
                  {data.totals.answered.toLocaleString("en-GB")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  Correct first time
                </dt>
                <dd className="text-xl font-semibold tabular-nums">
                  {data.totals.answered
                    ? pct(data.totals.correct / data.totals.answered)
                    : "–"}
                </dd>
              </div>
            </dl>
            <div className="mt-5">
              <WeeklyChart weeks={data.weekly} />
            </div>
          </div>
          <div className="bg-card rounded-3xl border p-6">
            <h3 className="font-semibold">Score by subject</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Correct first time in practice questions
            </p>
            <div className="mt-5">
              {data.subjects.length ? (
                <SubjectChart
                  rows={data.subjects.map((s) => ({
                    name: s.course.subject,
                    accuracy: s.accuracy,
                    answered: s.topics.reduce((a, t) => a + t.seen, 0),
                  }))}
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Add subjects in your details to see them here.
                </p>
              )}
            </div>
          </div>
          <div className="bg-card rounded-3xl border p-6">
            <h3 className="font-semibold">Topic mastery</h3>
            <p className="text-muted-foreground mt-1 mb-5 text-xs">
              Across the topics in your subjects
            </p>
            <MasteryChart counts={data.mastery} />
          </div>
        </div>
      </section>

      <Section
        id="next"
        title="Revise next"
        intro="Picked from the topics you asked for help with, your quiz scores, and what you haven't tried yet."
        rule={false}
      >
        {data.recommendations.length ? (
          <ol className="divide-y border-y">
            {data.recommendations.map(({ stat, reason }, i) => (
              <li
                key={stat.topic.id}
                className="grid gap-x-6 gap-y-3 py-5 md:grid-cols-[2rem_minmax(0,1fr)_auto] md:items-center"
              >
                <span className="text-muted-foreground hidden text-sm tabular-nums md:block">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{stat.topic.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {stat.course.title} · {reason}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <Link
                    href={`/courses/${stat.course.id}/${stat.topic.id}`}
                    className="hover:bg-muted rounded-md border px-3.5 py-2 font-medium"
                  >
                    Read topic
                  </Link>
                  <Link
                    href={`/quizzes?topic=${stat.topic.id}`}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3.5 py-2 font-semibold"
                  >
                    Quiz it
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        ) : data.subjects.some((s) => s.topics.length) ? (
          <Empty title="Strong scores in the available topics">
            Your practised topics have strong scores. Check the full
            specification for untested areas, and try a{" "}
            <Link
              href="/quizzes?mode=mixed"
              className="text-primary underline underline-offset-4"
            >
              mixed retrieval round
            </Link>{" "}
            to keep it that way.
          </Empty>
        ) : (
          <Empty title="No topic pages for your subjects yet">
            We're adding topics over time. Meanwhile, use your{" "}
            <Link
              href="/resources"
              className="text-primary underline underline-offset-4"
            >
              board's past papers
            </Link>{" "}
            or{" "}
            <Link
              href="/tutors/request"
              className="text-primary underline underline-offset-4"
            >
              ask a tutor
            </Link>
            .
          </Empty>
        )}
      </Section>

      <Section id="subjects" title="Your subjects">
        <div className="space-y-12">
          {data.subjects.map((s) => (
            <div key={s.course.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b pb-3">
                <h3 className="text-lg font-semibold">
                  <Link
                    href={`/courses/${s.course.id}`}
                    className="hover:text-primary"
                  >
                    {s.course.title}
                  </Link>
                  {s.board && (
                    <span className="text-muted-foreground ml-2 text-sm font-normal">
                      {s.board}
                    </span>
                  )}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {s.topics.length
                    ? `${s.started} of ${s.topics.length} topic${s.topics.length === 1 ? "" : "s"} started${s.accuracy === null ? "" : ` · ${pct(s.accuracy)} correct`}`
                    : "No topic pages yet"}
                </p>
              </div>
              {s.topics.length ? (
                <ul className="divide-y">
                  {s.topics.map((t) => (
                    <TopicRow key={t.topic.id} s={t} />
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground py-4 text-sm">
                  See the{" "}
                  <Link
                    href={`/courses/${s.course.id}`}
                    className="text-primary underline underline-offset-4"
                  >
                    course page
                  </Link>{" "}
                  for what's covered and official past papers.
                </p>
              )}
            </div>
          ))}
          {data.otherTopics.length > 0 && (
            <div>
              <h3 className="border-b pb-3 text-lg font-semibold">
                Other topics you've practised
              </h3>
              <ul className="divide-y">
                {data.otherTopics.map((t) => (
                  <TopicRow key={t.topic.id} s={t} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      <div className="container grid gap-x-16 lg:grid-cols-2">
        <section
          aria-labelledby="rounds-title"
          className="border-foreground/80 border-t py-10"
        >
          <div className="mb-6 flex items-baseline justify-between">
            <h2 id="rounds-title" className="text-2xl tracking-tight">
              Recent quizzes
            </h2>
            <Link href="/quizzes" className="text-primary text-sm font-medium">
              Quiz centre
            </Link>
          </div>
          {data.rounds.length ? (
            <ul className="divide-y border-y text-sm">
              {data.rounds.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span>
                    {r.mode === "import"
                      ? "Added from this device"
                      : `${r.mode[0].toUpperCase()}${r.mode.slice(1)} round`}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {timeAgo(r.createdAt)}
                    </span>
                  </span>
                  <span className="tabular-nums">
                    {r.correct}/{r.total}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Finish a quiz while signed in and it'll show here.
            </p>
          )}
        </section>

        <section
          aria-labelledby="tutor-title"
          className="border-foreground/80 border-t py-10"
        >
          <div className="mb-6 flex items-baseline justify-between">
            <h2 id="tutor-title" className="text-2xl tracking-tight">
              Tutoring
            </h2>
            <Link href="/tutors" className="text-primary text-sm font-medium">
              How it works
            </Link>
          </div>
          {requests.length ? (
            <ul className="divide-y border-y text-sm">
              {requests.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/tutors/requests/${r.id}`}
                    className="group flex items-center justify-between gap-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="group-hover:text-primary block truncate font-medium">
                        {helpLabel(r.helpType)}: {r.subject}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {speedLabel(r.speed)} · {timeAgo(r.createdAt)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs">
                      {STATUS_LABELS[r.status]}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm leading-relaxed">
              Stuck on homework, planning coursework or preparing for an exam? A
              tutor can help one to one.
            </p>
          )}
          {activeRequests.length === 0 && (
            <Link
              href="/tutors/request"
              className="text-primary mt-5 inline-flex items-center gap-1.5 text-sm font-semibold"
            >
              Request a tutor <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </section>
      </div>

      <div className="container pb-16">
        <p className="text-muted-foreground border-t pt-6 text-sm">
          Scores are from IlluminatED practice questions and aren't predicted
          grades. Your forum name is{" "}
          <Link
            href={`/social/u/${profile.username}`}
            className="text-primary underline underline-offset-4"
          >
            {profile.username}
          </Link>{" "}
          on IlluminatEDSocial.
        </p>
      </div>
    </>
  );
}
