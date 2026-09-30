import Link from "next/link";

import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

import { ImportProgress } from "@/components/account/import-progress";
import { Empty, Section } from "@/components/kit";
import { timeAgo } from "@/components/social/util";
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

  const daysToExam = details.examDate
    ? Math.ceil(
        (new Date(details.examDate + "T09:00:00").getTime() - Date.now()) /
          864e5,
      )
    : null;
  const activeRequests = requests.filter(
    (r) => r.status === "open" || r.status === "matched",
  );

  return (
    <>
      <header className="border-b">
        <div className="container flex flex-wrap items-end justify-between gap-6 pt-10 pb-8 lg:pt-14">
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
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {isTutor(account) && (
              <Link
                href="/tutors/desk"
                className="hover:bg-muted rounded-md border px-4 py-2 font-medium"
              >
                Tutor desk
              </Link>
            )}
            <Link
              href="/dashboard/settings"
              className="hover:bg-muted rounded-md border px-4 py-2 font-medium"
            >
              Edit details
            </Link>
            <Link
              href="/tutors/request"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 font-semibold"
            >
              Request a tutor
            </Link>
          </div>
        </div>
        <div className="container">
          <dl className="grid grid-cols-2 border-t sm:grid-cols-4 sm:divide-x">
            {[
              [
                "Questions answered",
                data.totals.answered.toLocaleString("en-GB"),
              ],
              [
                "Correct first time",
                data.totals.answered
                  ? pct(data.totals.correct / data.totals.answered)
                  : "–",
              ],
              ["Quiz rounds this week", String(data.totals.roundsThisWeek)],
              [
                "Until your exam",
                daysToExam === null
                  ? "Not set"
                  : daysToExam < 0
                    ? "Passed"
                    : `${daysToExam} day${daysToExam === 1 ? "" : "s"}`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="py-5 sm:px-6 sm:first:pl-0">
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="container pt-8">
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
          <Empty title="You're on top of everything">
            Every topic in your subjects is secure. Try a{" "}
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
