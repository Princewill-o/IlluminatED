import { Suspense } from "react";

import { AppPreview } from "@/components/app-preview";
import { DeletedNotice } from "@/components/deleted-notice";
import {
  CountdownDemo,
  CtaButtons,
  FeatureGrid,
  GradeDemo,
  Reveal,
} from "@/components/landing";
import { Q4Campaign } from "@/components/q4-campaign";
import { Tiggy } from "@/components/tiggy";

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
      {/* After deleting an account (/?deleted=1). Read on the client so this page stays static. */}
      <Suspense fallback={null}>
        <DeletedNotice />
      </Suspense>
      <Q4Campaign />
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
          <div className="relative mx-auto w-full max-w-[420px] rounded-[2.5rem] bg-[#efe3cc] px-8 pt-16 dark:bg-[#2a2317]">
            <Tiggy
              action="wave"
              priority
              say="Hi, I'm Tiggy! Let's get you ready for exam day."
              sayClassName="left-[48%] -top-[2%]"
              label="Tiggy the IlluminatED lion, waving hello"
            />
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
        <Reveal className="flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 id="try-title" className="text-3xl tracking-tight md:text-4xl">
              Try it
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Two things from your dashboard. Pick your qualification, or drag
              the slider.
            </p>
          </div>
          <Tiggy
            action="time"
            className="hidden w-28 shrink-0 sm:block lg:w-32"
          />
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
        className="relative overflow-hidden border-y-2 border-[#17223b] bg-[#fff9ed] py-16 text-[#17223b] dark:bg-[#17223b] dark:text-white lg:py-24"
        aria-labelledby="features-title"
      >
        <div aria-hidden className="pointer-events-none absolute -left-10 top-10 size-36 rounded-full border-[20px] border-[#ffd86f]/60" />
        <div aria-hidden className="pointer-events-none absolute -right-12 bottom-16 size-44 rotate-12 rounded-[3rem] border-[18px] border-[#b5e8ef]/70" />
        <div className="container relative">
        <Reveal className="flex items-center justify-between gap-6">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex -rotate-2 rounded-full border-2 border-[#17223b] bg-[#ffdb70] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#17223b] shadow-[3px_3px_0_#17223b]">One login. Loads to explore.</p>
            <h2
              id="features-title"
              className="text-4xl font-black tracking-tight text-balance md:text-5xl"
            >
              Everything in one account
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#526078] dark:text-slate-200">
              Your study space, exam tools and student community all live together. Take a peek at what you can do.
            </p>
          </div>
          <Tiggy
            action="read"
            say="Let's make this year yours!"
            sayClassName="right-[80%] top-[10%]"
            className="hidden w-36 shrink-0 md:block lg:w-44"
          />
        </Reveal>
        <div className="mt-10">
          <FeatureGrid />
        </div>
        <p className="mt-10 text-center text-sm font-semibold text-[#526078] dark:text-slate-200">These are illustrative screen previews. Your dashboard and results are personal to you. <span className="ml-1 text-[#7048bb] dark:text-[#decaff]">🎮 Study games are coming soon.</span></p>
        </div>
      </section>

      <AppPreview />

      <section className="container py-20 text-center lg:py-28">
        <Reveal>
          <Tiggy action="graduate" className="mx-auto mb-8 w-36 md:w-44" />
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
