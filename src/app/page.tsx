import { AppPreview } from "@/components/app-preview";
import { Mascot } from "@/components/brand";
import {
  CountdownDemo,
  CtaButtons,
  FeatureGrid,
  GradeDemo,
  Reveal,
} from "@/components/landing";

const QUALIFICATIONS = [
  "GCSE",
  "A level",
  "BTEC",
  "T Levels",
  "Functional Skills",
  "Core Maths",
  "EPQ",
  "Cambridge Technicals",
];

/** Public landing page. Signed-in visitors are sent to their dashboard by the middleware. */
export default function Home() {
  return (
    <>
      <section className="container grid items-center gap-12 pt-8 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-12 lg:pb-24">
        <Reveal>
          <p className="text-primary text-sm font-semibold">
            For GCSE, A level, BTEC and T Level students in the UK
          </p>
          <h1 className="mt-4 text-[2.7rem] leading-[1.03] tracking-tight text-balance md:text-6xl">
            Know where you stand. Know what to do next.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
            IlluminatED tracks your progress in every subject, counts down to
            your exams with a plan to get there, and tells you what you need on
            the papers still to come.
          </p>
          <div className="mt-8">
            <CtaButtons />
          </div>
          <p className="text-muted-foreground mt-5 text-sm">
            Free to join. No adverts. Your email is never shown to anyone.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-[2.5rem] bg-[#efe3cc] dark:bg-[#2a2317]">
            <Mascot className="mx-auto mt-10 w-[86%]" />
          </div>
        </Reveal>
      </section>

      <section aria-label="Qualifications" className="border-y">
        <div className="container flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-6">
          {QUALIFICATIONS.map((q) => (
            <span key={q} className="text-muted-foreground text-sm font-medium">
              {q}
            </span>
          ))}
        </div>
      </section>

      <section className="container py-16 lg:py-24" aria-labelledby="try-title">
        <Reveal className="max-w-2xl">
          <h2 id="try-title" className="text-3xl tracking-tight md:text-4xl">
            Try it
          </h2>
          <p className="text-muted-foreground mt-3 text-lg">
            Two things from your dashboard. Pick your qualification, or drag the
            slider.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <CountdownDemo />
          </Reveal>
          <Reveal delay={0.08}>
            <GradeDemo />
          </Reveal>
        </div>
      </section>

      <section
        className="container pb-16 lg:pb-24"
        aria-labelledby="features-title"
      >
        <Reveal className="max-w-2xl">
          <h2
            id="features-title"
            className="text-3xl tracking-tight md:text-4xl"
          >
            Everything in one account
          </h2>
          <p className="text-muted-foreground mt-3 text-lg">
            Sign up once. It works for the revision site and the student forum.
          </p>
        </Reveal>
        <div className="mt-10">
          <FeatureGrid />
        </div>
      </section>

      <AppPreview />

      <section className="container py-20 text-center lg:py-28">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-3xl tracking-tight text-balance md:text-5xl">
            Start training for exam day.
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-lg">
            It takes about a minute to set up your subjects and exam date.
          </p>
          <div className="mt-8">
            <CtaButtons center />
          </div>
        </Reveal>
      </section>
    </>
  );
}
