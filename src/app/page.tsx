import Image from "next/image";
import Link from "next/link";

// eslint-disable-next-line import/no-unresolved -- resolved through the package "exports" map
import { GeistSans } from "geist/font/sans";
import { ArrowRight, CalendarCheck, ListChecks, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { FeatureTabs } from "@/components/landing/feature-tabs";
import { SiteStructuredData } from "@/components/seo/structured-data";
import { BlurFade } from "@/components/ui/magic/blur-fade";
import { Marquee } from "@/components/ui/magic/marquee";
import { NumberTicker } from "@/components/ui/magic/number-ticker";

export const metadata: Metadata = {
  title: { absolute: "IlluminatED | Revision, career practice and homework in one learning game" },
  description:
    "A learning game for UK students aged 13+: practise subjects, apply knowledge in simulated workplaces and track progress, with a study agent that plans your week. Request invited beta access or a school demo.",
  alternates: { canonical: "/" },
};

const display = `${GeistSans.className} font-semibold tracking-[-0.035em]`;
/** Colours come from CSS variables on .landing-sky, so the same markup is a day sky in light mode and a night sky in dark mode. */
const soft = "text-[var(--sky-soft)]";
const card = "rounded-3xl bg-[var(--sky-card)] ring-1 ring-[var(--sky-ring)] backdrop-blur";
const accent = "text-[var(--sky-accent)]";

/** A cartoon cloud: thick outline, flat fill. Shown in the day sky. */
function Cloud({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 90" className={`landing-drift pointer-events-none absolute hidden sm:block dark:hidden ${className}`}>
      <path d="M30 80 Q5 80 8 60 Q10 42 32 44 Q34 18 62 20 Q78 2 104 14 Q130 4 140 30 Q170 24 176 50 Q196 56 190 72 Q186 82 168 80 Z" fill="#fff" stroke="#1d1a4a" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

/** A framed game screenshot, tilted like a sticker. */
function Shot({ src, alt, className, w, h }: { src: string; alt: string; className: string; w: number; h: number }) {
  return (
    <figure className={`landing-pop absolute overflow-hidden rounded-2xl border-4 border-[#1d1a4a] bg-white shadow-[8px_8px_0_#1d1a4a] dark:border-white/85 dark:shadow-[8px_8px_0_rgba(179,175,255,0.45)] ${className}`}>
      <Image src={src} alt={alt} width={w} height={h} priority className="block h-full w-full object-cover" />
    </figure>
  );
}

/** Small cartoon sticker labels around the screenshots. */
function Sticker({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`landing-bob absolute z-20 rounded-full border-[3px] border-[#1d1a4a] px-4 py-2 text-sm font-black text-[#1d1a4a] shadow-[4px_4px_0_#1d1a4a] ${className}`}>
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <div className="landing-sky relative overflow-hidden text-[var(--sky-ink)]">
      <SiteStructuredData />
      <div aria-hidden className="landing-stars-tile pointer-events-none absolute inset-0 hidden dark:block" />

      {/* Hero: the headline, then the game itself as a pile of screenshots. */}
      <section className="relative -mt-[76px] pt-[76px]" aria-labelledby="hero-title">
        {/* Sun by day, moon by night. */}
        <div aria-hidden className="absolute top-32 right-[8%] hidden size-20 rounded-full border-4 border-[#1d1a4a] bg-[#ffd23f] shadow-[0_0_0_16px_rgba(255,210,63,0.35)] sm:block dark:border-transparent dark:bg-[#fff8e1] dark:shadow-[0_0_60px_20px_rgba(255,244,214,0.35)]" />
        <Cloud className="top-28 left-[6%] w-40" />
        <Cloud className="top-60 right-[18%] w-28 [animation-duration:26s]" />
        <div className="relative container flex flex-col items-center pt-20 text-center sm:pt-24">
          <BlurFade delay={0.05}>
          <p className="rounded-full border-[3px] border-[#1d1a4a] bg-[#ffd23f] px-4 py-1.5 text-sm font-black text-[#1d1a4a] shadow-[4px_4px_0_#1d1a4a]">
            Invited beta · UK learners aged 13+
          </p>
          </BlurFade>
          <BlurFade delay={0.15}>
          <h1 id="hero-title" className={`${display} mt-7 max-w-4xl text-5xl leading-[1.02] text-balance sm:text-7xl`}>
            Revision that plays like a{" "}
            <span className="relative inline-block bg-[linear-gradient(90deg,#5b56c8,#ff6fa9,#ffb02e,#5b56c8)] bg-[length:300%_100%] bg-clip-text text-transparent [animation:landing-hue_6s_linear_infinite] dark:bg-[linear-gradient(90deg,#b3afff,#ff9cc6,#ffd36b,#b3afff)]">game</span>
          </h1>
          </BlurFade>
          <BlurFade delay={0.25}>
          <p className={`mt-6 max-w-xl text-lg leading-8 ${soft}`}>
            Practise your subjects, take on simulated workplace challenges and explore a 3D London, with a study agent that
            plans your week and quizzes you on your homework.
          </p>
          </BlurFade>
          <BlurFade delay={0.35}>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link prefetch={false} href="/book?for=individual" className="landing-shine relative inline-flex min-h-12 items-center gap-2 overflow-hidden rounded-xl border-[3px] border-[#1d1a4a] bg-[#5b56c8] px-6 font-bold text-white shadow-[4px_4px_0_#1d1a4a] transition hover:-translate-y-0.5">
              Request beta access <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link prefetch={false} href="/schools" className="inline-flex min-h-12 items-center rounded-xl border-[3px] border-[#1d1a4a] bg-white px-6 font-bold text-[#1d1a4a] shadow-[4px_4px_0_#1d1a4a] transition hover:-translate-y-0.5">
              For schools
            </Link>
          </div>
          </BlurFade>
          <p className={`mt-5 text-sm ${soft}`}>
            Already invited?{" "}
            <Link prefetch={false} href="/sign-in" className="font-bold underline underline-offset-4">Sign in</Link>
          </p>
        </div>

        {/* The collage: real captures of the game, character and Locker. */}
        <div className="relative container mt-14 h-[260px] sm:h-[460px] lg:h-[540px]" aria-label="Screenshots of the game">
          <Shot src="/landing/game-hub.webp" alt="The Games Hall in the city" w={1440} h={960} className="top-10 left-[1%] hidden h-[260px] w-[360px] -rotate-6 md:block lg:h-[300px] lg:w-[420px]" />
          <Shot src="/landing/game-chibi-locker.webp" alt="Dressing a character in the Locker" w={1120} h={470} className="top-16 right-[1%] hidden h-[200px] w-[400px] rotate-6 md:block lg:h-[230px] lg:w-[460px]" />
          <Shot src="/landing/game-chibi-street.webp" alt="A player crossing a London street in the 3D world" w={880} h={550} className="top-0 left-1/2 z-10 h-[220px] w-[92%] -translate-x-1/2 sm:h-[360px] sm:w-[580px] lg:h-[420px] lg:w-[680px]" />
          <Sticker className="top-[-14px] left-[18%] hidden bg-[#ffd23f] sm:inline">+50 Clout</Sticker>
          <Sticker className="top-[42%] right-[12%] hidden bg-[#b9f0c9] [animation-delay:-1s] sm:inline">Quiz streak: 7 days</Sticker>
          <Sticker className="bottom-6 left-[14%] hidden bg-[#c9d7ff] [animation-delay:-2s] sm:inline">&ldquo;Plan my week&rdquo;</Sticker>
          <Sticker className="bottom-0 right-[30%] hidden bg-[#ffb3c7] [animation-delay:-3s] md:inline">New look unlocked</Sticker>
        </div>
      </section>

      {/* Scrolling ribbon of what's inside, then a few real numbers. */}
      <section className="relative mt-16" aria-label="What's inside">
        <Marquee pauseOnHover className="[--duration:35s] [--gap:0.75rem]">
          {["GCSE Maths", "Biology", "Chemistry", "Physics", "History", "English", "Computer Science", "AI study agent", "Homework quests", "Careers", "Character Locker", "Games Hall", "Leaderboards", "A-level"].map((t, i) => (
            <span key={t} className="rounded-full border-[3px] border-[#1d1a4a] px-4 py-2 text-sm font-black whitespace-nowrap text-[#1d1a4a] shadow-[3px_3px_0_#1d1a4a]" style={{ background: ["#ffd23f", "#b9f0c9", "#c9d7ff", "#ffb3c7", "#e3c9ff"][i % 5] }}>
              {t}
            </span>
          ))}
        </Marquee>
        <div className="container mt-12 grid gap-4 sm:grid-cols-3">
          {[
            [108, "questions in the quiz bank, each explained"],
            [184, "Locker items to mix into your own look"],
            [13, "company HQs with jobs to try in the city"],
          ].map(([n, label]) => (
            <div key={label as string} className={`${card} p-6 text-center`}>
              <NumberTicker value={n as number} className={`${display} text-5xl text-[var(--sky-ink)] dark:text-[var(--sky-ink)]`} />
              <p className={`mt-2 text-sm ${soft}`}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works: a short motion film. */}
      <section className="relative container py-20" aria-labelledby="how-title">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`text-sm font-bold ${accent}`}>How it works</p>
          <h2 id="how-title" className={`${display} mt-3 text-4xl sm:text-5xl`}>The AI revision game, in under a minute.</h2>
        </div>
        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-3xl border-4 border-[#1d1a4a] bg-white shadow-[10px_10px_0_#1d1a4a] dark:border-white/85 dark:shadow-[10px_10px_0_rgba(179,175,255,0.45)]">
          <video
            className="block aspect-video w-full"
            src="/landing/how-it-works.mp4"
            poster="/landing/how-it-works-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            controls
            aria-label="Motion graphic: pick subjects, explore London, answer quizzes, the agent plans your week, spend Clout on your look, and teachers see progress"
          />
        </div>
      </section>

      {/* Apple-style tabs: one feature at a time. */}
      <section className="relative container pb-24" aria-label="What IlluminatED does">
        <FeatureTabs />
      </section>

      {/* The agent, with small product snippets rather than stock art. */}
      <section className="relative container pb-20" aria-labelledby="agent-title">
        <div className="max-w-2xl">
          <p className={`text-sm font-bold ${accent}`}>The study agent</p>
          <h2 id="agent-title" className={`${display} mt-3 text-4xl sm:text-5xl`}>An agent that does the revision admin.</h2>
          <p className={`mt-4 text-lg leading-8 ${soft}`}>
            It works over your own homework, subjects and exam date, and asks before anything goes to your teacher. The same
            safeguarding as Ask Tiggy applies.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <article className={`${card} p-6`}>
            <CalendarCheck className={`size-5 ${accent}`} aria-hidden />
            <h3 className="mt-4 text-lg font-bold">Plans your week</h3>
            <p className={`mt-2 ${soft}`}>Homework deadlines first, then short sessions building up to your exam.</p>
            <div className="mt-5 flex gap-1.5" aria-hidden>
              {["M", "T", "W", "T", "F"].map((d, i) => (
                <span key={i} className={`grid size-9 place-items-center rounded-lg border-2 border-[#1d1a4a] text-sm font-black ${i < 3 ? "bg-[#5b56c8] text-white" : "bg-white text-[#1d1a4a]/60"}`}>{d}</span>
              ))}
            </div>
          </article>
          <article className={`${card} p-6`}>
            <ListChecks className={`size-5 ${accent}`} aria-hidden />
            <h3 className="mt-4 text-lg font-bold">Quizzes what was set</h3>
            <p className={`mt-2 ${soft}`}>Five questions on the topics your teacher assigned, explained as you go.</p>
            <div className="mt-5 rounded-xl border-2 border-[#1d1a4a] bg-white p-3 text-sm text-[#1d1a4a]" aria-hidden>
              <p className="font-bold">Which organelle releases energy?</p>
              <p className="mt-2 rounded-lg bg-[#b9f0c9] px-3 py-1.5 font-semibold">Mitochondria. Correct</p>
            </div>
          </article>
          <article className={`${card} p-6`}>
            <Sparkles className={`size-5 ${accent}`} aria-hidden />
            <h3 className="mt-4 text-lg font-bold">Asks before it acts</h3>
            <p className={`mt-2 ${soft}`}>Nothing is sent or shared without a yes from you.</p>
            <div className="mt-5 rounded-xl border-2 border-[#1d1a4a] bg-white p-3 text-sm text-[#1d1a4a]" aria-hidden>
              <p className="font-bold">Add Thursday&apos;s chemistry session to your plan?</p>
              <div className="mt-2 flex gap-2">
                <span className="rounded-lg bg-[#1d1a4a] px-3 py-1.5 text-white">Yes, add it</span>
                <span className="rounded-lg border border-[#1d1a4a]/30 px-3 py-1.5">Not now</span>
              </div>
            </div>
          </article>
        </div>
        <Link prefetch={false} href="/agent" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl border-[3px] border-[#1d1a4a] bg-[#ffd23f] px-6 font-bold text-[#1d1a4a] shadow-[4px_4px_0_#1d1a4a]">
          Try the study agent <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>

      {/* Access. */}
      <section className="relative container pb-20" aria-labelledby="access-title">
        <h2 id="access-title" className={`${display} text-4xl sm:text-5xl`}>One product. Clear ways in.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ["Learners", "Invited learners use the core study tools free. Optional Premium is £5.99/month once live checkout is available; it is never needed for core revision.", "/book?for=individual", "Request an invitation"],
            ["Schools and colleges", "School licences cover agreed learner seats, teacher workflows and onboarding. Seat pricing and pilot scope are agreed in writing before purchase.", "/book?for=school", "Discuss a school pilot"],
            ["Investors and partners", "The product, revenue model and pilot questions, separating built features from the evidence we still need to collect.", "/investors", "Read the business overview"],
          ].map(([title, text, href, label]) => (
            <article key={title} className={`${card} flex flex-col p-6`}>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className={`mt-3 flex-1 leading-7 ${soft}`}>{text}</p>
              <Link prefetch={false} href={href} className={`mt-5 inline-flex min-h-11 items-center gap-1.5 font-bold ${accent}`}>
                {label} <ArrowRight className="size-4" aria-hidden />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Honest expectations. */}
      <section className="relative container pb-20">
        <div className={`${card} grid gap-8 p-8 md:grid-cols-2 md:p-10`}>
          <div>
            <ShieldCheck className={`size-6 ${accent}`} aria-hidden />
            <h2 className="mt-3 text-2xl font-bold">A measured beta, with honest expectations.</h2>
            <p className={`mt-4 leading-7 ${soft}`}>
              We are testing usability, device performance and learning engagement. We have not independently shown improved
              exam grades. Course and resource availability varies: check the subject, board and source before revising.
            </p>
          </div>
          <ul className={`space-y-3 leading-7 ${soft}`}>
            <li>For ages 13+. Use a username and keep personal information private.</li>
            <li>Read the <Link prefetch={false} href="/safeguarding" className="underline">safeguarding information</Link>, including messaging limits.</li>
            <li>Report problems through <Link prefetch={false} href="/contact" className="underline">support</Link>. AI and practice questions can contain mistakes.</li>
            <li>Schools can review access and data requirements before agreeing a pilot.</li>
          </ul>
        </div>
      </section>

      {/* Closing call to action. */}
      <section className="relative container pb-28 text-center" aria-labelledby="cta-title">
        <h2 id="cta-title" className={`${display} text-4xl sm:text-6xl`}>What should we revise first?</h2>
        <p className={`mx-auto mt-4 max-w-lg ${soft}`}>Join the beta and ask the study agent. It already knows where to start.</p>
        <Link prefetch={false} href="/book?for=individual" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl border-[3px] border-[#1d1a4a] bg-[#5b56c8] px-6 font-bold text-white shadow-[4px_4px_0_#1d1a4a]">
          Request beta access <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
