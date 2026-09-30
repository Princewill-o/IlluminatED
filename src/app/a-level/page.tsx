import type { Metadata } from "next";

import {
  BoardLinks,
  HubHero,
  RouteCourses,
  StudyAdvice,
} from "@/components/hub";
import { Section } from "@/components/kit";
import { YearSelector } from "@/components/widgets";
import { GENERAL_BOARDS } from "@/lib/data/routes";

export const metadata: Metadata = {
  title: "A level (Years 12–13)",
  description:
    "A level subject guides, study methods for sixth form, and official specification and past-paper links.",
};

const METHODS = [
  {
    t: "Study outside lessons",
    d: "Plan on a few hours a week per subject: tidying notes, reading around the topic and doing questions.",
  },
  {
    t: "Test yourself, then test again",
    d: "Quiz yourself on a topic a few days after learning it, then again a week or two later. Recalling it is what makes it stick.",
  },
  {
    t: "Practise against the clock",
    d: "Do exam questions under time pressure and mark them with the official mark scheme. Note what earned the marks.",
  },
];

export default function ALevelHub() {
  return (
    <>
      <HubHero id="alevel">
        <StudyAdvice id="alevel" />
      </HubHero>
      <Section id="year" title="How to study at A level">
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <ol className="space-y-6">
            {METHODS.map((m, i) => (
              <li key={m.t} className="flex gap-4">
                <span className="text-muted-foreground w-5 shrink-0 pt-0.5 text-sm tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{m.t}</h3>
                  <p className="text-muted-foreground mt-1 leading-relaxed">
                    {m.d}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <YearSelector />
        </div>
      </Section>
      <RouteCourses
        id="alevel"
        title="Subjects"
        intro="Schools don't all offer the same subjects or boards. Each subject page helps you find your exact specification."
      />
      <Section id="boards" title="Specifications and past papers">
        <BoardLinks boards={GENERAL_BOARDS} />
      </Section>
    </>
  );
}
