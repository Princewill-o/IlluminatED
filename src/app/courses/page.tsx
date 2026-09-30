import type { Metadata } from "next";

import { CourseDirectory } from "@/components/directories";
import { Note, PageHeader, Section } from "@/components/kit";
import { QualificationSearch } from "@/components/qualification-search";

export const metadata: Metadata = {
  title: "All courses",
  description: "Search GCSE, A level, BTEC, T Level and Level 2 and 3 courses.",
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  return (
    <>
      <PageHeader
        title="Courses"
        intro="Every subject we cover, from GCSE to T Levels. Your exact content depends on your exam board and specification, so each course links to the official one."
        crumbs={[{ label: "Home", href: "/" }, { label: "Courses" }]}
      />
      <Section rule={false}>
        <CourseDirectory initialQuery={q.slice(0, 80)} />
      </Section>
      <Section
        id="register"
        title="Can't find your course?"
        intro="Search the Ofqual register, the official list of regulated qualifications in England."
      >
        <QualificationSearch
          initial={{ title: q.slice(0, 80) }}
          compact
          autoRun={q.length >= 2}
        />
        <Note className="mt-6">
          Register results come live from Ofqual. They describe the
          qualification, not what's taught in it.
        </Note>
      </Section>
    </>
  );
}
