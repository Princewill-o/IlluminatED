import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";

import { StudyRoom } from "@/components/game/study/study-room";
import { requireAccount } from "@/lib/account/server";
import { COURSES } from "@/lib/data/courses";
import { QUESTION_BANK } from "@/lib/data/topics";
import { loadStudy } from "@/lib/game/study-server";

export const metadata: Metadata = { title: "Study Quarter" };

export default async function StudyPage() {
  const account = await requireAccount("/games/study");
  const progress = await loadStudy(account.id);
  const subjects = new Set(
    account.details.subjects.map((subject) => subject.courseId),
  );
  const questionCounts = new Map<string, number>();
  for (const question of QUESTION_BANK)
    questionCounts.set(
      question.courseId,
      (questionCounts.get(question.courseId) ?? 0) + 1,
    );
  const courses = COURSES.filter(
    (course) => (questionCounts.get(course.id) ?? 0) >= 5,
  )
    .sort(
      (a, b) =>
        Number(subjects.has(b.id)) - Number(subjects.has(a.id)) ||
        a.title.localeCompare(b.title),
    )
    .map(({ id, title, level }) => ({ id, title, level }));

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-12 sm:pt-9">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/learn"
          className="text-primary inline-flex min-h-11 items-center gap-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to Learn
        </Link>
        <Link
          href="/games/world?map=study-lobby"
          className="border-border bg-card inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Visit the Study Quarter <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <h1 className="sr-only">Study Quarter</h1>
      <div
        className="mb-6 grid grid-cols-3 gap-2 sm:gap-3"
        aria-label="Your saved study progress"
      >
        {[
          {
            icon: BookOpen,
            value: progress.sessions,
            title: "Sessions completed",
          },
          {
            icon: CheckCircle2,
            value: progress.total
              ? `${Math.round((progress.correct / progress.total) * 100)}%`
              : "—",
            title: "Study accuracy",
          },
          {
            icon: Sparkles,
            value: `${progress.correct}/${progress.total}`,
            title: "Answers correct",
          },
        ].map(({ icon: Icon, value, title }) => (
          <div
            key={title}
            className="border-border bg-card rounded-2xl border p-3 sm:flex sm:items-center sm:gap-3 sm:p-4"
          >
            <span className="mb-2 grid size-9 place-items-center rounded-xl bg-[#15987f]/10 text-[#267162] sm:mb-0">
              <Icon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-xl font-black">{value}</p>
              <p className="text-muted-foreground mt-0.5 text-[10px] font-bold sm:text-xs">
                {title}
              </p>
            </div>
          </div>
        ))}
      </div>
      {!progress.ready && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-[#d5ad58]/40 bg-[#fff5da] p-4 text-sm leading-6 text-[#725418]"
        >
          Your study progress is temporarily unavailable. Starting a session
          will check that saving is ready; if it isn’t, you can come back later
          or use your course notes.
        </p>
      )}
      <StudyRoom courses={courses} />
      <section
        aria-labelledby="study-next"
        className="border-border bg-card mt-7 flex flex-col gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf0ff] text-[#2b5fd9]">
            <Briefcase className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id="study-next" className="font-black">
              Put your learning to work.
            </h2>
            <p className="text-muted-foreground mt-1 max-w-lg text-sm leading-6">
              Practise workplace decisions in a simulated shift, build your
              in-game experience, and explore where your subjects could take
              you.
            </p>
          </div>
        </div>
        <Link
          href="/games/careers"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#13203a] px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Explore work simulations <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </main>
  );
}
