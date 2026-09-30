import Link from "next/link";

import type { Metadata } from "next";

import { ResourceFinder } from "@/components/directories";
import { PageHeader, Section } from "@/components/kit";

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
        <ResourceFinder />
      </Section>
    </>
  );
}
