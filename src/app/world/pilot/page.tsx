import Link from "next/link";

import type { Metadata } from "next";

import { REPAIR_SKILLS } from "@/lib/illum-world/repair";

export const metadata: Metadata = {
  title: "Year 10 school pilot | IllumWorld",
  description:
    "Run a 35–40 minute virtual work experience lesson: sample brief, condition report, assessment rubric and sample certificate.",
};
export default function WorldPilotPage() {
  return (
    <article className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-primary text-sm font-bold tracking-widest uppercase">
        IllumWorld · School pilot
      </p>
      <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
        One lesson. Three devices. A decision pupils can defend.
      </h1>
      <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-relaxed">
        Tech Repair Trainee is a Year 10 virtual work experience project
        designed for a 35–40 minute activity. Pupils produce an assessed
        decision sheet and a customer condition report.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/book?for=school&product=world&mission=tech-repair-trainee"
          className="bg-primary text-primary-foreground inline-flex min-h-12 items-center rounded-xl px-6 py-3 font-bold"
        >
          Request a school pilot
        </Link>
        <Link
          href="/world/tech-repair-trainee"
          className="inline-flex min-h-12 items-center rounded-xl border px-6 py-3 font-bold"
        >
          Try the full brief
        </Link>
      </div>
      <section className="bg-card mt-10 grid gap-4 rounded-3xl border p-6 sm:grid-cols-3">
        {[
          ["Who", "Year 10 pupils, individually or in discussion pairs."],
          [
            "Time",
            "8 min inspection · 15 min decisions · 12 min report · 5 min discussion.",
          ],
          [
            "Setup",
            "One browser per pupil, a school class join link and a teacher-assigned mission. The direct lesson does not require loading the 3D city.",
          ],
        ].map(([title, text]) => (
          <div key={title}>
            <h2 className="font-bold">{title}</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {text}
            </p>
          </div>
        ))}
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-bold">Sample brief</h2>
        <div className="mt-4 rounded-2xl border p-6">
          <p className="text-primary text-xs font-bold uppercase">
            Sample · not a learner submission
          </p>
          <p className="mt-3 leading-relaxed">
            The shop needs at least £25 expected profit per phone before other
            costs. A Raven R4 costs £80 to acquire and £45 to repair, with an
            expected resale price of £155. Calculate the £30 expected profit.
            Then decide whether a suspected battery fault makes the £5 buffer
            too small. Further battery work could cost £30.
          </p>
          <p className="text-muted-foreground mt-3 text-sm">
            Pupils also assess a promising repair and a loss-making device. A
            recommendation is assessed on its evidence and reasoning, with
            calculations checked automatically.
          </p>
        </div>
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-bold">Sample customer condition report</h2>
        <blockquote className="bg-secondary mt-4 rounded-2xl border p-6 leading-relaxed">
          <p className="text-primary mb-3 text-xs font-bold uppercase">
            Model example
          </p>
          <p>
            The Raven R4 has a crack across the lower-right display. Touch input
            responded during our short inspection, but the damaged glass may
            affect safe everyday use. A replacement display has been quoted at
            £45. The battery charge fell during the inspection; this alone does
            not confirm a battery fault. We recommend a standardised battery
            test before agreeing a repair and sale. Any additional battery work
            would need a separate quote. This report records the checks
            completed and does not guarantee future reliability.
          </p>
        </blockquote>
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-bold">Assessment and certificate</h2>
        <p className="text-muted-foreground mt-4 leading-relaxed">
          Teachers see submissions from their own class, check whether pupils
          use inspection evidence, justify their decisions and communicate
          honestly. They can request changes, review a resubmission and approve
          the finished project. All three profit calculations must be correct
          before approval.
        </p>
        <div className="border-primary/40 mt-5 rounded-2xl border-2 p-7 text-center">
          <p className="text-primary text-xs font-bold tracking-widest uppercase">
            Sample certificate · illustrative · not awarded
          </p>
          <h3 className="mt-4 text-3xl font-bold">
            IllumWorld project completion
          </h3>
          <p className="mt-3">[Learner username] · Tech Repair Trainee</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Teacher approved on [completion date]
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            {REPAIR_SKILLS.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-5 text-xs">
            An IlluminatED Learning project record. No employer endorsement,
            external accreditation or real placement is implied.
          </p>
        </div>
        <Link
          href="/world/pilot/sample?kind=certificate"
          className="mt-4 inline-flex min-h-11 items-center font-bold underline"
        >
          Download clearly marked sample certificate PDF
        </Link>
      </section>
      <section className="bg-secondary mt-10 rounded-2xl p-6">
        <h2 className="text-xl font-bold">
          For a repair or refurbishment business
        </h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          We welcome a review of the fictional brief, its inspection evidence
          and an example of workplace-quality output. Employer design or review
          credits will name the exact contribution once confirmed. Any workshop,
          visit or placement would be coordinated separately by the school.
        </p>
        <Link
          href="/contact?subject=IllumWorld%20repair%20mission%20review"
          className="mt-4 inline-flex min-h-11 items-center font-bold underline"
        >
          Offer a brief review
        </Link>
      </section>
    </article>
  );
}
