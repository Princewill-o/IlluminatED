import { Suspense } from "react";

import Image from "next/image";
import Link from "next/link";

import { DeletedNotice } from "@/components/deleted-notice";
import { DemoArcade, DemoShift } from "@/components/demo/demo";
import { CtaButtons, Reveal } from "@/components/landing";

const PROBLEMS = [
  ["Revision feels like a chore", "Students open the textbook, lose focus in ten minutes and close it. Streaks and quizzes alone don't stick."],
  ["Careers advice is a leaflet", "Most 16–19 year olds have never seen what a developer, receptionist or bank cashier actually does all day."],
  ["Nothing to put on a CV", "Applications for apprenticeships and part-time jobs ask for experience that sixth formers haven't had a chance to get."],
];

const STEPS = [
  {
    img: "/landing/world.webp",
    w: 1545,
    h: 1050,
    tag: "Explore",
    title: "A 3D London to walk around",
    text: "Students build a character and explore London with classmates: Big Ben, the Tube, company headquarters and their own house. Every door leads to something to learn.",
  },
  {
    img: "/landing/interview.webp",
    w: 880,
    h: 870,
    tag: "Work",
    title: "Real jobs, real tasks",
    text: "Interview at Goggle, a hospital or a pizza shop, then work shifts made of real tasks: fixing code, writing SQL, GDPR, triage, giving change. Every answer explains the why.",
  },
  {
    img: "/landing/panic.webp",
    w: 1545,
    h: 790,
    tag: "Revise",
    title: "Promotion Panic: revise to get promoted",
    text: "Answer GCSE, A level, BTEC and T Level questions against the clock to climb from intern to CEO. Wrong answers come back until they're learned.",
  },
  {
    img: "/landing/arcade.webp",
    w: 790,
    h: 620,
    tag: "Play",
    title: "60-second arcade games",
    text: "Times tables, the periodic table, binary and hex, key terms, units. Unlocked with Clout earned from work and revision. No real money, ever.",
  },
  {
    img: "/landing/home.webp",
    w: 1545,
    h: 900,
    tag: "Earn",
    title: "Spend what you earn",
    text: "Clout buys furniture, a bigger flat in Shoreditch and new outfits. It's the reason students come back tomorrow.",
  },
];

