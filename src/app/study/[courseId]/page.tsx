import Link from "next/link";
import { notFound } from "next/navigation";

import { ExternalLink, PageHeader, Section } from "@/components/kit";
import { studyTopic } from "@/lib/education/resources";
import { getCourseCurriculum } from "@/lib/server/education-store";
export const metadata = { title: "Topic study support" };
export default async function StudyTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ topic?: string; spec?: string }>;
}) {
  const { courseId } = await params;
  const query = await searchParams;
  const data = await getCourseCurriculum(courseId);
  const topic = data ? studyTopic(data, query.topic ?? "", query.spec) : null;
  if (!data || !topic) notFound();
  const search = [
    data.course.title,
    topic.syllabus?.board,
    topic.syllabus?.code,
    topic.title,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <PageHeader
        title={topic.title}
        intro={`${data.course.title}${topic.syllabus ? ` · ${topic.syllabus.board} ${topic.syllabus.code}` : " · general course area"}`}
        crumbs={[
          { label: "Home", href: "/" },
          { label: data.course.title, href: `/courses/${courseId}#curriculum` },
          { label: "Study support" },
        ]}
      />
      <Section rule={false} title="Start with the assessed requirements">
        <p className="text-muted-foreground max-w-3xl">
          Confirm your qualification version, tier and optional units with your
          teacher. A topic title does not describe every assessed skill or fact.
          Use the official specification and your teacher&apos;s scheme of work
          before choosing a resource.
        </p>
        {topic.section && (
          <p className="mt-4">
            <ExternalLink href={topic.section.url}>
              Read this topic in the official specification
            </ExternalLink>
          </p>
        )}
        {!topic.section && (
          <ul className="mt-4 space-y-2">
            {data.course.officialLinks.map((l) => (
              <li key={l.url}>
                <ExternalLink href={l.url}>{l.label}</ExternalLink>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="A plan for studying this topic">
        <ol className="max-w-3xl list-decimal space-y-3 pl-5">
          <li>
            Read the exact specification statements. List the definitions,
            processes, calculations, evidence or techniques you need to explain.
          </li>
          <li>
            Use one explanation or video. Pause to make your own notes, check
            unfamiliar vocabulary and reproduce a worked example without
            looking.
          </li>
          <li>
            Close your notes and recall the main ideas. Explain the topic aloud
            or write a short answer from memory.
          </li>
          <li>
            Practise relevant official assessment questions. Use the correct
            board, qualification and tier; for assignments, follow your
            centre&apos;s brief and authenticity rules.
          </li>
          <li>
            Compare your work with the official mark scheme or assessment
            criteria. Record what was missing and ask your teacher about
            anything unclear.
          </li>
          <li>
            Revisit the topic after a gap and practise a different question.
            Tick the revision checklist when you have worked through it.
          </li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-5">
          <Link
            className="text-primary underline"
            href={`/quizzes?course=${courseId}`}
          >
            Browse available practice quizzes
          </Link>
          <Link className="text-primary underline" href="/tutors">
            Get tutor support
          </Link>
          <Link className="text-primary underline" href="/tiggy">
            Ask Tiggy for an explanation
          </Link>
        </div>
      </Section>
      {topic.lessons.length > 0 && (
        <Section title="Oak lesson suggestions">
          <p className="text-muted-foreground text-sm">
            Suggested by matching titles. Check the displayed programme, board
            and tier; these are not an audited match to every specification
            statement.
          </p>
          <ul className="mt-5 space-y-3">
            {topic.lessons.map((l) => (
              <li key={l.slug}>
                <Link
                  className="text-primary underline"
                  href={`/learn/${l.slug}`}
                >
                  {l.title}
                </Link>
                <span className="text-muted-foreground ml-3 text-sm">
                  {l.board} · {l.tier}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="Find another explanation or video">
        <p className="text-muted-foreground max-w-3xl text-sm">
          These searches open external providers with the topic already entered.
          Results vary and have not been checked for your exact exam. The search
          terms include your course and topic; account details are not sent.
        </p>
        <div className="mt-5 flex flex-wrap gap-5">
          <ExternalLink
            href={`https://www.open.edu/openlearn/local/ocwglobalsearch/search.php?q=${encodeURIComponent(topic.title)}`}
          >
            Search free OpenLearn courses
          </ExternalLink>
          <ExternalLink
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(search + " lesson")}`}
          >
            Search video explanations
          </ExternalLink>
        </div>
      </Section>
      {topic.resources.length > 0 && (
        <Section title="Supplementary free learning">
          <p className="text-muted-foreground text-sm">
            These resources develop related knowledge. They may include material
            beyond your UK qualification; use the specification to decide what
            applies. Videos, books and worksheets remain on their
            publishers&apos; sites.
          </p>
          <ul className="mt-5 space-y-3">
            {topic.resources.map((r) => (
              <li key={r.url}>
                <ExternalLink href={r.url}>{r.title}</ExternalLink>
                <span className="text-muted-foreground ml-3 text-sm">
                  {r.provider}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
