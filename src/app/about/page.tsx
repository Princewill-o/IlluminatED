import Link from "next/link";

import type { Metadata } from "next";

import { CorrectionForm } from "@/components/correction-form";
import { ExternalLink, PageHeader, Section } from "@/components/kit";

export const metadata: Metadata = {
  title: "About",
  description:
    "What IlluminatED covers, where its content comes from, and how to report a mistake.",
};

const HOW = [
  {
    t: "What we cover",
    d: "GCSE (especially Year 11), A level, BTEC, T Levels and other Level 2 and 3 courses, mainly as taught in England. We also link to the boards used in Wales and Northern Ireland.",
  },
  {
    t: "Where the content comes from",
    d: "Topic guides and quiz questions are written by us, and each shows when it was last reviewed. Specifications, papers and mark schemes stay on the exam boards' own sites. We link to them rather than copying them.",
  },
  {
    t: "Live information",
    d: "Qualification details come from Ofqual's public register and statistics from the Department for Education. Background reading comes from Wikipedia and Open Library. Each result shows its source and when it was fetched.",
  },
  {
    t: "How quiz scores work",
    d: "Your score counts answers you got right first time. Retrying helps you learn but doesn't change the score. Scores are for practice, not predicted grades.",
  },
  {
    t: "Finding your exam board",
    d: "Ask your teacher, or look at the front page of a mock or past paper from school. Then use the qualification search to find the exact specification.",
  },
  {
    t: "Accounts",
    d: "A free account unlocks the revision pages, quizzes, flashcards and your dashboard, and works on IlluminatEDSocial too. It's for ages 13 and over. See our privacy policy for what we store.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About IlluminatED"
        intro="A free study site for secondary and post-16 learners in the UK. Create a free account to get started. No adverts."
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      />
      <Section rule={false}>
        <dl className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {HOW.map((h) => (
            <div key={h.t}>
              <dt className="font-semibold">{h.t}</dt>
              <dd className="text-muted-foreground mt-2 leading-relaxed">
                {h.d}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-12 max-w-3xl text-sm leading-relaxed">
          IlluminatED isn't connected to or endorsed by AQA, Pearson, OCR,
          WJEC/Eduqas, CCEA, NCFE, City & Guilds, Ofqual or the Department for
          Education. More in the{" "}
          <Link className="underline underline-offset-4" href="/faq">
            FAQ
          </Link>
          ,{" "}
          <Link className="underline underline-offset-4" href="/your-data">
            Your data
          </Link>
          ,{" "}
          <Link className="underline underline-offset-4" href="/privacy">
            privacy policy
          </Link>{" "}
          and our{" "}
          <Link className="underline underline-offset-4" href="/accessibility">
            accessibility statement
          </Link>
          .
        </p>
      </Section>
      <Section
        id="corrections"
        title="Report a mistake"
        intro="If something's wrong or out of date, tell us. A link to the right page of your specification helps us fix it quickly."
      >
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <CorrectionForm />
          <div className="text-muted-foreground space-y-4 text-sm leading-relaxed">
            <p>
              We check every report against the awarding body's documents before
              changing anything, then update the page's review date.
            </p>
            <p>
              If the problem is in an exam board's own document, contact the
              board directly, for example{" "}
              <ExternalLink href="https://www.aqa.org.uk/">AQA</ExternalLink>,{" "}
              <ExternalLink href="https://qualifications.pearson.com/">
                Pearson
              </ExternalLink>{" "}
              or <ExternalLink href="https://www.ocr.org.uk/">OCR</ExternalLink>
              .
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