/** Public landing page. Signed-in visitors are sent to their dashboard by the middleware. */
export default function Home() {
  return (
    <>
      <Suspense fallback={null}>
        <DeletedNotice />
      </Suspense>

      <section className="container grid items-center gap-10 pt-10 pb-16 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:pt-16 lg:pb-24">
        <Reveal>
          <p className="text-sm font-bold tracking-widest text-primary uppercase">For colleges and sixth formers</p>
          <h1 className="mt-4 text-[2.6rem] leading-[1.03] tracking-tight text-balance md:text-6xl">The revision game that gets students job-ready.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            IlluminatED turns revision into a life sim. Students explore London, take on real jobs, earn in-game money and build experience they can honestly put on
            a CV, while practising for their GCSEs, A levels, BTECs and T Levels.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="#demo" className="inline-flex h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90">
              Try the demo
            </Link>
            <Link href="/sign-in?mode=sign-up" className="inline-flex h-12 items-center rounded-full border bg-card px-6 font-semibold hover:bg-muted">
              Create a free account
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">Free for students. No adverts. No real-money purchases.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-xl ring-1 ring-border">
            <Image src="/landing/world.webp" alt="A student's character walking through IlluminatED's London, by Big Ben and Westminster station" width={1545} height={1050} priority className="h-auto w-full" />
          </div>
        </Reveal>
      </section>

      <section className="border-y bg-card" aria-labelledby="problem-title">
        <div className="container py-16 lg:py-20">
          <h2 id="problem-title" className="max-w-2xl text-3xl tracking-tight md:text-4xl">
            The problem colleges tell us about
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map(([t, d]) => (
              <div key={t} className="rounded-3xl bg-background p-6">
                <p className="text-lg font-bold">{t}</p>
                <p className="mt-2 leading-7 text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16 lg:py-24" aria-labelledby="how-title">
        <p className="text-sm font-bold tracking-widest text-primary uppercase">The solution</p>
        <h2 id="how-title" className="mt-3 max-w-3xl text-3xl tracking-tight text-balance md:text-5xl">
          One game that covers revision, careers and employability
        </h2>
        <div className="mt-12 space-y-16 lg:space-y-24">
          {STEPS.map((s, i) => (
            <Reveal key={s.tag} className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div className="overflow-hidden rounded-[1.75rem] border-4 border-white bg-white shadow-lg ring-1 ring-border">
                <Image src={s.img} alt={s.title} width={s.w} height={s.h} className="h-auto w-full" />
              </div>
              <div>
                <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-black tracking-widest text-primary uppercase">{s.tag}</span>
                <h3 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">{s.title}</h3>
                <p className="mt-3 max-w-lg text-lg leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="demo" className="scroll-mt-20 border-y bg-secondary/60" aria-labelledby="demo-title">
        <div className="container py-16 lg:py-24">
          <h2 id="demo-title" className="text-3xl tracking-tight md:text-5xl">
            Try it now
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">No account needed. Pick a job and work a three-task shift, or race the clock in the arcade. Nothing is saved.</p>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <DemoShift />
            <div>
              <DemoArcade />
              <div className="mt-6 rounded-3xl bg-[#1f4fbf] p-6 text-white">
                <p className="text-xl font-bold">What it goes on a CV as</p>
                <p className="mt-3 font-mono text-sm leading-6 text-white/90">
                  Junior Developer, Goggle (simulated work experience on IlluminatED): completed 12 shifts of real technology tasks with 84% accuracy. Fix bugs, read and
                  trace code, and write SQL queries.
                </p>
                <p className="mt-3 text-sm text-white/75">Honest wording, real accuracy: something students can talk about in an interview.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16 lg:py-24" aria-labelledby="colleges-title">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold tracking-widest text-primary uppercase">For colleges and schools</p>
            <h2 id="colleges-title" className="mt-3 text-3xl tracking-tight md:text-4xl">
              Built for 16–19 study programmes
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              IlluminatED supports exam revision, Gatsby careers benchmarks and employability in one place, without adding work for staff.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["Exam revision", "Questions for GCSE resits, A level, BTEC and T Level subjects."],
              ["Encounters with employers", "Real job tasks across tech, health, finance, law, retail and hospitality."],
              ["Employability skills", "Customer service, data protection, coding, numeracy and written communication."],
              ["Safe by design", "No real-money purchases, age-appropriate chat, report and block for everyone."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-3xl border bg-card p-5">
                <p className="font-bold">{t}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{d}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4 rounded-3xl border bg-card p-6">
          <p className="flex-1 text-lg font-bold">Want IlluminatED for your college or sixth form?</p>
          <Link href="/contact" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
            Talk to us
          </Link>
        </div>
      </section>

      <section className="bg-[#13203a] text-white" aria-labelledby="creators-title">
        <div className="container flex flex-wrap items-center gap-6 py-14">
          <div className="flex-1">
            <h2 id="creators-title" className="text-2xl font-bold md:text-3xl">
              Students: get paid to post
            </h2>
            <p className="mt-2 max-w-xl text-white/80">Make TikToks, Reels or Shorts about IlluminatED, send us the link and we pay for every video we approve.</p>
          </div>
          <Link href="/creators" className="rounded-full bg-[#f2d9a6] px-6 py-3 font-bold text-[#13203a]">
            Join the creator scheme
          </Link>
        </div>
      </section>

      <section className="container py-20 text-center lg:py-28">
        <h2 className="mx-auto max-w-2xl text-3xl tracking-tight text-balance md:text-5xl">Start your first shift today.</h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">It takes about a minute to set up your subjects and your character.</p>
        <div className="mt-8">
          <CtaButtons center />
        </div>
      </section>
    </>
  );
}
