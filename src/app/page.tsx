import { Suspense } from "react";

import Image from "next/image";
import Link from "next/link";

import { ArrowRight, BookOpen, BriefcaseBusiness, Building2, Check, ClipboardCheck, GraduationCap, School, ShieldCheck, Sparkles, Trophy, User } from "lucide-react";
import type { Metadata } from "next";

import { DeletedNotice } from "@/components/deleted-notice";
import { LearningEvidence } from "@/components/landing/learning-evidence";
import { Reveal } from "@/components/landing/reveal";
import { SiteStructuredData } from "@/components/seo/structured-data";

export const metadata:Metadata={title:{absolute:"IlluminatED | GCSE & A-Level Revision Games for Schools"},description:"A UK education and simulated work experience platform: GCSE and sixth-form revision, in-game study, career tasks, homework quests and learning awards.",alternates:{canonical:"/"},openGraph:{url:"/",title:"IlluminatED | GCSE & A-Level Revision Games for Schools"}};

const AUDIENCES = [
  {
    icon: GraduationCap,
    title: "Students",
    text: "Study GCSE, A level, BTEC and T Level subjects, try simulated workplace tasks and see your learning progress in a playable city.",
  },
  {
    icon: School,
    title: "Schools and sixth forms",
    text: "Set homework that turns up as quests in the game, auto-marked, with a class view of who's done it and what they got wrong.",
  },
  {
    icon: Building2,
    title: "Colleges",
    text: "Resits, BTECs and T Levels, plus simulated workplace scenarios across tech, health, finance, law, retail and hospitality.",
  },
];

const FEATURES = [
  {
    img: "/landing/game-study-october.jpg", w: 1440, h: 960, tag: "Study",
    title: "A place to focus, inside your game",
    text: "Head to the Study Quarter for short, untimed subject sessions. Answer five questions, read the explanations and save your progress. Study on the Learn dashboard whenever you want a quieter route.",
  },
  {
    img: "/landing/interview.webp", w: 1440, h: 960, tag: "Practise work",
    title: "Try a career before choosing a path",
    text: "Explore roles and complete simulated workplace tasks, from interviews to day-to-day decisions. Build a record of the skills you have practised. Your learning record captures simulated practice and skill development.",
  },
  {
    img: "/landing/game-bus.webp", w: 1440, h: 960, tag: "Revise",
    title: "Small moments. More practice.",
    text: "Use quizzes, flashcards and timed exam practice to check what you know. Even a bus journey through the city can include a few revision questions with feedback.",
  },
  {
    img: "/landing/game-city-life.webp", w: 1440, h: 960, tag: "Progress",
    title: "Give your learning a sense of progress",
    text: "Earn XP, in-game Clout and learning awards for study and workplace practice. Explore London, customise your character and return to your own home between learning sessions.",
  },
];

const FAQ = [
  ["Can I sign up on my own?", "Not directly. Every account is set up after a short call, so learners get the right courses and schools get the right classes. Book a demo and we'll take it from there."],
  ["How much does it cost?", "Individual students pay a monthly subscription. Schools, colleges and sixth forms get bundle pricing per learner, which works out cheaper. We agree the details on the call."],
  ["How does communication work?", "Public city interactions use preset phrases. Mutual friends can exchange encrypted private messages, with block and report controls. Private messages cannot be routinely read by moderators; reporting shares the selected message. See our safeguarding page for details."],
  ["Which courses does it cover?", "GCSEs, A levels, BTECs and T Levels across the main exam boards (AQA, Edexcel, OCR and more), plus employability skills."],
];

