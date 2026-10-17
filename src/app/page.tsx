import { Suspense } from "react";

import Image from "next/image";
import Link from "next/link";

import { ArrowRight, Building2, Check, ClipboardCheck, GraduationCap, School, ShieldCheck, Sparkles, User } from "lucide-react";

import { DeletedNotice } from "@/components/deleted-notice";
import { Reveal } from "@/components/landing";

const AUDIENCES = [
  {
    icon: GraduationCap,
    title: "Students",
    text: "GCSE, A level, BTEC and T Level revision as a life sim: explore London, work real jobs, earn Clout and build a CV.",
  },
  {
    icon: School,
    title: "Schools and sixth forms",
    text: "Set homework that turns up as quests in the game, auto-marked, with a class view of who's done it and what they got wrong.",
  },
  {
    icon: Building2,
    title: "Colleges",
    text: "Resits, BTECs and T Levels, plus employability: real work tasks across tech, health, finance, law, retail and hospitality.",
  },
];

const FEATURES = [
  {
    img: "/landing/game-london.webp", w: 1440, h: 960, tag: "Explore",
    title: "Your school day. A whole new world.",
    text: "Walk through 3D London, discover company headquarters and hop between neighbourhoods. Your tasks, Clout and wellbeing stay with you as you explore.",
  },
  {
    img: "/landing/game-bus.webp", w: 1440, h: 960, tag: "Revise",
    title: "Make the journey count",
    text: "Jump on a bus and tackle three quick revision questions on the way. Practise, check your answers and arrive with a little more Focus.",
  },
  {
    img: "/landing/game-connect-four.webp", w: 1440, h: 960, tag: "Play",
    title: "A study break with a competitive streak",
    text: "Play Connect Four, draughts, noughts and crosses or London Tycoon. Challenge the computer, pass the device round or create an online room with friends.",
  },
  {
    img: "/landing/game-home.webp", w: 1440, h: 960, tag: "Unwind",
    title: "Somewhere to call your own",
    text: "Head back to your furnished home, look after your character’s needs and make room for your next goal. Earn Clout through play to unlock new furniture and bigger homes.",
  },
];

const FAQ = [
  ["Can I sign up on my own?", "Not directly. Every account is set up after a short call, so learners get the right courses and schools get the right classes. Book a demo and we'll take it from there."],
  ["How much does it cost?", "Individual students pay a monthly subscription. Schools, colleges and sixth forms get bundle pricing per learner, which works out cheaper. We agree the details on the call."],
  ["Is it safe for under-18s?", "Yes. There's no open chat between players, only set phrases. Teachers see usernames and homework scores, nothing else. No real-money purchases in the game."],
  ["Which courses does it cover?", "GCSEs, A levels, BTECs and T Levels across the main exam boards (AQA, Edexcel, OCR and more), plus employability skills."],
];

