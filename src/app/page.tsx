import Image from "next/image";
import Link from "next/link";

// eslint-disable-next-line import/no-unresolved -- resolved through the package "exports" map
import { GeistSans } from "geist/font/sans";
import { ArrowRight, CalendarCheck, ListChecks, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { SiteStructuredData } from "@/components/seo/structured-data";

export const metadata: Metadata = {
  title: { absolute: "IlluminatED | Revision, career practice and homework in one learning game" },
  description:
    "A learning game for UK students aged 13+: practise subjects, apply knowledge in simulated workplaces and track progress, with a study agent that plans your week. Request invited beta access or a school demo.",
  alternates: { canonical: "/" },
};

const display = `${GeistSans.className} font-medium tracking-[-0.035em]`;

/** Soft cartoon clouds: stacked blurred circles, no images needed. */
function Cloudbank({ className = "" }: { className?: string }) {
  const puffs = [
    [0, 60, 220], [140, 20, 260], [330, 50, 230], [500, 0, 300], [720, 40, 260], [900, 10, 300], [1110, 50, 240], [1280, 20, 280],
  ];
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-x-0 overflow-hidden ${className}`}>
      <div className="relative mx-auto h-full max-w-[1500px]">
        {puffs.map(([x, y, s], i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/90 blur-[2px]"
            style={{ left: x, top: y, width: s, height: s, boxShadow: "inset -18px -24px 40px rgba(170,150,230,0.35)" }}
          />
        ))}
      </div>
    </div>
  );
}

function Mascot({ src, className, delay = "0s" }: { src: string; className: string; delay?: string }) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      width={260}
      height={260}
      className={`landing-float pointer-events-none absolute [mask-image:linear-gradient(to_bottom,black_70%,transparent)] drop-shadow-[0_20px_30px_rgba(36,33,94,0.35)] ${className}`}
      style={{ animationDelay: delay }}
    />
  );
}

export default function Home() {
  return (
    <div className="bg-white text-[#1b1a18] dark:bg-white">
      <SiteStructuredData />

      {/* Hero: a dusk-indigo sky with clouds and Tiggy floating by. */}
      <section className="relative -mt-[76px] overflow-hidden pt-[76px] text-white" aria-labelledby="hero-title">
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,#2f2c72_0%,#3f3990_38%,#7d6ec4_68%,#d8ccf1_86%,#ffffff_100%)]" />
        <div aria-hidden className="landing-stars absolute inset-0 opacity-70" />
        <Mascot src="/brand/tiggy/wave.webp" className="top-[300px] -left-6 hidden w-52 sm:block lg:left-4 lg:w-60" />
        <Mascot src="/brand/tiggy/graduate.webp" className="top-[230px] -right-4 hidden w-48 sm:block lg:right-6 lg:w-56" delay="-2s" />
        <Mascot src="/brand/tiggy/read.webp" className="top-[470px] left-[22%] hidden w-24 md:block" delay="-4s" />
        <div className="relative container flex flex-col items-center pt-16 pb-48 text-center sm:pt-24 sm:pb-56">
          <Image src="/brand/tiggy/wave.webp" alt="" aria-hidden width={120} height={120} className="landing-float mb-4 w-24 [mask-image:linear-gradient(to_bottom,black_70%,transparent)] sm:hidden" />
          <p className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm text-white/90 backdrop-blur">
            Invited beta · UK learners aged 13+
          </p>
          <h1 id="hero-title" className={`${display} mt-6 max-w-4xl text-5xl leading-[1.02] text-balance sm:text-7xl`}>
            Revision that plays like a game
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/85">
            Practise your subjects, take on simulated workplace challenges and explore a 3D London, with a study agent that
            plans your week and quizzes you on your homework.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link prefetch={false} href="/book?for=individual" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-black/5 bg-white px-6 font-medium text-[#1b1a18] shadow-sm transition hover:bg-white/90">
              Request beta access <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link prefetch={false} href="/schools" className="inline-flex min-h-12 items-center rounded-xl bg-[#17152e] px-6 font-medium text-white shadow-sm transition hover:bg-[#25224a]">
              For schools
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/75">
            Already invited?{" "}
            <Link prefetch={false} href="/sign-in" className="font-medium text-white underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
        <Cloudbank className="bottom-0 h-56" />
      </section>

      {/* The product, framed like a workspace on a warm pastel wash. */}
      <section className="container -mt-24 pb-20" aria-label="Product preview">
        <div className="relative rounded-[28px] bg-[linear-gradient(135deg,#fde4d4_0%,#f6d6e9_50%,#e3dcfb_100%)] p-4 pt-16 shadow-[0_30px_80px_rgba(47,44,114,0.18)] sm:p-10 sm:pt-20">
          <p className="absolute top-5 left-1/2 flex w-[calc(100%-2rem)] max-w-max -translate-x-1/2 items-center gap-2 rounded-full bg-[#2a2833]/85 px-4 py-2 text-sm text-white backdrop-blur sm:top-7">
            <Sparkles className="size-4 shrink-0" aria-hidden />
            <span className="truncate">This is your study space: the game, your homework and an agent to ask.</span>
          </p>
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            <div className="flex items-center gap-1.5 border-b px-4 py-3" aria-hidden>
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
            </div>
            <video
              className="block aspect-video w-full"
              src="/landing/illumed-film.mp4"
              poster="/landing/illumed-film-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              aria-label="Short film showing the IlluminatED game world and the study agent planning a revision week"
            />
          </div>
        </div>
      </section>

      {/* The agent, with small product snippets rather than stock art. */}
      <section className="container pb-20" aria-labelledby="agent-title">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-[#5b56c8]">The study agent</p>
          <h2 id="agent-title" className={`${display} mt-3 text-4xl sm:text-5xl`}>
            An agent that does the revision admin.
          </h2>
          <p className="mt-4 text-lg leading-8 text-[#1b1a18]/70">
            It works over your own homework, subjects and exam date, and asks before anything goes to your teacher. The same
            safeguarding as Ask Tiggy applies.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-3xl bg-[#f6f5f2] p-6">
            <CalendarCheck className="size-5 text-[#5b56c8]" aria-hidden />
            <h3 className="mt-4 text-lg font-semibold">Plans your week</h3>
            <p className="mt-2 text-[#1b1a18]/70">Homework deadlines first, then short sessions building up to your exam.</p>
            <div className="mt-5 flex gap-1.5" aria-hidden>
              {["M", "T", "W", "T", "F"].map((d, i) => (
                <span key={i} className={`grid size-9 place-items-center rounded-lg text-sm font-semibold ${i < 3 ? "bg-[#5b56c8] text-white" : "bg-white text-[#1b1a18]/60"}`}>{d}</span>
              ))}
            </div>
          </article>
          <article className="rounded-3xl bg-[#f6f5f2] p-6">
            <ListChecks className="size-5 text-[#5b56c8]" aria-hidden />
            <h3 className="mt-4 text-lg font-semibold">Quizzes what was set</h3>
            <p className="mt-2 text-[#1b1a18]/70">Five questions on the topics your teacher assigned, explained as you go.</p>
            <div className="mt-5 rounded-xl bg-white p-3 text-sm shadow-sm" aria-hidden>
              <p className="font-medium">Which organelle releases energy?</p>
              <p className="mt-2 rounded-lg bg-[#e8f7ee] px-3 py-1.5 text-[#1f7a46]">Mitochondria. Correct</p>
            </div>
          </article>
          <article className="rounded-3xl bg-[#f6f5f2] p-6">
            <Sparkles className="size-5 text-[#5b56c8]" aria-hidden />
            <h3 className="mt-4 text-lg font-semibold">Asks before it acts</h3>
            <p className="mt-2 text-[#1b1a18]/70">Nothing is sent or shared without a yes from you.</p>
            <div className="mt-5 rounded-xl bg-white p-3 text-sm shadow-sm" aria-hidden>
              <p className="font-medium">Add Thursday's chemistry session to your plan?</p>
              <div className="mt-2 flex gap-2">
                <span className="rounded-lg bg-[#17152e] px-3 py-1.5 text-white">Yes, add it</span>
                <span className="rounded-lg border px-3 py-1.5">Not now</span>
              </div>
            </div>
          </article>
        </div>
        <Link prefetch={false} href="/agent" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#17152e] px-6 font-medium text-white">
          Try the study agent <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>

      {/* How it works, in three numbered steps. */}
      <section className="border-y border-black/5 bg-[#faf9f7]" aria-labelledby="how-title">
        <div className="container grid gap-10 py-20 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h2 id="how-title" className={`${display} text-4xl sm:text-5xl`}>Learn it, use it, see what&apos;s next.</h2>
            <ol className="mt-8 space-y-6">
              {[
                ["Practise a topic", "Choose a subject and complete a short question session. Read the feedback and revisit what you missed."],
                ["Apply what you know", "Walk into a simulated workplace and tackle practical numeracy, reading and problem-solving tasks."],
                ["See your next step", "Review saved answers and skill practice. Teachers can set homework and review their own classes' results."],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-4">
                  <span className="text-sm font-semibold text-[#5b56c8]">0{i + 1}</span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 leading-7 text-[#1b1a18]/70">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <figure>
            <Image src="/landing/game-study-october.jpg" alt="IlluminatED's Study Quarter game scene" width={1440} height={960} className="w-full rounded-3xl shadow-xl ring-1 ring-black/5" />
            <figcaption className="mt-3 text-xs text-[#1b1a18]/55">Actual game capture. Ambient residents are computer controlled; this is not a live player count.</figcaption>
          </figure>
        </div>
      </section>

      {/* Access. */}
      <section className="container py-20" aria-labelledby="access-title">
        <h2 id="access-title" className={`${display} text-4xl sm:text-5xl`}>One product. Clear ways in.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ["Learners", "Invited learners use the core study tools free. Optional Premium is £5.99/month once live checkout is available; it is never needed for core revision.", "/book?for=individual", "Request an invitation"],
            ["Schools and colleges", "School licences cover agreed learner seats, teacher workflows and onboarding. Seat pricing and pilot scope are agreed in writing before purchase.", "/book?for=school", "Discuss a school pilot"],
            ["Investors and partners", "The product, revenue model and pilot questions, separating built features from the evidence we still need to collect.", "/investors", "Read the business overview"],
          ].map(([title, text, href, label]) => (
            <article key={title} className="flex flex-col rounded-3xl border border-black/10 p-6">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-3 flex-1 leading-7 text-[#1b1a18]/70">{text}</p>
              <Link prefetch={false} href={href} className="mt-5 inline-flex min-h-11 items-center gap-1.5 font-medium text-[#5b56c8]">
                {label} <ArrowRight className="size-4" aria-hidden />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Honest expectations. */}
      <section className="container pb-20">
        <div className="grid gap-8 rounded-3xl bg-[#f6f5f2] p-8 md:grid-cols-2 md:p-10">
          <div>
            <ShieldCheck className="size-6 text-[#5b56c8]" aria-hidden />
            <h2 className="mt-3 text-2xl font-semibold">A measured beta, with honest expectations.</h2>
            <p className="mt-4 leading-7 text-[#1b1a18]/70">
              We are testing usability, device performance and learning engagement. We have not independently shown improved
              exam grades. Course and resource availability varies: check the subject, board and source before revising.
            </p>
          </div>
          <ul className="space-y-3 leading-7 text-[#1b1a18]/70">
            <li>For ages 13+. Use a username and keep personal information private.</li>
            <li>
              Read the <Link prefetch={false} href="/safeguarding" className="underline">safeguarding information</Link>, including messaging limits.
            </li>
            <li>
              Report problems through <Link prefetch={false} href="/contact" className="underline">support</Link>. AI and practice questions can contain mistakes.
            </li>
            <li>Schools can review access and data requirements before agreeing a pilot.</li>
          </ul>
        </div>
      </section>

      {/* Closing call to action under the same sky. */}
      <section className="relative overflow-hidden text-white" aria-labelledby="cta-title">
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,#2f2c72_0%,#4a43a0_55%,#8f80d0_100%)]" />
        <div aria-hidden className="landing-stars absolute inset-0 opacity-60" />
        <div className="relative container py-24 text-center">
          <h2 id="cta-title" className={`${display} text-4xl sm:text-6xl`}>What should we revise first?</h2>
          <p className="mx-auto mt-4 max-w-lg text-white/80">Join the beta and ask the study agent. It already knows where to start.</p>
          <Link prefetch={false} href="/book?for=individual" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 font-medium text-[#1b1a18]">
            Request beta access <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
