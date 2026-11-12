import Image from "next/image";
import Link from "next/link";

import { CheckCircle2, FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For schools, sixth forms and colleges",
  description:
    "A one-term paid pilot of IlluminatED: homework quests students choose to open, class progress you can see, and a data protection and safeguarding pack before you sign.",
  alternates: { canonical: "/schools" },
  openGraph: { title: "IlluminatED for schools, sixth forms and colleges", description: "Homework students do. Progress you can see.", url: "/schools" },
};

const WHAT = [
  ["A teacher workspace", "Create classes, assign question-bank homework, review submissions and see topic gaps across the class."],
  ["Homework as quests", "Assignments appear in the game as quests. The server marks them, and correct first attempts earn Clout, so students have a reason to finish."],
  ["School-managed access", "Teachers and students are invited into your school with the right role. Class codes stay inside your school."],
];

/** What a school receives before signing. Each item says plainly how it works today. */
const TRUST = [
  ["Data protection impact assessment (DPIA)", "A completed draft for your DPO, covering what we collect, why, where it is stored and for how long."],
  ["Data processing agreement", "The school is the controller for pilot accounts; IlluminatED processes data only on your instructions."],
  ["Child-friendly privacy notice", "A plain-English notice you can share with students and parents."],
  ["Safeguarding summary", "Preset-phrase chat in the game, message limits, reporting, and how concerns reach your DSL."],
  ["No AI training on student work", "We do not use student data to train AI models. Ask Tiggy refuses personal details and sends only the question text needed to answer."],
  ["Generative AI safety", "Tiggy is built around the DfE's generative AI product safety expectations: filtering, refusal of unsafe topics, moderator alerts and clear AI labelling."],
];

const PILOT = [
  ["Week 0", "A 30-minute call, then we send the pack and a one-page pilot agreement."],
  ["Weeks 1–2", "Teachers set up classes; students sign in and do their first homework quest."],
  ["Weeks 3–10", "Weekly homework quests. We check in every fortnight."],
  ["Week 11", "A short report: homework completion, activity, topic gaps and what students and staff said."],
];

export default function SchoolsPage() {
  return (
    <main className="container max-w-6xl py-12">
      <p className="font-bold tracking-widest text-primary uppercase">For schools, sixth forms and colleges</p>
      <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">Homework students do. Progress you can see.</h1>
      <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
        IlluminatED turns GCSE, A-level, BTEC and T Level revision into quests in a 3D city students want to play. Teachers set the work;
        students earn their way through the game by doing it.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/book?for=school" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-bold text-primary-foreground">Plan a pilot</Link>
        <a href="#trust" className="inline-flex min-h-11 items-center rounded-full border px-6 font-bold">See the data and safeguarding pack</a>
      </div>

      <Image src="/landing/world-cafe.webp" alt="IlluminatED City, a 3D educational game with student tasks" width={1440} height={960} className="mt-10 w-full rounded-3xl border" />

      <section className="my-12 grid gap-5 md:grid-cols-3" aria-label="What teachers get">
        {WHAT.map(([title, text]) => (
          <article key={title} className="rounded-3xl border bg-card p-6">
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-3 text-muted-foreground">{text}</p>
          </article>
        ))}
      </section>

      <section id="pilot" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-10" aria-labelledby="pilot-title">
        <p className="text-sm font-bold tracking-widest text-primary uppercase">The pilot</p>
        <h2 id="pilot-title" className="mt-3 text-3xl font-bold">One term, one price, a clear report at the end.</h2>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          Pilots start from £99 a month for one term, priced by the number of learners. You pay for the term you agreed and nothing renews
          automatically. If it works, we agree a full licence; if it doesn&apos;t, you keep the report.
        </p>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {PILOT.map(([when, what]) => (
            <li key={when} className="rounded-2xl bg-muted p-4">
              <p className="text-sm font-black text-primary">{when}</p>
              <p className="mt-1 text-sm">{what}</p>
            </li>
          ))}
        </ol>
        <Link href="/book?for=school" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-bold text-primary-foreground">Book the 30-minute call</Link>
      </section>

      <section id="trust" className="mt-12 scroll-mt-24" aria-labelledby="trust-title">
        <p className="text-sm font-bold tracking-widest text-primary uppercase">Before you sign</p>
        <h2 id="trust-title" className="mt-3 text-3xl font-bold">The data and safeguarding pack</h2>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">Sent with every pilot proposal, so your DPO and DSL can review it before anything starts.</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {TRUST.map(([title, text]) => (
            <li key={title} className="flex gap-3 rounded-2xl border bg-card p-5">
              <FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-muted-foreground">
          Read the <Link href="/privacy#schools" className="underline">school privacy information</Link>, the{" "}
          <Link href="/safeguarding" className="underline">safeguarding page</Link> and <Link href="/your-data" className="underline">how we handle your data</Link>.
        </p>
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">Free for any classroom, today</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            IllumED Slides covers Years 1–11 with no pupil accounts: pick a year and subject, show the slides, reveal model answers or
            download lessons for offline use.
          </p>
          <Link href="/curriculum" className="mt-4 inline-block font-bold text-primary underline">Browse free lesson slides</Link>
        </div>
        <ul className="space-y-3">
          {["Students choose subjects and exam boards when they set up.", "Teachers only see their own classes' usernames and results.", "In-game social chat uses preset phrases.", "Accounts and social features are for ages 13+."].map((t) => (
            <li key={t} className="flex gap-3 leading-7"><CheckCircle2 className="mt-1 size-5 shrink-0 text-primary" aria-hidden />{t}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
