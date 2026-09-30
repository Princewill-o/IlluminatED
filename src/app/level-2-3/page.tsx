import type { Metadata } from "next";

import { CourseDirectory } from "@/components/directories";
import { HubHero, StudyAdvice } from "@/components/hub";
import { Note, Section } from "@/components/kit";
import { QualificationSearch } from "@/components/qualification-search";

export const metadata: Metadata = {
  title: "Level 2 and Level 3 qualifications",
  description:
    "Functional Skills, Core Maths, the EPQ, Cambridge Technicals and other Level 2 and 3 routes.",
};

export default function Level23Hub() {
  return (
    <>
      <HubHero id="level23">
        <StudyAdvice id="level23" />
      </HubHero>
      <Section id="routes" title="Courses">
        <CourseDirectory initialRoute="level23" />
      </Section>
      <Section
        id="register"
        title="Is my qualification still running?"
        intro="Funding for some applied general and technical qualifications in England is being withdrawn in stages. Search the Ofqual register to check a qualification's status, then confirm with your college."
      >
        <QualificationSearch initial={{ title: "Functional Skills" }} autoRun />
        <Note className="mt-6">
          The register covers qualifications regulated in England. It won't show
          Wales-only or Scottish qualifications.
        </Note>
      </Section>
    </>
  );
}
