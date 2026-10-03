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
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm dark:border-slate-200 dark:bg-white dark:text-slate-900">
              <h3 className="font-semibold">{c.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <a className="rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-900 hover:bg-slate-50" href={`/api/downloads?course=${encodeURIComponent(c.id)}&type=checklist`}>PDF checklist</a>
                {TOPICS.some((topic) => c.topicIds.includes(topic.id) && topic.quiz.length > 0) && <a className="rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-900 hover:bg-slate-50" href={`/api/downloads?course=${encodeURIComponent(c.id)}&type=practice`}>PDF practice paper</a>}
              </div>
              <ul className="mt-1">
                {TOPICS.filter((t) => t.courseId === c.id).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <Link
                      href={`/courses/${c.id}/${t.id}`}
                      className="py-1.5 text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
                    >
                      {t.title}
                    </Link>
                    <NotesDownloadButton
                      topicId={t.id}
                      courseId={c.id}
                      label="Download"
                    />
                    <a
                      className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 hover:bg-slate-50"
                      href={`/api/downloads?course=${encodeURIComponent(c.id)}&topic=${encodeURIComponent(t.id)}&type=notes`}
                    >
                      PDF notes
                    </a>
                  </li>
                ))}
              </ul>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
