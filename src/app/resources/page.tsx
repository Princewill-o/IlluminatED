import Link from "next/link";

import type { Metadata } from "next";

import { ResourceFinder } from "@/components/directories";
import { GovUkSearch } from "@/components/govuk-search";
import { ExternalLink, PageHeader, Section } from "@/components/kit";
import { OGL_URL } from "@/lib/apprenticeships";
import { COURSES } from "@/lib/data/courses";
import { TOPICS } from "@/lib/data/topics";

const OGL = { label: "Open Government Licence v3.0", href: OGL_URL };

const DATA_SOURCES: {
  name: string;
  href: string;
  use: string;
  licence: { label: string; href?: string };
}[] = [
  {
    name: "Oak National Academy",
    href: "https://www.thenational.academy/",
    use: "Course topic and lesson catalogue; authorised API quizzes when connected",
    licence: {
      label: "OGL v3.0 where stated; third-party restrictions apply",
      href: "https://open-api.thenational.academy/docs/about-oaks-api/terms",
    },
  },
  {
    name: "Ofqual Register",
    href: "https://register.ofqual.gov.uk/",
    use: "Qualification and specification search",
    licence: OGL,
  },
  {
    name: "DfE Explore Education Statistics",
    href: "https://explore-education-statistics.service.gov.uk/",
    use: "Education data",
    licence: OGL,
  },
  {
    name: "GOV.UK",
    href: "https://www.gov.uk/",
    use: "Official guidance search, and sources for Ask Tiggy",
    licence: OGL,
  },
  {
    name: "Skills England",
    href: "https://skillsengland.education.gov.uk/apprenticeships/",
    use: "Careers and apprenticeships explorer",
    licence: OGL,
  },
  {
    name: "Open Library",
    href: "https://openlibrary.org/developers/api",
    use: "Book search on the reading page",
    licence: {
      label: "Catalogue data CC0 (public domain)",
      href: "https://openlibrary.org/developers/licensing",
    },
  },
  {
    name: "Wikipedia",
    href: "https://en.wikipedia.org/",
    use: "Topic summaries on the reading page",
    licence: {
      label: "CC BY-SA 4.0",
      href: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
  },
  {
    name: "Project Gutenberg (via Gutendex)",
    href: "https://www.gutenberg.org/",
    use: "Free English Literature set texts",
    licence: {
      label: "Public domain texts",
      href: "https://www.gutenberg.org/policy/license.html",
    },
  },
  {
    name: "Hugging Face",
    href: "https://huggingface.co/",
    use: "Runs the AI model behind Ask Tiggy",
    licence: {
      label: "Service terms (answers are AI-generated, not licensed data)",
      href: "https://huggingface.co/terms-of-service",
    },
  },
];

export const metadata: Metadata = {
  title: "Past papers and official resources",
  description:
    "Links to official specifications, past papers, mark schemes, examiner reports, sample assessments and T Level outlines.",
};

export default function ResourcesPage() {
  return (
    <>
      <PageHeader
        title="Past papers and official resources"
        intro={
          <>
            Links to exam boards, Ofqual and the Department for Education.
            Papers stay on each board's own site, under its own rules, so we
            link rather than copy. For a particular specification, try the{" "}
            <Link
              className="text-foreground underline underline-offset-4"
              href="/qualifications"
            >
              qualification search
            </Link>
            .
          </>
        }
        crumbs={[{ label: "Home", href: "/" }, { label: "Resources" }]}
      />
      <Section rule={false}>
        <p className="mb-6 text-sm">
          <Link href="/courses" className="text-primary underline">
            Find stored syllabus checklists, videos and topic resources by
            course
          </Link>
        </p>
        <ResourceFinder />
      </Section>
      <Section
        id="downloads"
        title="IlluminatED downloads"
        intro="Branded study aids you can print or save. Practice papers are original IlluminatED material, not official exam papers."
      >
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-slate-950">
          <h3 className="font-bold">Downloaded a paper? Try exam mode.</h3>
          <p className="mt-1 text-sm text-slate-700">Set your own duration and use a distraction-free dark timer while you work. You will be asked before pausing or finishing.</p>
          <Link href="/exam-mode" className="mt-3 inline-flex rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Start exam mode</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {COURSES.map((course) => (
            <div key={course.id} className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm dark:border-slate-200 dark:bg-white dark:text-slate-900">
              <h3 className="font-semibold">{course.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{course.years} · {course.level}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <a className="rounded-full border border-slate-300 bg-white px-3 py-2 font-medium text-slate-900 hover:bg-slate-50" href={`/api/downloads?course=${encodeURIComponent(course.id)}&type=checklist`}>Download topic checklist</a>
                {TOPICS.some((topic) => course.topicIds.includes(topic.id) && topic.quiz.length > 0) && <a className="rounded-full border border-slate-300 bg-white px-3 py-2 font-medium text-slate-900 hover:bg-slate-50" href={`/api/downloads?course=${encodeURIComponent(course.id)}&type=practice`}>Download practice paper</a>}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section
        id="guidance"
        title="Official guidance from GOV.UK"
        intro="Search guidance from the Department for Education, Ofqual, Student Finance and Skills England, such as results day, resits and access arrangements."
      >
        <GovUkSearch />
      </Section>
      <Section
        id="sources"
        title="Data sources"
        intro="Where the live information on IlluminatED comes from, and the licence it's published under."
      >
        <ul className="border-t">
          {DATA_SOURCES.map((d) => (
            <li
              key={d.name}
              className="grid gap-1 border-b py-4 sm:grid-cols-[1fr_1fr_1fr] sm:gap-6"
            >
              <span>
                <ExternalLink href={d.href}>{d.name}</ExternalLink>
              </span>
              <span className="text-muted-foreground text-sm">{d.use}</span>
              <span className="text-sm">
                {d.licence.href ? (
                  <ExternalLink href={d.licence.href} className="text-sm">
                    {d.licence.label}
                  </ExternalLink>
                ) : (
                  <span className="text-muted-foreground">
                    {d.licence.label}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-6 max-w-3xl text-sm leading-relaxed">
          Exam boards don&apos;t offer APIs for past papers or questions, so we
          link to their official past paper pages rather than copying them.
        </p>
      </Section>
    </>
  );
}
