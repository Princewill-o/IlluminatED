import Link from "next/link";
import { notFound } from "next/navigation";

import { ExternalLink, PageHeader, Section } from "@/components/kit";
import { OakLessonQuiz } from "@/components/oak-lesson-quiz";
import { OAK_PROGRAMMES } from "@/lib/education";
import { oakEnabled } from "@/lib/server/oak";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = OAK_PROGRAMMES.flatMap((p) =>
    p.units.flatMap((u) => u.lessons),
  ).find((l) => l.slug === slug);
  return { title: lesson?.title ?? "Learning resources" };
}
export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const programme = OAK_PROGRAMMES.find((p) =>
    p.units.some((u) => u.lessons.some((l) => l.slug === slug)),
  );
  const unit = programme?.units.find((u) =>
    u.lessons.some((l) => l.slug === slug),
  );
  const lesson = unit?.lessons.find((l) => l.slug === slug);
  if (!lesson || !programme || !unit) notFound();
  return (
    <>
      <PageHeader
        title={lesson.title}
        intro={`Oak National Academy · ${programme.subject} · Year ${programme.year}`}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Courses", href: "/courses" },
          {
            label: unit.title,
            href: `/courses/${programme.courseIds[0]}#curriculum`,
          },
          { label: "Lesson resources" },
        ]}
      />
      <Section title="Watch, practise and download" rule={false}>
        <p className="text-muted-foreground max-w-2xl">
          Open the publisher&apos;s lesson for the video, starter and exit
          quizzes, and any available worksheets. Check that the programme
          matches your board, tier and chosen options. Some resources have
          access or copyright restrictions.
        </p>
        <div className="mt-5 flex flex-wrap gap-5">
          <ExternalLink href={lesson.url}>
            Open video, quizzes and worksheets on Oak
          </ExternalLink>
          <ExternalLink href={unit.url}>All lessons in this unit</ExternalLink>
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          Catalogue checked{" "}
          {new Date(programme.checkedAt).toLocaleDateString("en-GB", {
            timeZone: "Europe/London",
          })}
          . Links are stored on IlluminatED; the video and worksheet files are
          hosted by Oak.
        </p>
      </Section>
      <Section title="Lesson practice">
        {oakEnabled ? (
          <OakLessonQuiz slug={slug} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Use the full lesson quiz on Oak via the link above. In-site Oak
            quizzes will be available when the curriculum connection is enabled.
          </p>
        )}
        <p className="text-muted-foreground mt-5 text-xs">
          Oak National Academy lesson quiz, licensed under the{" "}
          <ExternalLink href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">
            Open Government Licence v3.0
          </ExternalLink>{" "}
          where supplied by its authorised API. Third-party restrictions still
          apply.
        </p>
      </Section>
      <Section title="Need an explanation?">
        <Link className="text-primary underline" href="/tiggy">
          Ask Tiggy
        </Link>
        <span className="text-muted-foreground"> · </span>
        <Link className="text-primary underline" href="/tutors">
          Get help from a tutor
        </Link>
      </Section>
    </>
  );
}
