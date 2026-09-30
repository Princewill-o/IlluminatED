import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { PageHeader } from "@/components/kit";
import { QuizPlayer } from "@/components/quiz-player";
import { RecordVisit, TopicTools } from "@/components/widgets";
import { COURSES, courseById } from "@/lib/data/courses";
import { routeById } from "@/lib/data/routes";
import { topicById } from "@/lib/data/topics";

export function generateStaticParams() {
  return COURSES.flatMap((c) =>
    c.topicIds.map((t) => ({ courseId: c.id, topicId: t })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string; topicId: string }>;
}): Promise<Metadata> {
  const { courseId, topicId } = await params;
  const t = topicById(topicId);
  const c = courseById(courseId);
  return t && c
    ? { title: `${t.title} (${c.title})`, description: t.summary }
    : {};
}

const H2 = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="scroll-mt-24 text-2xl tracking-tight">
    {children}
  </h2>
);

export default async function TopicPage({
  params,
}: {
  params: Promise<{ courseId: string; topicId: string }>;
}) {
  const { courseId, topicId } = await params;
  const c = courseById(courseId);
  const t = topicById(topicId);
  if (!c || !t || !c.topicIds.includes(t.id)) notFound();
  const r = routeById(c.route);
  const reviewed = new Date(t.reviewed).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const toc = [
    { id: "objectives", label: "What you'll learn" },
    { id: "explanation", label: "Explanation" },
    ...(t.workedExample ? [{ id: "example", label: "Worked example" }] : []),
    { id: "terms", label: "Key terms" },
    { id: "mistakes", label: "Common mistakes" },
    { id: "check", label: "Check yourself" },
    { id: "quiz", label: "Quiz" },
  ];

  return (
    <>
      <RecordVisit
        href={`/courses/${c.id}/${t.id}`}
        title={t.title}
        kind="topic"
      />
      <PageHeader
        title={t.title}
        intro={t.summary}
        crumbs={[
          { label: "Home", href: "/" },
          { label: r.name, href: r.href },
          { label: c.subject, href: `/courses/${c.id}` },
          { label: t.title },
        ]}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <TopicTools topicId={t.id} courseId={c.id} />
          <p className="text-muted-foreground text-sm">
            Written by IlluminatED, reviewed {reviewed}. Not exam-board
            material, so compare it with your specification.
          </p>
        </div>
      </PageHeader>

      <div className="container grid gap-12 py-12 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="On this page" className="no-print hidden lg:block">
          <div className="sticky top-24">
            <p className="text-muted-foreground mb-3 text-xs font-medium">
              On this page
            </p>
            <ul className="space-y-2 text-sm">
              {toc.map((i) => (
                <li key={i.id}>
                  <a
                    href={`#${i.id}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {i.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <article className="max-w-[68ch] min-w-0 space-y-14 text-[1.0625rem] leading-relaxed">
          <section aria-labelledby="objectives">
            <H2 id="objectives">What you'll learn</H2>
            <ul className="mt-4 list-disc space-y-1.5 pl-5">
              {t.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="explanation">
            <H2 id="explanation">Explanation</H2>
            <div className="mt-4 space-y-4">
              {t.explanation.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>

          {t.workedExample && (
            <section aria-labelledby="example">
              <H2 id="example">Worked example</H2>
              <div className="bg-card mt-4 rounded-xl border p-6">
                <p className="font-semibold">{t.workedExample.question}</p>
                <ol className="mt-4 list-decimal space-y-1.5 pl-5">
                  {t.workedExample.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <p className="mt-4 border-t pt-4">
                  <span className="font-semibold">Answer:</span>{" "}
                  {t.workedExample.answer}
                </p>
              </div>
            </section>
          )}

          <section aria-labelledby="terms">
            <H2 id="terms">Key terms</H2>
            <dl className="mt-4 border-t">
              {t.keyTerms.map((k) => (
                <div
                  key={k.term}
                  className="grid gap-1 border-b py-3 sm:grid-cols-[180px_1fr] sm:gap-6"
                >
                  <dt className="font-semibold">{k.term}</dt>
                  <dd className="text-muted-foreground">{k.definition}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="mistakes">
            <H2 id="mistakes">Common mistakes</H2>
            <ul className="mt-4 space-y-5">
              {t.misconceptions.map((m) => (
                <li key={m.wrong}>
                  <p className="text-muted-foreground decoration-destructive/60 line-through">
                    {m.wrong}
                  </p>
                  <p className="mt-1">{m.right}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="check">
            <H2 id="check">Check yourself</H2>
            <p className="text-muted-foreground mt-2 text-base">
              Answer each one from memory, then open it to check.
            </p>
            <ul className="mt-4 border-t">
              {t.retrieval.map((q) => (
                <li key={q.q} className="border-b">
                  <details className="group py-3">
                    <summary className="marker:text-muted-foreground cursor-pointer font-medium">
                      {q.q}
                    </summary>
                    <p className="text-muted-foreground mt-2 pl-4">{q.a}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="quiz" className="no-print">
            <H2 id="quiz">Quiz</H2>
            <div className="mt-4">
              <QuizPlayer fixedTopicId={t.id} />
            </div>
          </section>

          <p className="text-muted-foreground border-t pt-6 text-sm">
            Spotted a mistake?{" "}
            <Link
              href="/about#corrections"
              className="underline underline-offset-4"
            >
              Tell us
            </Link>
            .
          </p>
        </article>
      </div>
    </>
  );
}
