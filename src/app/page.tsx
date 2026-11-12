import Image from "next/image";
import Link from "next/link";

import { ArrowRight, BookOpenCheck, Building2, Coins, GraduationCap, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";

import { RewardsBanner } from "@/components/game/season/rewards-banner";
import { FeatureTabs } from "@/components/landing/feature-tabs";
import { GameplayShowcase } from "@/components/landing/gameplay-showcase";
import { PlatformTotals } from "@/components/landing/platform-totals";
import { SiteStructuredData } from "@/components/seo/structured-data";
import { BlurFade } from "@/components/ui/magic/blur-fade";
import { Marquee } from "@/components/ui/magic/marquee";
import { PLAN_ROADMAP, PLANS } from "@/lib/plans";
import { platformStats } from "@/lib/server/platform-stats";

export const metadata: Metadata = {
  title: { absolute: "IlluminatED | Revision students actually choose to open" },
  description:
    "GCSE and A-level revision students actually choose to open: quizzes, flashcards and an AI study helper, with a 3D London city as the reward. Free to start; Plus from £5.99 a month; paid pilots for schools.",
  alternates: { canonical: "/" },
};

const display = "[font-family:var(--font-geist-sans)] font-semibold tracking-[-0.035em]";
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

export const revalidate = 300;

export default async function Home() {
  const stats = await platformStats();
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
            GCSE &amp; A-level revision · Free to start
          </p>
          </BlurFade>
          <BlurFade delay={0.15}>
          <h1 id="hero-title" className={`${display} mt-7 max-w-4xl text-5xl leading-[1.02] text-balance sm:text-7xl`}>
            Revision you&apos;ll actually{" "}
            <span className="relative inline-block bg-[linear-gradient(90deg,#5b56c8,#ff6fa9,#ffb02e,#5b56c8)] bg-[length:300%_100%] bg-clip-text text-transparent [animation:landing-hue_6s_linear_infinite] dark:bg-[linear-gradient(90deg,#b3afff,#ff9cc6,#ffd36b,#b3afff)]">open</span>.
            <span className="mt-3 block text-3xl sm:text-5xl">The city is the reward.</span>
          </h1>
          </BlurFade>
          <BlurFade delay={0.25}>
          <p className={`mt-6 max-w-xl text-lg leading-8 ${soft}`}>
            Ten-minute quizzes, flashcards and an AI study helper for your subjects. Every right answer earns Clout to spend
            in a 3D London you explore with friends. The revision is free; Plus adds a study helper whenever you&apos;re stuck.
          </p>
          </BlurFade>
          <BlurFade delay={0.35}>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link prefetch={false} href="/sign-in?mode=sign-up" className="landing-shine relative inline-flex min-h-12 items-center gap-2 overflow-hidden rounded-xl border-[3px] border-[#1d1a4a] bg-[#5b56c8] px-6 font-bold text-white shadow-[4px_4px_0_#1d1a4a] transition hover:-translate-y-0.5">
              Start free <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link prefetch={false} href="/schools" className="inline-flex min-h-12 items-center rounded-xl border-[3px] border-[#1d1a4a] bg-white px-6 font-bold text-[#1d1a4a] shadow-[4px_4px_0_#1d1a4a] transition hover:-translate-y-0.5">
              For schools
            </Link>
            <Link prefetch={false} href="#pricing" className="inline-flex min-h-12 items-center rounded-xl border-[3px] border-[#1d1a4a] bg-[#b9f0c9] px-6 font-bold text-[#1d1a4a] shadow-[4px_4px_0_#1d1a4a]">See what&apos;s free</Link>
          </div>
          </BlurFade>
          <p className={`mt-5 text-sm ${soft}`}>
            Already have an account?{" "}
            <Link prefetch={false} href="/sign-in" className="font-bold underline underline-offset-4">Sign in</Link>
          </p>
        </div>

        {/* The collage: real captures of the game, character and Locker. */}
        <div className="relative container mt-14 h-[260px] sm:h-[460px] lg:h-[540px]" aria-label="Screenshots of the game">
          <Shot src="/landing/world-cafe.webp" alt="Inside a café in the 3D city" w={1600} h={900} className="top-10 left-[1%] hidden h-[260px] w-[360px] -rotate-6 md:block lg:h-[300px] lg:w-[420px]" />
          <Shot src="/landing/world-street.webp" alt="A London high street with traffic and shops" w={1600} h={900} className="top-16 right-[1%] hidden h-[200px] w-[400px] rotate-6 md:block lg:h-[230px] lg:w-[460px]" />
          <Shot src="/landing/world-university.webp" alt="A player outside UCL's portico in the 3D world" w={1600} h={900} className="top-0 left-1/2 z-10 h-[220px] w-[92%] -translate-x-1/2 sm:h-[360px] sm:w-[580px] lg:h-[420px] lg:w-[680px]" />
          <Sticker className="top-[-14px] left-[18%] hidden bg-[#ffd23f] sm:inline">+50 Clout</Sticker>
          <Sticker className="top-[42%] right-[12%] hidden bg-[#b9f0c9] [animation-delay:-1s] sm:inline">Quiz streak: 7 days</Sticker>
          <Sticker className="bottom-6 left-[14%] hidden bg-[#c9d7ff] [animation-delay:-2s] sm:inline">&ldquo;Plan my week&rdquo;</Sticker>
          <Sticker className="bottom-0 right-[30%] hidden bg-[#ffb3c7] [animation-delay:-3s] md:inline">New look unlocked</Sticker>
        </div>
      </section>

      {/* Scrolling ribbon of what's inside, then a few real numbers. */}
      <section className="relative mt-16" aria-label="What's inside">
        <Marquee pauseOnHover className="[--duration:35s] [--gap:0.75rem]">
          {["Primary · Years 1–6", "Secondary · Years 7–11", "Sixth form · Years 12–13", "IllumED Slides", "GCSE Maths", "Biology", "Chemistry", "Physics", "History", "English", "Computer Science", "Ask Tiggy", "Homework quests", "Careers", "Character Locker", "Games Hall", "Leaderboards", "A-level"].map((t, i) => (
            <span key={t} className="rounded-full border-[3px] border-[#1d1a4a] px-4 py-2 text-sm font-black whitespace-nowrap text-[#1d1a4a] shadow-[3px_3px_0_#1d1a4a]" style={{ background: ["#ffd23f", "#b9f0c9", "#c9d7ff", "#ffb3c7", "#e3c9ff"][i % 5] }}>
              {t}
            </span>
          ))}
        </Marquee>
        <PlatformTotals initial={stats} />
        <p className={`container mt-4 text-center text-xs ${soft}`}>Database totals refresh automatically. IllumED Slides covers KS1–KS4 using licensed Oak National Academy material; sixth-form courses are listed separately. <Link href="/curriculum" className="underline">Explore the library</Link>.</p>
      </section>

      {/* How it works: a short motion film. */}
      <section className="relative container py-20" aria-labelledby="how-title">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`text-sm font-bold ${accent}`}>How it works</p>
          <h2 id="how-title" className={`${display} mt-3 text-4xl sm:text-5xl`}>The AI revision game, in under a minute.</h2>
        </div>
        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-3xl border-4 border-[#1d1a4a] bg-white shadow-[10px_10px_0_#1d1a4a] dark:border-white/85 dark:shadow-[10px_10px_0_rgba(179,175,255,0.45)]">
          <video
            className="pointer-events-none block aspect-video w-full select-none"
            src="/landing/how-it-works.mp4"
            poster="/landing/how-it-works-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            tabIndex={-1}
            aria-label="Motion graphic: pick subjects, explore London, answer quizzes, the agent plans your week, spend Clout on your look, and teachers see progress"
          />
        </div>
      </section>

      <GameplayShowcase accent={accent} soft={soft} display={display} card={card} />
      <div className="relative container pb-20"><RewardsBanner /></div>

      {/* Apple-style tabs: one feature at a time. */}
      <section className="relative container pb-24" aria-label="What IlluminatED does">
        <FeatureTabs />
      </section>

      {/* The loop, in three steps, then who it's for. */}
      <section className="relative container pb-20" aria-labelledby="loop-title">
        <div className="max-w-2xl">
          <p className={`text-sm font-bold ${accent}`}>What we do</p>
          <h2 id="loop-title" className={`${display} mt-3 text-4xl sm:text-5xl`}>Revise first. Then play.</h2>
          <p className={`mt-4 text-lg leading-8 ${soft}`}>
            Most revision apps get opened once. IlluminatED turns each revision session into progress in a game students already want to play.
          </p>
        </div>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            [BookOpenCheck, "1. Revise", "Short quizzes and flashcards on your subjects. Tiggy explains anything you get wrong."],
            [Coins, "2. Earn", "Right answers, streaks and finished homework earn Clout and Season Pass rewards."],
            [GraduationCap, "3. Spend it in the city", "New looks, a place of your own and time with friends in a 3D London. The game is the reward, never the shortcut."],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof BookOpenCheck;
            return (
              <li key={title as string} className={`${card} p-6`}>
                <I className={`size-6 ${accent}`} aria-hidden />
                <h3 className="mt-4 text-lg font-bold">{title as string}</h3>
                <p className={`mt-2 ${soft}`}>{text as string}</p>
              </li>
            );
          })}
        </ol>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <article className={`${card} p-6`}>
            <GraduationCap className={`size-5 ${accent}`} aria-hidden />
            <h3 className="mt-3 font-bold">Students</h3>
            <p className={`mt-2 text-sm leading-6 ${soft}`}>Free to revise. Plus (£5.99 a month) when you want help whenever you&apos;re stuck.</p>
          </article>
          <article id="parents" className={`${card} scroll-mt-24 p-6`}>
            <Users className={`size-5 ${accent}`} aria-hidden />
            <h3 className="mt-3 font-bold">Parents</h3>
            <p className={`mt-2 text-sm leading-6 ${soft}`}>One clear price, cancel any time, and under-18s need your permission to subscribe. Tiggy won&apos;t collect personal details.</p>
          </article>
          <article className={`${card} p-6`}>
            <Building2 className={`size-5 ${accent}`} aria-hidden />
            <h3 className="mt-3 font-bold">Schools &amp; colleges</h3>
            <p className={`mt-2 text-sm leading-6 ${soft}`}>A one-term paid pilot with homework quests, class progress and a data and safeguarding pack. <Link prefetch={false} href="/schools" className="font-semibold underline">For schools</Link></p>
          </article>
        </div>
      </section>

      {/* Pricing: learner plans with prices, and school licences by enquiry. */}
      <section id="pricing" className="relative container pb-20 scroll-mt-24" aria-labelledby="pricing-title">
        <p className={`text-sm font-bold tracking-widest uppercase ${accent}`}>Plans</p>
        <h2 id="pricing-title" className={`${display} mt-3 text-4xl sm:text-5xl`}>What you pay for.</h2>
        <p className={`mt-4 max-w-2xl leading-7 ${soft}`}>
          Revising is free. You pay for help when you&apos;re stuck, extras in the game, and career practice. Monthly or yearly through Stripe; cancel any time.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => {
            const highlight = plan.id === "plus";
            const href = plan.id === "free" ? "/sign-in?mode=sign-up" : plan.id === "schools" ? "/schools#pilot" : "/pricing#plans";
            const cta = plan.id === "free" ? "Start free" : plan.id === "schools" ? "Plan a pilot" : plan.id === "plus" ? "Choose Plus" : "Start 7-day trial";
            return (
              <article
                key={plan.id}
                className={`${card} relative flex flex-col p-6 ${highlight ? "ring-2 ring-[#6b55e0] shadow-[0_12px_40px_-12px_rgba(107,85,224,0.55)]" : ""}`}
              >
                {highlight && (
                  <span className="absolute -top-3 right-5 rounded-full bg-[#6b55e0] px-3 py-1 text-xs font-black text-white shadow-md">Most popular</span>
                )}
                <p className={`text-xs font-bold tracking-widest uppercase ${accent}`}>{plan.forWho}</p>
                <h3 className="mt-1 text-lg font-bold">{plan.name}</h3>
                <p className="mt-5">
                  <span className={`${display} text-4xl`}>{plan.monthly}</span>
                  {plan.yearly && <span className={`ml-1 text-sm font-semibold ${soft}`}>/ month</span>}
                </p>
                <p className={`mt-1 min-h-8 text-xs font-semibold ${soft}`}>{plan.note}</p>
                <p className="mt-4 text-sm font-bold">{plan.promise}</p>
                <ul className={`mt-3 flex-1 space-y-2 text-sm leading-6 ${soft}`}>
                  {plan.includes.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden className={`mt-0.5 font-black ${accent}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  prefetch={false}
                  href={href}
                  className={
                    highlight
                      ? "mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[3px] border-[#1d1a4a] bg-[#6b55e0] px-5 font-bold text-white shadow-[4px_4px_0_#1d1a4a]"
                      : `mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-bold ring-2 ring-[var(--sky-ring)] ${accent}`
                  }
                >
                  {cta} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </article>
            );
          })}
        </div>
        <p className={`mt-6 text-sm ${soft}`}>
          Coming next to paid plans: {PLAN_ROADMAP.join(" and ").toLowerCase()}. Prices in GBP. Under-18s need a parent or guardian&apos;s permission for a paid plan.{" "}
          <Link prefetch={false} href="/pricing" className="font-semibold underline">Compare plans in full</Link>.
        </p>
      </section>

      {/* Honest expectations. */}
      <section className="relative container pb-20">
        <div className={`${card} grid gap-8 p-8 md:grid-cols-2 md:p-10`}>
          <div>
            <ShieldCheck className={`size-6 ${accent}`} aria-hidden />
            <h2 className="mt-3 text-2xl font-bold">Honest expectations.</h2>
            <p className={`mt-4 leading-7 ${soft}`}>
              We keep improving usability, device performance and learning engagement. We have not independently shown improved
              exam grades. Course and resource availability varies: check the subject, board and source before revising.
            </p>
          </div>
          <ul className={`space-y-3 leading-7 ${soft}`}>
            <li>Open lessons for primary and secondary pupils; accounts and social features remain for ages 13+. Keep personal information private.</li>
            <li>Read the <Link prefetch={false} href="/safeguarding" className="underline">safeguarding information</Link>, including messaging limits.</li>
            <li>Report problems through <Link prefetch={false} href="/contact" className="underline">support</Link>. AI and practice questions can contain mistakes.</li>
            <li>Schools can review access and data requirements before agreeing a pilot.</li>
          </ul>
        </div>
      </section>

      {/* Closing call to action. */}
      <section className="relative container pb-28 text-center" aria-labelledby="cta-title">
        <h2 id="cta-title" className={`${display} text-4xl sm:text-6xl`}>Ten minutes of revision. Then the city.</h2>
        <p className={`mx-auto mt-4 max-w-lg ${soft}`}>Create your free account and start with the topics you&apos;re studying. Your progress follows you into the game.</p>
        <Link prefetch={false} href="/sign-in?mode=sign-up" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl border-[3px] border-[#1d1a4a] bg-[#5b56c8] px-6 font-bold text-white shadow-[4px_4px_0_#1d1a4a]">
          Start free <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
