"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { ArrowLeft, ArrowRight, BookOpen, Sparkles, Star, Zap } from "lucide-react";

import { Tiggy } from "@/components/tiggy";
import { q4OfferOpen } from "@/lib/campaign";

const SLIDES = [
  { eyebrow: "THE Q4 LOCK IN CAMPAIGN", title: "Big goals. Little lion. Let's lock in.", body: "Your next chapter starts with one focused session. Tiggy's ready when you are.", action: "celebrate" as const },
  { eyebrow: "YOUR STUDY SIDEKICK", title: "Less stuck. More ‘I've got this.’", body: "Practise your weak spots, explore worked examples and build a revision routine that fits you.", action: "read" as const },
  { eyebrow: "MAKE THIS YOUR QUARTER", title: "Show up today. Thank yourself later.", body: "Keep your subjects, practice progress and next steps together. One place to get ready for what's next.", action: "graduate" as const },
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
    <section aria-label="Q4 Lock In campaign" aria-roledescription="carousel" className={`container ${compact ? "py-4" : "pt-6 pb-10"}`}>
      <div className="relative isolate overflow-hidden rounded-[2rem] border-2 border-blue-300 bg-[#124ce5] p-6 text-white shadow-[0_10px_0_#082b91] sm:p-9 lg:p-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#ffffff 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
        <Star aria-hidden className="absolute top-5 right-8 size-12 rotate-12 fill-yellow-300 text-yellow-300" />
        <Zap aria-hidden className="absolute bottom-20 left-1/2 size-12 -rotate-12 fill-yellow-300 text-yellow-300" />
        <div className="relative grid items-center gap-6 md:grid-cols-[1.25fr_0.75fr]">
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
          <div className="relative mx-auto w-full max-w-[280px] md:max-w-[340px]">
            <div aria-hidden className="absolute inset-x-0 top-8 bottom-4 rotate-6 rounded-[45%] border-4 border-blue-950 bg-[#a3d9ff] shadow-[8px_8px_0_#092a83]" />
            <BookOpen aria-hidden className="absolute top-4 left-0 z-10 size-12 -rotate-12 text-white" />
            <Sparkles aria-hidden className="absolute right-0 bottom-10 z-10 size-12 text-yellow-300" />
            <Tiggy action={current.action} className="relative z-10 w-full" label="Tiggy, your Q4 Lock In study sidekick" />
            <span className="absolute right-0 bottom-0 z-20 rotate-6 rounded-full border-2 border-blue-950 bg-yellow-300 px-4 py-2 text-sm font-black text-blue-950">YOU + TIGGY</span>
          </div>
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
