import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";

import { SiteStructuredData } from "@/components/seo/structured-data";

export const metadata: Metadata = {
  title: { absolute: "IlluminatED | Revision, career practice and homework in one learning game" },
  description:
    "A learning game for UK students aged 13+: practise subjects, apply knowledge in simulated workplaces and track progress. Request invited beta access or a school demo.",
  alternates: { canonical: "/" },
};
const steps = [
  {
    icon: BookOpen,
    title: "Practise a topic",
    text: "Choose your subject and complete a short question session. Read feedback and revisit what you missed.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Apply what you know",
    text: "Walk into a simulated workplace. Use a computer or counter to tackle practical numeracy, reading and problem-solving tasks.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "See your next step",
    text: "Review saved answers and skill practice. Teachers can assign homework and review their own classes’ results.",
  },
];
export default function Home() {
  return (
    <>
      <SiteStructuredData />
      <section className="border-b bg-background text-foreground">
        <div className="container grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-xs font-bold tracking-widest text-primary uppercase">
              Invited beta · UK learners aged 13+
            </p>
            <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight sm:text-6xl">
              Revision and career practice in one learning game.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              IlluminatED is a learning platform for UK students aged 13+.
              Answer subject questions with explanations, complete simulated
              workplace tasks and see what to practise next—all inside a playable
              city. Teachers can set homework and review their classes’ results.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link prefetch={false}
                href="/book?for=individual"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground"
              >
                Request beta access <ArrowRight className="size-4" />
              </Link>
              <Link prefetch={false}
                href="/schools"
                className="inline-flex min-h-12 items-center rounded-full border border-border bg-card px-6 py-3 font-bold"
              >
                For schools
              </Link>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Access is by invitation while we test reliability and learning
              outcomes. Already invited?{" "}
              <Link prefetch={false} href="/sign-in" className="font-bold underline">
                Sign in
              </Link>
              .
            </p>
          </div>
          <figure>
            <Image
              src="/landing/game-study-october.jpg"
              alt="IlluminatED’s actual Study Quarter game scene"
              width={1440}
              height={960}
              priority
              className="w-full rounded-3xl border-4 border-border shadow-xl"
            />
            <figcaption className="mt-3 text-xs text-muted-foreground">
              Actual game capture. Ambient residents are computer controlled;
              this is not a live player count.
            </figcaption>
          </figure>
        </div>
      </section>
      <section className="container py-14" aria-labelledby="problem-title">
        <p className="text-primary text-xs font-bold tracking-widest uppercase">
          The problem we are solving
        </p>
        <h2
          id="problem-title"
          className="mt-3 max-w-3xl text-3xl font-bold tracking-tight"
        >
          Starting revision is hard. Knowing what to practise next should be
          easier.
        </h2>
        <p className="text-muted-foreground mt-4 max-w-3xl leading-8">
          Students can move between notes, questions and games without a
          consistent practice routine. IlluminatED brings short practice
          sessions, explanations and practical applications into one learning
          journey.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <article key={title} className="bg-card rounded-3xl border p-6">
              <Icon className="text-primary size-6" aria-hidden />
              <p className="text-muted-foreground mt-5 text-xs font-bold">
                STEP {i + 1}
              </p>
              <h3 className="mt-2 text-xl font-bold">{title}</h3>
              <p className="text-muted-foreground mt-3 leading-7">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-y bg-secondary text-foreground">
        <div className="container grid items-center gap-8 py-14 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold tracking-widest text-primary uppercase">
              See the product
            </p>
            <h2 className="mt-3 text-3xl font-bold">
              Learn by answering questions and solving workplace challenges.
            </h2>
            <p className="mt-4 leading-8 text-muted-foreground">
              Visit the Study Quarter, complete a session and use earned Clout
              to personalise your character and home. Workplace tasks connect
              classroom knowledge with simulated decisions.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Clout is an in-game reward with no cash value. Career records
              describe simulated practice, not employment or accredited
              qualifications.
            </p>
          </div>
          <figure>
            <video
            aria-label="IlluminatED gameplay preview"
              controls
              playsInline
              preload="none"
              poster="/landing/gameplay-poster.jpg"
              className="aspect-[3/2] w-full rounded-3xl border border-border"
            >
              <source src="/landing/gameplay.mp4" type="video/mp4" />
              <source src="/landing/gameplay.webm" type="video/webm" />
              <a href="/landing/gameplay.mp4">Download the gameplay clip</a>
            </video>
            <figcaption className="mt-3 text-xs text-muted-foreground">
              Recorded offline preview · silent clip · no real student accounts
              or conversations
            </figcaption>
          </figure>
        </div>
      </section>
      <section className="container py-14" aria-labelledby="access-title">
        <h2 id="access-title" className="text-3xl font-bold">
          One product. Clear ways to access it.
        </h2>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {[
            [
              "Learners",
              "Invited learners can use the core study tools for free. Optional Premium is £5.99/month when live checkout is available; it is not required for core revision.",
              "/book?for=individual",
              "Request an invitation",
            ],
            [
              "Schools and colleges",
              "School licences cover agreed learner seats, teacher workflows and onboarding. Seat pricing and pilot scope are agreed in writing before purchase.",
              "/book?for=school",
              "Discuss a school pilot",
            ],
            [
              "Investors and partners",
              "Understand the product, revenue model and pilot questions. We distinguish built features from evidence we still need to collect.",
              "/investors",
              "Read the business overview",
            ],
          ].map(([title, text, href, label]) => (
            <article key={title} className="rounded-3xl border p-6">
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="text-muted-foreground mt-3 leading-7">{text}</p>
              <Link prefetch={false}
                href={href}
                className="text-primary mt-5 inline-flex min-h-11 items-center font-bold underline"
              >
                {label}
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-card border-t">
        <div className="container grid gap-8 py-12 md:grid-cols-2">
          <div>
            <ShieldCheck className="text-primary size-6" aria-hidden />
            <h2 className="mt-3 text-2xl font-bold">
              A measured beta, with honest expectations.
            </h2>
            <p className="text-muted-foreground mt-4 leading-7">
              We are testing usability, device performance and learning
              engagement. We have not independently demonstrated improved exam
              grades. Course and resource availability varies: check the
              subject, board and source before revising.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold">Before you join</h3>
            <ul className="text-muted-foreground mt-4 space-y-3 leading-7">
              <li>
                For ages 13+. Use a username and keep personal information
                private.
              </li>
              <li>
                Review the{" "}
                <Link prefetch={false} href="/safeguarding" className="underline">
                  safeguarding information
                </Link>
                , including messaging limitations.
              </li>
              <li>
                Report problems through{" "}
                <Link prefetch={false} href="/contact" className="underline">
                  support
                </Link>
                . AI and practice questions can contain mistakes.
              </li>
              <li>
                Schools can review access and data requirements before agreeing
                a pilot.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
