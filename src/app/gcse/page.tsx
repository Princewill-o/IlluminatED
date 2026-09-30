import Link from "next/link";

import type { Metadata } from "next";

import {
  BoardLinks,
  HubHero,
  RouteCourses,
  StudyAdvice,
} from "@/components/hub";
import { Section } from "@/components/kit";
import { ExamCountdown } from "@/components/widgets";
import { MORE_GCSE_SUBJECTS } from "@/lib/data/courses";
import { GENERAL_BOARDS } from "@/lib/data/routes";

export const metadata: Metadata = {
  title: "GCSE and Year 11",
  description:
    "GCSE subject guides, official specifications and past papers, and Year 11 revision tools.",
};

const DECIDES = [
  {
    t: "Exam board and specification",
    d: "Ask your teacher, or look at the front of a mock paper.",
  },
  {
    t: "Tier",
    d: "Maths, the sciences and languages have Foundation and Higher tiers. Your teacher enters you for one.",
  },
  {
    t: "Options and set texts",
    d: "History and geography options and English Literature texts vary from school to school.",
  },
];

export default function GcseHub() {
  return (
    <>
      <HubHero id="gcse">
        <StudyAdvice id="gcse" />
      </HubHero>
      <RouteCourses id="gcse" title="Subjects" />
      <Section
        id="more"
        title="Other GCSE subjects"
        intro="We haven't written guides for these yet. Each link finds the official qualification and its specification."
      >
        <p className="leading-loose">
          {MORE_GCSE_SUBJECTS.map((s, i) => (
            <span key={s}>
              <Link
                href={`/qualifications?title=${encodeURIComponent(s)}&type=${encodeURIComponent("GCSE (9 to 1)")}`}
                className="decoration-foreground/25 hover:decoration-foreground underline underline-offset-4"
              >
                {s}
              </Link>
              {i < MORE_GCSE_SUBJECTS.length - 1 && (
                <span className="text-muted-foreground">, </span>
              )}
            </span>
          ))}
        </p>
      </Section>
      <Section id="plan" title="Year 11">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold">What your school decides</h3>
            <dl className="mt-3 space-y-4">
              {DECIDES.map((d) => (
                <div key={d.t}>
                  <dt className="font-medium">{d.t}</dt>
                  <dd className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                    {d.d}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm">
              <Link
                href="/revision"
                className="text-primary font-medium underline underline-offset-4"
              >
                Plan your revision
              </Link>
            </p>
          </div>
          <ExamCountdown label="your first GCSE exam" />
        </div>
      </Section>
      <Section
        id="boards"
        title="Specifications and past papers"
        intro="These open each exam board's own website. Boards often hold back the most recent papers for a while after the exams."
      >
        <BoardLinks boards={GENERAL_BOARDS} />
      </Section>
    </>
  );
}
