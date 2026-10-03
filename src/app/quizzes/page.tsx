import Link from "next/link";

import type { Metadata } from "next";

import { Note, PageHeader, Section } from "@/components/kit";
import { type Mode, QuizPlayer } from "@/components/quiz-player";
import { getAccount } from "@/lib/account/server";
import { COURSES } from "@/lib/data/courses";
import { ROUTES } from "@/lib/data/routes";
import { QUESTION_BANK, topicById } from "@/lib/data/topics";
import { getSupabase } from "@/lib/social/server";
import type { RouteId } from "@/lib/types";

export const metadata: Metadata = {
  title: "Quiz centre",
  description:
    "Quick practice, topic review, mixed and timed quizzes with an explanation for every answer.",
};

export default async function QuizzesPage({
  searchParams,
}: {
  searchParams: Promise<{
    route?: string;
    course?: string;
    mode?: string;
    topic?: string;
  }>;
}) {
  const sp = await searchParams;
  const account = await getAccount();
  const sb = account ? await getSupabase() : null;
  const saved =
    sb && account
      ? await sb
          .from("question_progress")
          .select("question_key, seen, correct, last_at")
          .eq("user_id", account.id)
          .limit(5000)
      : null;
  const initialProgress = Object.fromEntries(
    (saved?.data ?? []).map((p) => [
      p.question_key,
      { seen: p.seen, correct: p.correct, last: Date.parse(p.last_at) },
    ]),
  );
  const route = ROUTES.some((r) => r.id === sp.route)
    ? (sp.route as RouteId)
    : undefined;
  const topic = sp.topic ? topicById(sp.topic) : undefined;
  const course = COURSES.find((c) => c.id === (topic?.courseId ?? sp.course));
  const mode = ["quick", "topic", "mixed", "timed"].includes(sp.mode ?? "")
    ? (sp.mode as Mode)
    : undefined;
  return (
    <>
      <PageHeader
        title="Quiz centre"
        intro={`${QUESTION_BANK.length} questions written by IlluminatED, each with an explanation. Choose how you want to practise.`}
        crumbs={[{ label: "Home", href: "/" }, { label: "Quiz centre" }]}
      />
      <Section rule={false}>
        <QuizPlayer
          key={`${route}-${course?.id}-${mode}-${topic?.id}`}
          studySubjects={account?.details?.subjects}
          userId={account?.id}
          initialProgress={initialProgress}
          initialRoute={course?.route ?? route}
          initialCourse={course?.id}
          initialMode={mode}
          initialTopic={topic?.id}
        />
        <p className="mt-6 text-sm">
          <Link
            className="text-primary underline"
            href={course ? `/courses/${course.id}#curriculum` : "/courses"}
          >
            Find board and tier-specific topics, lesson quizzes and videos
          </Link>
        </p>
        <Note className="mt-8">
          These are short practice questions, not exam papers, and your score
          isn't a predicted grade. For full exam practice, use your board's past
          papers and mark schemes.
        </Note>
      </Section>
    </>
  );
}