/** Public landing page. Signed-in visitors are sent to their dashboard by the middleware. */
export default function Home() {
  return (
    <>
      <SiteStructuredData/>
      <Suspense fallback={null}>
        <DeletedNotice />
      </Suspense>

      <nav aria-label="Explore IlluminatED" className="container flex flex-wrap gap-x-5 gap-y-1 pt-2 text-sm font-semibold text-primary"><Link href="/schools">For schools and teachers</Link><Link href="/revision-games">Revision games for students</Link></nav>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full bg-[#dde8fd] opacity-70 blur-3xl dark:bg-[#1b2c48]" />
        <div aria-hidden className="pointer-events-none absolute top-60 -left-40 size-[28rem] rounded-full bg-[#f2d9a6] opacity-50 blur-3xl dark:opacity-10" />
        <div className="relative container grid items-center gap-8 pt-7 pb-12 sm:pt-10 sm:pb-16 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:py-16">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3.5 py-1.5 text-xs leading-5 font-semibold text-primary backdrop-blur sm:text-sm">
              <Sparkles className="size-4" aria-hidden /> For students, schools, colleges and sixth forms
            </p>
            <h1 className="mt-5 text-[clamp(2.1rem,4.4vw,3.65rem)] leading-[1.08] tracking-tight text-balance">
              Learn for exams. Practise work skills. <span className="text-primary">Grow through play.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              IlluminatED brings education and simulated work experience into a playable city. Study your subjects, complete homework quests and try workplace challenges, with saved progress and awards that make the next step feel achievable.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/book" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
                Book a demo <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/sign-in" className="inline-flex min-h-11 items-center rounded-full border bg-card px-6 py-2.5 text-sm font-semibold hover:bg-muted">
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
          <Reveal className="relative">
            <div className="overflow-hidden rounded-[2rem] border-[6px] border-white bg-white shadow-2xl shadow-[#13203a]/15 ring-1 ring-border dark:border-[#1b2c48]">
              <Image src="/landing/game-study-october.jpg" alt="Actual IlluminatED Study Quarter capture with a staff workplace badge, ambient residents and learning controls" width={1440} height={960} priority className="h-auto w-full" />
            </div>
            <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border bg-card p-4 shadow-xl sm:block">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Homework quest</p>
              <p className="mt-1 font-bold">12C Chemistry: Redox</p>
              <p className="text-sm text-muted-foreground">8 questions · due Thursday</p>
            </div>
            <div className="absolute -top-5 -right-3 hidden rounded-2xl bg-[#13203a] px-4 py-3 text-white shadow-xl sm:block">
              <p className="text-2xl font-black text-[#f2d9a6]">+80 Clout</p>
              <p className="text-xs text-white/70">Simulated shift complete</p>
            </div>
          </Reveal>
        </div>
      </section>

      <LearningEvidence />

      <section className="border-y bg-[#13203a] text-white" aria-labelledby="gameplay-title"><div className="container grid items-center gap-8 py-14 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-xs font-bold tracking-widest text-[#f2d9a6] uppercase">See the actual game</p><h2 id="gameplay-title" className="mt-3 text-3xl tracking-tight sm:text-4xl">Your next chapter has a city around it.</h2><p className="mt-4 leading-7 text-white/75">Walk through London, find the Study Quarter and take a break between questions. Earn Clout through learning, build your collection and return for weekly study challenges.</p><p className="mt-3 text-xs leading-5 text-white/60">Recorded in the real game using an offline preview. Ambient residents are computer controlled. Silent clip; no student conversations or personal accounts are shown.</p><a href="#study-circle" className="mt-5 inline-block min-h-11 font-bold text-[#f2d9a6] underline">See the social side ↓</a></div><figure><video controls playsInline preload="none" poster="/landing/game-city-life.webp" className="aspect-[3/2] w-full rounded-3xl border border-white/20 bg-black"><source src="/landing/gameplay.webm" type="video/webm" /><p>Your browser cannot play this clip. <a href="/landing/gameplay.webm">Download the gameplay video</a>.</p></video><figcaption className="mt-3 text-xs text-white/60">IlluminatED London · actual game footage · 12-second preview</figcaption></figure></div></section>

      <section id="study-circle" aria-labelledby="study-circle-title" className="container grid items-center gap-10 py-16 lg:grid-cols-2"><div><p className="text-xs font-bold tracking-widest text-primary uppercase">A place to connect</p><h2 id="study-circle-title" className="mt-3 text-3xl tracking-tight sm:text-4xl">The world is shared.<br />Your conversations are yours.</h2><p className="mt-5 max-w-lg leading-7 text-muted-foreground">Meet up in the city, compare ideas and encourage each other to keep learning. Add people you know by username, accept their request and build a circle of up to 30 friends.</p><ul className="mt-5 space-y-3 text-sm">{["Mutual requests before private messaging", "Browser encryption with a security code to compare", "Block players and report a selected message"].map(t => <li key={t} className="flex gap-2"><ShieldCheck className="size-5 shrink-0 text-primary" />{t}</li>)}</ul><p className="mt-4 text-xs leading-5 text-muted-foreground">Messaging keys currently belong to one browser. Keep your original device to read your history. Encrypted conversations cannot be routinely monitored by moderators.</p></div><figure><Image src="/landing/game-conversation-demo.jpg" alt="Illustrative IlluminatED conversation with two game characters discussing a study session, clearly labelled Demo conversation" width={544} height={569} sizes="(max-width: 1024px) 100vw, 45vw" className="mx-auto h-auto w-full max-w-xl rounded-3xl border shadow-xl" /><figcaption className="mt-3 text-xs text-muted-foreground">An illustrative conversation captured from our preview. No real student messages are shown.</figcaption></figure></section>

      <section className="relative overflow-hidden border-y bg-[#dde8fd] dark:bg-[#14223a]" aria-labelledby="city-life-title">
        <div aria-hidden className="pointer-events-none absolute -right-20 -bottom-32 size-96 rounded-full border-[35px] border-white/30" />
        <div className="relative container grid items-center gap-10 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-card px-3 py-1.5 text-xs font-black tracking-widest text-primary uppercase"><Sparkles className="size-4" aria-hidden /> A city with a pulse</span>
            <h2 id="city-life-title" className="mt-5 text-3xl leading-tight tracking-tight sm:text-4xl">A little life between lessons.</h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">Walk past residents, cyclists and passing traffic. Find a spot in the Study Quarter Lobby, take a revision break and call a company from your own game phone.</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Ambient residents are computer controlled. Online friends join through the game’s multiplayer features.</p>
            <div className="mt-6 flex flex-wrap gap-2">{["Explore", "Meet up", "Call companies", "Make it yours"].map(label=><span key={label} className="rounded-xl border-2 border-primary/15 bg-card px-3 py-2 text-sm font-bold shadow-[0_3px_0_rgba(19,32,58,0.08)]">{label}</span>)}</div>
          </div>
          <div className="relative pb-12 sm:pr-12 sm:pb-16">
            <figure className="relative rotate-[-1deg] overflow-hidden rounded-[1.75rem] border-[7px] border-white bg-white text-[#13203a] shadow-[10px_12px_0_#8fb4ff]">
              <div className="flex items-center justify-between px-3 py-2 text-xs font-black"><span>Inside the Study Quarter</span><span className="rounded-full bg-[#e8eefb] px-2 py-1 text-[#1f4fbf]">CPU residents</span></div>
              <Image src="/landing/game-lobby.webp" alt="Several computer-controlled residents sharing the furnished Study Quarter Lobby" width={1440} height={960} sizes="(max-width: 1024px) 100vw, 55vw" className="h-auto w-full rounded-xl" />
              <figcaption className="px-3 py-3 text-sm font-bold">Your next stop: a game, a study session or a catch-up.</figcaption>
            </figure>
            <figure className="relative z-10 -mt-14 ml-auto w-[52%] rotate-[3deg] overflow-hidden rounded-2xl border-[5px] border-white bg-[#13203a] text-white shadow-xl sm:absolute sm:right-0 sm:bottom-0 sm:mt-0 sm:w-[43%]">
              <Image src="/landing/game-phone.webp" alt="The in-game phone with a searchable directory of fictional companies" width={1440} height={960} sizes="(max-width: 640px) 50vw, 25vw" className="h-auto w-full" />
              <figcaption className="px-3 py-2 text-xs font-black">Your city. On speed dial.</figcaption>
            </figure>
          </div>
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

      <section className="container py-12 sm:py-16" aria-labelledby="learning-loop-title">
        <h2 id="learning-loop-title" className="text-3xl tracking-tight">A clear next step every time you log in</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BookOpen, title: "Study your subjects", text: "Your courses, questions, explanations, flashcards and exam practice, together on Learn." },
            { icon: BriefcaseBusiness, title: "Explore work", text: "Try career scenarios and practise communication, problem-solving and workplace decisions." },
            { icon: ClipboardCheck, title: "Follow your quests", text: "Teacher-set homework appears in your game, with deadlines and marked answers." },
            { icon: Trophy, title: "Keep growing", text: "Private saved study progress, skill records and eight learning awards show what you have achieved." },
          ].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border bg-card p-5"><Icon className="size-5 text-primary" aria-hidden /><h3 className="mt-3 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}
        </div>
      </section>

      {/* ── Product ── */}
      <section className="container pb-14 sm:pb-20" aria-labelledby="how-title">
        <p className="text-sm font-bold tracking-widest text-primary uppercase">The platform</p>
        <h2 id="how-title" className="mt-3 max-w-3xl text-3xl tracking-tight text-balance md:text-5xl">
          Subject learning and workplace practice, connected by play
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">One place for exam preparation, simulated work experience and a learning journey you can see.</p>
        <div className="mt-8 space-y-12 lg:space-y-16">
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
              [Check, "Social controls", "Public preset phrases, mutual friend requests, encrypted messages, blocking and selected-message reports."],
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
              {["London, Study Quarter, career simulations and games", "Supported subjects and linked official resources", "Cancel any time"].map((t) => (
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
            <Link href="/book" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f2d9a6] px-7 font-semibold text-[#13203a]">
              Book a demo <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/sign-in" className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-7 font-semibold hover:bg-white/10">
              Log in
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
