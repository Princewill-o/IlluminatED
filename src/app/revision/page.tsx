import Link from "next/link";

import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/kit";
import { Planner } from "@/components/planner";
import { NotesDownloadButton } from "@/components/widgets";
import { COURSES } from "@/lib/data/courses";
import { TOPICS } from "@/lib/data/topics";

export const metadata: Metadata = {
  title: "Revision planner and study sheets",
  description: "Plan revision sessions and download or print study sheets.",
};

export default function RevisionPage() {
  const withTopics = COURSES.filter((c) =>
    TOPICS.some((t) => t.courseId === c.id),
  );
  return (
    <>
      <PageHeader
        title="Revision planner"
        intro="Plan short sessions, tick them off, and add them to your calendar. Your plan stays in this browser."
        crumbs={[{ label: "Home", href: "/" }, { label: "Revision planner" }]}
      />
      <Section rule={false}>
        <Planner />
      </Section>
      <Section
        id="sheets"
        title="Study sheets"
        intro="Download plain-text notes for any topic, or open the topic and print it for a formatted sheet. Free to use for your own study."
      >
        <div className="grid gap-x-10 md:grid-cols-2">
          {withTopics.map((c) => (
            <div key={c.id} className="break-inside-avoid border-t py-4">
              <h3 className="font-semibold">{c.title}</h3>
              <ul className="mt-1">
                {TOPICS.filter((t) => t.courseId === c.id).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <Link
                      href={`/courses/${c.id}/${t.id}`}
                      className="decoration-foreground/20 hover:decoration-foreground py-1.5 underline underline-offset-4"
                    >
                      {t.title}
                    </Link>
                    <NotesDownloadButton
                      topicId={t.id}
                      courseId={c.id}
                      label="Download"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
