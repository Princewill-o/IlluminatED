import type { Metadata } from "next";

import { HubHero, RouteCourses, StudyAdvice } from "@/components/hub";
import { ExternalLink, Section } from "@/components/kit";

export const metadata: Metadata = {
  title: "T Levels",
  description:
    "T Levels by occupational route and awarding organisation, with the core, specialism and industry placement explained.",
};

const PARTS = [
  {
    t: "Core",
    d: "Knowledge for your whole industry area, assessed by exams and an employer-set project.",
  },
  {
    t: "Occupational specialism",
    d: "Practical skills for a particular job, assessed through tasks set by your awarding organisation.",
  },
  {
    t: "Industry placement",
    d: "At least 315 hours (about 45 days) with an employer, putting your skills to work.",
  },
];

export default function TLevelsHub() {
  return (
    <>
      <HubHero id="tlevel">
        <StudyAdvice id="tlevel" />
      </HubHero>
      <Section
        id="how"
        title="How a T Level works"
        intro="The classroom part is called the technical qualification. It has two components, and the placement sits alongside it."
      >
        <dl className="grid gap-8 md:grid-cols-3">
          {PARTS.map((p) => (
            <div key={p.t} className="border-t pt-4">
              <dt className="font-semibold">{p.t}</dt>
              <dd className="text-muted-foreground mt-1 leading-relaxed">
                {p.d}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-8 text-sm">
          Source:{" "}
          <ExternalLink href="https://www.tlevels.gov.uk/students">
            T Levels: information for students (DfE)
          </ExternalLink>
          . Checked 30 September 2026 for the 2026/27 academic year.
        </p>
      </Section>
      <RouteCourses
        id="tlevel"
        title="T Levels by industry"
        intro="A selection of current T Levels and the organisation that awards each one. The DfE list below is the complete, up-to-date one."
        groupBy
      />
      <Section id="official" title="Official T Level information">
        <ul className="space-y-3">
          <li>
            <ExternalLink href="https://www.tlevels.gov.uk/students/subjects">
              Every T Level subject
            </ExternalLink>
            <span className="text-muted-foreground">
              {" "}
              on the DfE T Levels website
            </span>
          </li>
          <li>
            <ExternalLink href="https://support.tlevels.gov.uk/hc/en-gb">
              T Level support hub
            </ExternalLink>
            <span className="text-muted-foreground">
              , with outline content and links to each specification
            </span>
          </li>
        </ul>
      </Section>
    </>
  );
}
