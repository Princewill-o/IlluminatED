"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { ArrowLeft, ArrowRight, Snowflake, Sparkles } from "lucide-react";

import { q4OfferOpen } from "@/lib/campaign";

const SLIDES = [
  { eyebrow: "Q4 WINTER ARC", title: "Your winter arc starts here.", body: "Build a study routine that feels like progress, one focused session at a time. Tiggy is ready when you are." },
  { eyebrow: "YOUR STUDY SIDEKICK", title: "Warm up your weakest topics.", body: "Practise with quizzes and flashcards, explore worked examples and find the resources you need." },
  { eyebrow: "MAKE THIS YOUR QUARTER", title: "Small steps. Big progress.", body: "Keep your subjects, practice progress and next steps together, all the way to exam day." },
];

/** Manual carousel: no autoplay, so the offer and billing terms stay readable. */
export function Q4Campaign({ compact = false }: { compact?: boolean }) {
  const [slide, setSlide] = useState(0);
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    const update = () => setOpen(q4OfferOpen());
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, []);
  if (open === false) return null;
  const current = SLIDES[slide];
  return (
    <section aria-label="Q4 Winter Arc campaign" aria-roledescription="carousel" className={`container ${compact ? "py-4" : "pt-6 pb-10"}`}>
      <div className="relative isolate overflow-hidden rounded-[2rem] border-2 border-sky-200 bg-[#0b51ce] p-6 text-white shadow-[0_10px_0_#082b91] sm:p-9 lg:p-12">
        <Image src="/campaign/q4-winter-arc-landscape.png" alt="" fill priority sizes="(min-width: 1280px) 1200px, 100vw" className="-z-20 object-cover object-right" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#073aaf] via-[#0c53ca]/90 to-[#0c53ca]/15" />
        <Snowflake aria-hidden className="absolute top-5 right-8 size-9 text-sky-100 drop-shadow-md" />
        <Sparkles aria-hidden className="absolute bottom-16 left-1/2 hidden size-10 text-yellow-200 md:block" />
        <div className="relative grid min-h-[350px] items-center gap-6 md:grid-cols-[1.25fr_0.75fr]">
          <div aria-live="polite" aria-atomic="true">
            <p className="mb-4 inline-flex -rotate-2 rounded-full border-2 border-blue-950 bg-yellow-300 px-4 py-2 text-xs font-black tracking-wider text-blue-950">{current.eyebrow}</p>
            <h2 className="max-w-xl text-4xl leading-[1.04] font-bold tracking-tight sm:text-5xl lg:text-6xl">{current.title}</h2>
            <p className="mt-4 max-w-lg text-base text-blue-50 sm:text-lg">{current.body}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/sign-in?mode=sign-up&next=%2Fpremium%3Fcampaign%3Dq4" className="inline-flex items-center gap-2 rounded-full border-2 border-blue-950 bg-white px-6 py-3 font-bold text-blue-950 shadow-[4px_4px_0_#072373] hover:bg-yellow-100">Sign up now <ArrowRight className="size-4" aria-hidden /></Link>
              <Link href="/premium" className="text-sm font-semibold underline underline-offset-4">Compare Free and Premium</Link>
            </div>
            <p className="mt-5 text-xl font-bold">Premium free for one month (30 days).</p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-50">New Premium subscribers only. Offer ends at midnight after 15 October 2026 (UK time). Payment details required. £0 for 30 days, then £5.99/month automatically unless cancelled. Cancel before the trial ends to pay nothing. Checkout availability is shown on the Premium page.</p>
          </div>
          <div className="hidden md:block" aria-hidden />
        </div>
        <div className="relative mt-8 flex items-center gap-3">
          <button type="button" aria-label="Previous campaign slide" onClick={() => setSlide((slide + SLIDES.length - 1) % SLIDES.length)} className="rounded-full border border-blue-200 p-2 hover:bg-blue-700"><ArrowLeft className="size-4" /></button>
          {SLIDES.map((s, i) => <button type="button" key={s.eyebrow} aria-label={`Show campaign slide ${i + 1}`} aria-pressed={slide === i} onClick={() => setSlide(i)} className={`h-3 rounded-full ${slide === i ? "w-8 bg-yellow-300" : "w-3 bg-blue-200"}`} />)}
          <button type="button" aria-label="Next campaign slide" onClick={() => setSlide((slide + 1) % SLIDES.length)} className="rounded-full border border-blue-200 p-2 hover:bg-blue-700"><ArrowRight className="size-4" /></button>
          <span className="ml-2 text-xs text-blue-100">{slide + 1} / {SLIDES.length}</span>
        </div>
      </div>
    </section>
  );
}
