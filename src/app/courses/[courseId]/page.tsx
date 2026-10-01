import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import {
  ExternalLink,
  LinkList,
  Note,
  PageHeader,
  Section,
} from "@/components/kit";
import { QualificationSearch } from "@/components/qualification-search";
import { SetTexts } from "@/components/set-texts";
import { RecordVisit } from "@/components/widgets";
import { COURSES, courseById } from "@/lib/data/courses";
import { BOARDS, routeById } from "@/lib/data/routes";
import { SET_TEXT_COURSES } from "@/lib/data/set-texts";
import { topicsForCourse } from "@/lib/data/topics";

export function generateStaticParams() {
  return COURSES.map((c) => ({ courseId: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const c = courseById((await params).courseId);
  return c ? { title: c.title, description: c.summary } : {};
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const c = courseById((await params).courseId);
  if (!c) notFound();
  const r = routeById(c.route);
  const topics = topicsForCourse(c);
  const checked = new Date(c.lastChecked).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const boardNames = c.boards.map((b) => BOARDS[b].short);

  return (
    <>
      <RecordVisit href={`/courses/${c.id}`} title={c.title} kind="course" />
      <PageHeader
        title={c.title}
        intro={c.summary}
        crumbs={[
          { label: "Home", href: "/" },
          { label: r.name, href: r.href },
          { label: c.subject },
        ]}
      >
        <dl className="grid max-w-3xl gap-x-10 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Level</dt>
            <dd className="font-medium">{c.level}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Usually taken</dt>
            <dd className="font-medium">{c.years}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {c.boardFixed ? "Awarded by" : "Offered by"}
            </dt>
            <dd className="font-medium">
              {boardNames.length
                ? boardNames.join(", ")
                : "Several organisations"}
            </dd>
          </div>
        </dl>
        {c.specCodes?.length ? (
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm">
            Specification codes:{" "}
            <span className="text-foreground font-medium">
              {c.specCodes.map((s) => `${s.board} ${s.code}`).join(" · ")}
            </span>
          </p>
        ) : null}
      </PageHeader>

      <Section rule={false} className="pb-0">
        <Note tone={c.statusNote ? "warn" : "default"}>
          {c.boardFixed
            ? "Only one organisation awards this qualification. Check which version of the specification your centre teaches."
            : `Several boards offer ${c.subject}. Your school or college chooses the board, specification and (where there is one) the tier, so use your own specification as the final word.`}
          {c.statusNote && <> {c.statusNote}</>}
        </Note>
      </Section>

      <Section
        id="topics"
        title="Topic guides"
        intro={
          topics.length
            ? "Written by IlluminatED, each with a worked example, key terms, practice questions and a short quiz."
            : undefined
        }
      >
        {topics.length ? (
          <>
            <LinkList
              columns={2}
              items={topics.map((t) => ({
                href: `/courses/${c.id}/${t.id}`,
                title: t.title,
                description: t.summary,
              }))}
            />
            <p className="mt-6 text-sm">
              <Link
                href={`/quizzes?course=${c.id}`}
                className="text-primary font-medium underline underline-offset-4"
              >
                Quiz yourself on {c.subject}
              </Link>
              <span className="text-muted-foreground"> · </span>
              <Link
                href="/flashcards"
                className="text-primary font-medium underline underline-offset-4"
              >
                Flashcards
              </Link>
            </p>
          </>
        ) : (
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            We haven't written topic guides for this course yet. We only publish
            a guide once it's been checked. Until then, work from your
            specification and the official links below.
          </p>
        )}
      </Section>

      {SET_TEXT_COURSES.has(c.id) && (
        <Section rule={false} className="pt-0">
          <SetTexts />
        </Section>
      )}

      <Section id="about" title="About the course">
        <div className="grid gap-12 lg:grid-cols-3">
          <div>
            <h3 className="font-semibold">How it's assessed</h3>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              {c.assessment}
            </p>
          </div>
          <div>
            <h3 className="font-semibold">What most specifications cover</h3>
            <ul className="text-muted-foreground mt-2 space-y-1 leading-relaxed">
              {c.commonAreas.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-3 text-xs">
              A general guide. Names and content differ by board.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">A sensible order to revise in</h3>
            <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-5 leading-relaxed">
              {c.studySequence.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="text-muted-foreground mt-3 text-xs">
              If your teacher uses a different order, follow theirs.
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="spec"
        title="Find your specification"
        intro="Live results from the Ofqual register. Pick the one from your board and open its specification."
      >
        <QualificationSearch
          initial={{
            title: c.register.title,
            qualificationTypes: c.register.qualificationTypes ?? "",
          }}
          compact
          autoRun
          pageSize={6}
        />
        {c.officialLinks.length > 0 && (
          <div className="mt-10">
            <h3 className="font-semibold">Exam board pages</h3>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {c.officialLinks.map((l) => (
                <li key={l.url}>
                  <ExternalLink href={l.url}>{l.label}</ExternalLink>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-muted-foreground mt-10 text-xs">
          Course details last checked {checked}.
        </p>
      </Section>
    </>
  );
}
