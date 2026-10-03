import Link from "next/link";

import type { DashboardData } from "@/lib/account/dashboard";
import type { LearnerDetails } from "@/lib/account/details";
import { COURSES } from "@/lib/data/courses";
import { BOARDS } from "@/lib/data/routes";
import { resourcesForCourse } from "@/lib/education/resources";

export function ReadinessPanel({
  data,
  details,
}: {
  data: DashboardData;
  details: LearnerDetails;
}) {
  return (
    <section className="container py-8" aria-labelledby="readiness-title">
      <h2 id="readiness-title" className="text-2xl">
        Your exam preparation
      </h2>
      <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
        Learn a topic, practise, review mistakes, then try a timed round. These
        scores measure readiness for our available practice bank, not a
        predicted grade or your chance of passing the full exam.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {data.readiness.map(({ courseId, result: r }) => {
          const course = COURSES.find((c) => c.id === courseId)!;
          const subject = details.subjects.find(
            (s) => s.courseId === courseId,
          )!;
          const board =
            subject.board !== "unsure" ? BOARDS[subject.board] : null;
          const tools = resourcesForCourse(courseId);
          return (
            <article
              key={courseId}
              className="bg-card space-y-4 rounded-2xl border p-5"
            >
              <h3 className="font-semibold">
                {course.title} · {board?.short ?? "Confirm your exam board"}
              </h3>
              <p className="text-3xl font-semibold">
                {data.loadError
                  ? "Unavailable"
                  : r.score === null
                    ? "Not assessed yet"
                    : `${r.score}%`}
                <span className="text-muted-foreground block text-sm font-normal">
                  Practice readiness
                </span>
              </p>
              <p className="text-sm">
                {r.attempted}/{r.available} available questions attempted ·{" "}
                {r.secure} secure
                {r.accuracy === null
                  ? ""
                  : ` · ${r.accuracy}% first-attempt accuracy`}
              </p>
              {!r.available && (
                <p className="text-sm">
                  We don't yet have matching practice questions for this course
                  and board. Use the specification, lessons and official
                  assessments below.
                </p>
              )}
              <div className="text-primary flex flex-wrap gap-3 text-sm">
                <Link
                  href={`/courses/${courseId}#curriculum`}
                  className="underline"
                >
                  Learn and check topics
                </Link>
                {r.available > 0 && (
                  <>
                    <Link
                      href={`/quizzes?course=${courseId}&mode=mixed`}
                      className="underline"
                    >
                      Practise weak areas
                    </Link>
                    <Link
                      href={`/quizzes?course=${courseId}&mode=timed`}
                      className="underline"
                    >
                      Timed practice
                    </Link>
                  </>
                )}
                <a
                  href={
                    board?.pastPapers ??
                    course.officialLinks[0]?.url ??
                    "/resources"
                  }
                  className="underline"
                >
                  Official papers and assessments
                </a>
              </div>
              <p className="text-muted-foreground text-xs">
                Use the exact specification code, tier and options set by your
                school. Complete a full paper under exam conditions and mark it
                using the official scheme.
              </p>
              {tools.length > 0 && (
                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium">
                    Other tools for this subject
                  </h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    {tools.map((t) => (
                      <li key={t.url}>
                        <a className="text-primary underline" href={t.url}>
                          {t.provider}: {t.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Supplementary resources; check suitability for your
                    specification.
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium">
          How is readiness calculated?
        </summary>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          The score is the percentage of matching questions that are secure. A
          question needs at least two attempts, at least 80% correct on first
          attempts, and practice in the last 14 days. Unseen questions count
          against the score; repeats do not expand coverage. Even 100% covers
          only this small practice bank. Official papers, written answers and
          teacher feedback are needed to judge full exam readiness.
        </p>
      </details>
    </section>
  );
}
