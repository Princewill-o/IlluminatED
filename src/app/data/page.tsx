import type { Metadata } from "next";

import { EducationData } from "@/components/education-data";
import { ExternalLink, Note, PageHeader, Section } from "@/components/kit";

export const metadata: Metadata = {
  title: "Education data",
  description:
    "Published Department for Education statistics, with dates, geography and definitions.",
};

export default function DataPage() {
  return (
    <>
      <PageHeader
        title="Education data"
        intro="Official statistics from the Department for Education, the same figures used in its published reports. Useful for projects, EPQs and understanding the system."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources" },
          { label: "Education data" },
        ]}
      >
        <Note>
          These describe groups of pupils in England. They can't tell you how
          you'll do. Source:{" "}
          <ExternalLink href="https://api.education.gov.uk/statistics/docs/">
            Explore Education Statistics
          </ExternalLink>
          , Open Government Licence.
        </Note>
      </PageHeader>
      <Section rule={false}>
        <EducationData />
      </Section>
    </>
  );
}
