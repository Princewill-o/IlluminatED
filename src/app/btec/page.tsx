import type { Metadata } from "next";

import {
  BoardLinks,
  HubHero,
  RouteCourses,
  StudyAdvice,
} from "@/components/hub";
import { ExternalLink, Section } from "@/components/kit";

export const metadata: Metadata = {
  title: "BTEC (Level 2 and 3)",
  description:
    "BTEC courses by sector and level, unit planning, an assignment checklist and Pearson sample assessment links.",
};

const CHECKLIST = [
  "I have the assignment brief and know which unit and learning aim it covers.",
  "I know the Pass, Merit and Distinction criteria, and what command words like “analyse” and “evaluate” ask for.",
  "The work is my own, and I've referenced my sources.",
  "My drafts, feedback and deadlines are organised by unit.",
  "I've checked every criterion is clearly met before handing in.",
  "I know my deadline and my centre's resubmission rules.",
];

export default function BtecHub() {
  return (
    <>
      <HubHero id="btec">
        <StudyAdvice id="btec" />
      </HubHero>
      <Section id="levels" title="Level 1/2 or Level 3">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">BTEC Tech Awards (Level 1/2)</h3>
            <p className="text-muted-foreground mt-1 leading-relaxed">
              Usually taken in Years 10 and 11 alongside GCSEs. Components mix
              tasks marked by your school with one external assessment.
            </p>
            <p className="mt-3 text-sm">
              <ExternalLink href="https://qualifications.pearson.com/en/qualifications/btec-tech-awards.html">
                Tech Awards on the Pearson website
              </ExternalLink>
            </p>
          </div>
          <div>
            <h3 className="font-semibold">BTEC Nationals (Level 3)</h3>
            <p className="text-muted-foreground mt-1 leading-relaxed">
              Post-16 courses in several sizes, from Certificate to Extended
              Diploma. The size decides how many units you take.
            </p>
            <p className="mt-3 text-sm">
              <ExternalLink href="https://qualifications.pearson.com/en/qualifications/btec-nationals.html">
                Nationals on the Pearson website
              </ExternalLink>
            </p>
          </div>
        </div>
      </Section>
      <RouteCourses id="btec" title="Courses by sector" groupBy />
      <Section id="planning" title="Planning your units">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold">A simple plan for each unit</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed">
              <li>
                List your units and mark which are assignments and which are
                external assessments.
              </li>
              <li>
                Put every assignment deadline in the{" "}
                <a
                  className="text-primary underline underline-offset-4"
                  href="/revision"
                >
                  revision planner
                </a>
                .
              </li>
              <li>
                For external units, find the sample assessment on your
                qualification's page and try it under timed conditions.
              </li>
              <li>
                After each hand-in, read the feedback and write down one thing
                to do differently next time.
              </li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold">Before you hand in an assignment</h3>
            <ul className="mt-3 space-y-2.5">
              {CHECKLIST.map((c) => (
                <li key={c} className="flex gap-3 leading-relaxed">
                  <span
                    className="border-foreground/40 mt-1 size-4 shrink-0 rounded-sm border"
                    aria-hidden
                  />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
      <Section id="boards" title="Official BTEC pages">
        <BoardLinks boards={["pearson"]} />
      </Section>
    </>
  );
}
