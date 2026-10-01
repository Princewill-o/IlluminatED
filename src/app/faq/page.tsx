import Link from "next/link";

import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/kit";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about GCSEs, A levels, BTECs, T Levels, Level 2/3, past papers, data sources and accounts.",
};

const FAQ: { group: string; items: { q: string; a: React.ReactNode }[] }[] = [
  {
    group: "GCSE",
    items: [
      {
        q: "How do I know which exam board I'm doing?",
        a: (
          <>
            Ask your teacher, or check a past paper or mock your school gave
            you. Then use the{" "}
            <Link href="/qualifications">qualification search</Link> to find the
            specification.
          </>
        ),
      },
      {
        q: "Should I revise for Foundation or Higher?",
        a: "Your teacher decides your tier entry. Revise the content for the tier you're entered for, and ask if you're unsure.",
      },
      {
        q: "When are my exams?",
        a: (
          <>
            Exam dates depend on your board and subject and are published in
            your school's timetable. You can add your own date to the{" "}
            <Link href="/gcse#plan">GCSE countdown</Link>.
          </>
        ),
      },
    ],
  },
  {
    group: "A level",
    items: [
      {
        q: "How is Year 13 different from Year 12?",
        a: "In most subjects, A level exams at the end of Year 13 cover content from both years, so keep revisiting Year 12 topics.",
      },
      {
        q: "What's the practical endorsement?",
        a: "In A level sciences in England, practical skills are reported separately as a pass or not classified, alongside your grade.",
      },
    ],
  },
  {
    group: "BTEC",
    items: [
      {
        q: "How are BTECs assessed?",
        a: "Through a mix of internally assessed assignments and external assessments (exams or set tasks). The mix depends on your qualification size and version.",
      },
      {
        q: "Where do I find sample assessments?",
        a: (
          <>
            On your qualification's page on the Pearson website. See the{" "}
            <Link href="/btec">BTEC hub</Link>.
          </>
        ),
      },
    ],
  },
  {
    group: "T Levels",
    items: [
      {
        q: "What is a T Level?",
        a: "A two-year Level 3 technical qualification with a core component, an occupational specialism and an industry placement of at least 315 hours.",
      },
      {
        q: "Who awards my T Level?",
        a: (
          <>
            Each T Level has one awarding organisation. It's shown on the{" "}
            <Link href="/t-levels">T Levels hub</Link> and on the DfE subject
            pages.
          </>
        ),
      },
    ],
  },
  {
    group: "Level 2 and Level 3",
    items: [
      {
        q: "Is my qualification still available?",
        a: (
          <>
            Availability and funding change. Check its status in the{" "}
            <Link href="/qualifications">qualification search</Link> and ask
            your college.
          </>
        ),
      },
      {
        q: "What are Functional Skills?",
        a: "Practical English and maths qualifications from Entry Level to Level 2, often taken alongside college courses and apprenticeships.",
      },
    ],
  },
  {
    group: "Past papers",
    items: [
      {
        q: "Why can't I find the most recent papers?",
        a: "Boards often restrict recent papers to teachers for a time after the exam. We link to the official finders and follow their release schedules.",
      },
      {
        q: "Does IlluminatED host past papers?",
        a: "No. Papers, mark schemes and examiner reports stay on the exam boards' websites, under their terms.",
      },
    ],
  },
  {
    group: "Data and sources",
    items: [
      {
        q: "Where does qualification data come from?",
        a: "Ofqual's public Register of Regulated Qualifications (England). It lists qualifications, not their full teaching content.",
      },
      {
        q: "Can the statistics predict my grades?",
        a: "No. DfE statistics describe groups of pupils. They can't predict an individual result.",
      },
      {
        q: "Is Wikipedia content reliable for exams?",
        a: "Use it as background only. Your specification and course materials decide what you need to know.",
      },
    ],
  },
  {
    group: "Accounts and your data",
    items: [
      {
        q: "Do I need an account?",
        a: "Yes, but it's free. A free account unlocks the topic pages, quizzes, flashcards, planner and your dashboard of progress by topic. It also lets you request a tutor and post on IlluminatEDSocial. You need to be 13 or over.",
      },
      {
        q: "Will my progress sync to my phone?",
        a: (
          <>
            Yes. Quiz scores are saved to your account, so they follow you when
            you <Link href="/sign-in">sign in</Link> on another device. A few
            things, like your revision planner, are saved in each browser
            separately. You can clear them on the{" "}
            <Link href="/your-data">Your data</Link> page.
          </>
        ),
      },
      {
        q: "How much does a tutor cost?",
        a: (
          <>
            It depends on the kind of help and how quickly you need it. See the{" "}
            <Link href="/tutors">tutoring page</Link> for prices. Sending a
            request doesn't charge you anything.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHeader
        title="Questions and answers"
        crumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
      />
      <Section rule={false}>
        <nav
          aria-label="FAQ sections"
          className="mb-10 flex flex-wrap gap-x-5 gap-y-2"
        >
          {FAQ.map((g) => (
            <a
              key={g.group}
              href={`#${g.group.replace(/\W+/g, "-").toLowerCase()}`}
              className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
            >
              {g.group}
            </a>
          ))}
        </nav>
        <div className="space-y-14">
          {FAQ.map((g) => (
            <section
              key={g.group}
              id={g.group.replace(/\W+/g, "-").toLowerCase()}
              aria-labelledby={`h-${g.group}`}
            >
              <h2 id={`h-${g.group}`} className="mb-2 text-xl font-semibold">
                {g.group}
              </h2>
              <div className="border-t">
                {g.items.map((i) => (
                  <details key={i.q} className="border-b py-4">
                    <summary className="cursor-pointer font-medium">
                      {i.q}
                    </summary>
                    <div className="text-muted-foreground [&_a]:text-primary mt-2 max-w-3xl leading-relaxed [&_a]:underline">
                      {i.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Section>
    </>
  );
}
