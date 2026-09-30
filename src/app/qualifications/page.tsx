import type { Metadata } from "next";

import { ExternalLink, Note, PageHeader, Section } from "@/components/kit";
import { QualificationSearch } from "@/components/qualification-search";

export const metadata: Metadata = {
  title: "Qualification search",
  description:
    "Search the Ofqual Register of Regulated Qualifications by title, type, level, awarding organisation and status.",
};

export default async function QualificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; type?: string }>;
}) {
  const { title = "", type = "" } = await searchParams;
  return (
    <>
      <PageHeader
        title="Qualification search"
        intro="Find the exact qualification you're taking, who awards it, whether it's still available, and a link to its specification."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources" },
          { label: "Qualification search" },
        ]}
      >
        <Note>
          Results come live from the{" "}
          <ExternalLink href="https://register.ofqual.gov.uk/">
            Ofqual register
          </ExternalLink>
          , which covers qualifications regulated in England. It doesn't include
          Wales-only or Scottish qualifications, and it lists qualifications
          rather than their full content.
        </Note>
      </PageHeader>
      <Section rule={false}>
        <QualificationSearch
          initial={{
            title: title.slice(0, 80),
            qualificationTypes: type.slice(0, 80),
          }}
          autoRun={title.length >= 2}
        />
      </Section>
    </>
  );
}