/** Public landing page. Signed-in visitors are sent to their dashboard by the middleware. */
export default function Home() {
  return (
    <>
      <Suspense fallback={null}>
        <DeletedNotice />
      </Suspense>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full bg-[#dde8fd] opacity-70 blur-3xl dark:bg-[#1b2c48]" />
        <div aria-hidden className="pointer-events-none absolute top-60 -left-40 size-[28rem] rounded-full bg-[#f2d9a6] opacity-50 blur-3xl dark:opacity-10" />
        <div className="relative container grid items-center gap-12 pt-10 pb-16 lg:grid-cols-[1fr_1.15fr] lg:pt-16 lg:pb-24">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3.5 py-1.5 text-sm font-semibold text-primary backdrop-blur">
              <Sparkles className="size-4" aria-hidden /> For students, schools, colleges and sixth forms
            </p>
            <h1 className="mt-6 text-[2.75rem] leading-[1.02] tracking-tight text-balance md:text-6xl lg:text-[4.2rem]">
              Revision that feels like a game. <span className="text-primary">Skills that last.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              IlluminatED is a cosy life sim for GCSE to sixth form. Students explore London, take on real jobs and complete their teachers&apos; homework as quests,
              building knowledge and experience they can put on a CV.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/book" className="inline-flex h-13 items-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
                Book a demo <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/sign-in" className="inline-flex h-13 items-center rounded-full border bg-card px-7 text-base font-semibold hover:bg-muted">
                Log in
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Accounts are set up after a short call.{" "}
              <Link href="/book?for=school" className="font-semibold text-primary underline underline-offset-4">
                School or college? Enquire here.
              </Link>
            </p>
          </Reveal>
          <Reveal delay={0.1} className="relative">
            <div className="overflow-hidden rounded-[2rem] border-[6px] border-white bg-white shadow-2xl shadow-[#13203a]/15 ring-1 ring-border dark:border-[#1b2c48]">
              <Image src="/landing/game-london.webp" alt="A student's character in IlluminatED's London, with today's tasks, needs and the weather on screen" width={1440} height={960} priority className="h-auto w-full" />
            </div>
            <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border bg-card p-4 shadow-xl sm:block">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Homework quest</p>
              <p className="mt-1 font-bold">12C Chemistry: Redox</p>
              <p className="text-sm text-muted-foreground">8 questions · due Thursday</p>
            </div>
            <div className="absolute -top-5 -right-3 hidden rounded-2xl bg-[#13203a] px-4 py-3 text-white shadow-xl sm:block">
              <p className="text-2xl font-black text-[#f2d9a6]">+80 Clout</p>
              <p className="text-xs text-white/70">Shift done at Goggle</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="border-y bg-card" aria-labelledby="who-title">
        <div className="container py-16 lg:py-20">
          <h2 id="who-title" className="max-w-2xl text-3xl tracking-tight md:text-4xl">
            Who it&apos;s for
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {AUDIENCES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-3xl bg-background p-7">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-6" aria-hidden />
                </span>
                <p className="mt-5 text-xl font-bold">{title}</p>
                <p className="mt-2 leading-7 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product ── */}
      <section className="container py-20 lg:py-28" aria-labelledby="how-title">
        <p className="text-sm font-bold tracking-widest text-primary uppercase">The platform</p>
        <h2 id="how-title" className="mt-3 max-w-3xl text-3xl tracking-tight text-balance md:text-5xl">
          Revision, careers and wellbeing in one world students want to open
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">A look inside the current game, captured in daylight with a demonstration character.</p>
        <div className="mt-14 space-y-20 lg:space-y-28">
          {FEATURES.map((s, i) => (
            <Reveal key={s.tag} className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div className="overflow-hidden rounded-[1.75rem] border-[6px] border-white bg-white shadow-xl shadow-[#13203a]/10 ring-1 ring-border dark:border-[#1b2c48]">
                <Image src={s.img} alt={s.title} width={s.w} height={s.h} sizes="(max-width: 1024px) 100vw, 50vw" className="h-auto w-full" />
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

      <section className="container pb-20" aria-labelledby="more-game-title">
        <h2 id="more-game-title" className="text-3xl tracking-tight">More than the school run</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[
            { image: "/landing/game-highlands.webp", title: "Take the scenic route", text: "Visit the Highlands, explore Glen Lorne and take a change of scenery." },
            { image: "/landing/game-hub.webp", title: "Find your next favourite game", text: "Browse the Games Hub for board games, computer opponents and online rooms." },
          ].map((shot) => (
            <figure key={shot.image} className="overflow-hidden rounded-3xl border bg-card shadow-sm">
              <Image src={shot.image} alt={shot.title} width={1440} height={960} sizes="(max-width: 768px) 100vw, 50vw" className="h-auto w-full" />
              <figcaption className="p-6"><h3 className="text-xl font-bold">{shot.title}</h3><p className="mt-2 leading-relaxed text-muted-foreground">{shot.text}</p></figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── For teachers ── */}
      <section className="bg-[#13203a] text-white" aria-labelledby="teachers-title">
        <div className="container grid gap-12 py-20 lg:grid-cols-[1fr_1.1fr] lg:py-24">
          <div>
            <p className="text-sm font-bold tracking-widest text-[#f2d9a6] uppercase">For teachers</p>
            <h2 id="teachers-title" className="mt-3 text-3xl tracking-tight md:text-4xl">
              Set homework once. Watch it get done.
            </h2>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/75">
              Pick topics from our GCSE, A level, BTEC and T Level question bank, set a due date, and it appears as a quest in every student&apos;s game.
            </p>
            <Link href="/book?for=school" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#f2d9a6] px-6 py-3 font-semibold text-[#13203a]">
              Enquire for your school <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              [ClipboardCheck, "Auto-marked", "Answers are marked instantly, with explanations, and students earn Clout for a first go."],
              [Sparkles, "Knowledge gaps", "See the topics your class gets wrong most, across every piece of homework."],
              [ShieldCheck, "GDPR by design", "Teachers see usernames and scores only. Leaving a class deletes a student's answers."],
              [Check, "Safe social", "Preset phrases and reactions only: no open chat, no real-money purchases."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Check;
              return (
                <li key={t as string} className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
                  <I className="size-6 text-[#f2d9a6]" aria-hidden />
                  <p className="mt-4 font-bold">{t as string}</p>
                  <p className="mt-1 text-sm leading-6 text-white/70">{d as string}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="container py-20 lg:py-28" aria-labelledby="pricing-title">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-widest text-primary uppercase">Pricing</p>
          <h2 id="pricing-title" className="mt-3 text-3xl tracking-tight md:text-5xl">
            Cheaper together
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Individuals can subscribe monthly. Schools, colleges and sixth forms save with a bundle for all their learners.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-[2rem] border bg-card p-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
              <User className="size-6" aria-hidden />
            </span>
            <p className="mt-5 text-xl font-bold">Individual</p>
            <p className="mt-1 text-muted-foreground">For a student, or a parent buying for their child.</p>
            <p className="mt-6">
              <span className="text-4xl font-bold tracking-tight">£5.99</span> <span className="text-muted-foreground">a month</span>
            </p>
            <ul className="mt-6 space-y-2.5 text-[15px]">
              {["The full game: London, jobs, arcade and Promotion Panic", "Every course and exam board", "Cancel any time"].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <Link href="/book?for=individual" className="mt-8 inline-flex justify-center rounded-full border-2 border-primary px-6 py-3 font-semibold text-primary hover:bg-primary/5">
              Book a call to get started
            </Link>
          </div>
          <div className="relative flex flex-col rounded-[2rem] bg-primary p-8 text-primary-foreground shadow-2xl shadow-primary/25">
            <span className="absolute top-6 right-6 rounded-full bg-[#f2d9a6] px-3 py-1 text-xs font-black text-[#13203a]">Best value</span>
            <span className="grid size-12 place-items-center rounded-2xl bg-white/15">
              <School className="size-6" aria-hidden />
            </span>
            <p className="mt-5 text-xl font-bold">Schools, colleges and sixth forms</p>
            <p className="mt-1 text-primary-foreground/80">One bundle for every learner and teacher.</p>
            <p className="mt-6">
              <span className="text-4xl font-bold tracking-tight">Bundle pricing</span>
            </p>
            <p className="text-primary-foreground/80">per learner, cheaper than individual plans, agreed on a call</p>
            <ul className="mt-6 space-y-2.5 text-[15px]">
              {["Everything in Individual for all learners", "Teacher dashboard, classes and homework", "Results and knowledge-gap reports", "Set-up, training and a data processing agreement"].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 size-5 shrink-0" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <Link href="/book?for=school" className="mt-8 inline-flex justify-center rounded-full bg-white px-6 py-3 font-semibold text-[#13203a] hover:bg-[#f7f1e6]">
              Enquire for your school or college
            </Link>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Are you a school or college? <Link href="/book?for=school" className="font-semibold text-primary underline underline-offset-4">Tell us about your learners</Link> and we&apos;ll put together a bundle.
        </p>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t bg-card" aria-labelledby="faq-title">
        <div className="container grid gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 id="faq-title" className="text-3xl tracking-tight md:text-4xl">
            Questions
          </h2>
          <dl className="divide-y">
            {FAQ.map(([q, a]) => (
              <div key={q} className="py-5 first:pt-0">
                <dt className="text-lg font-bold">{q}</dt>
                <dd className="mt-2 leading-7 text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Final call ── */}
      <section className="container py-20 lg:py-28">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#13203a] px-8 py-16 text-center text-white md:px-16">
          <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-primary/40 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-[#2b5fd9]/30 blur-3xl" />
          <h2 className="relative mx-auto max-w-2xl text-3xl tracking-tight text-balance md:text-5xl">Bring IlluminatED to your learners</h2>
          <p className="relative mx-auto mt-4 max-w-lg text-lg text-white/75">A 20-minute call, a walkthrough of the platform, and access set up for you.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/book" className="inline-flex h-13 items-center gap-2 rounded-full bg-[#f2d9a6] px-7 font-semibold text-[#13203a]">
              Book a demo <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/sign-in" className="inline-flex h-13 items-center rounded-full border border-white/30 px-7 font-semibold hover:bg-white/10">
              Log in
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
