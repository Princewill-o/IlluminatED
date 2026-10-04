"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { Check, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { Tiggy } from "@/components/tiggy";
import { stageLabel } from "@/lib/account/details";

export function PersonalisingTransition({ next, subjects, stage }: {
  next: string;
  subjects: string[];
  stage: string;
}) {
  const router = useRouter();
  useEffect(() => {
    router.prefetch(next);
    const timer = window.setTimeout(() => router.replace(next), 2200);
    return () => window.clearTimeout(timer);
  }, [next, router]);

  return <div className="grid min-h-[75vh] place-items-center bg-gradient-to-br from-[#e9f2ff] via-white to-[#f4edff] px-5 py-12 text-slate-950">
    <div className="w-full max-w-xl rounded-[2rem] border border-blue-100 bg-white/90 p-7 text-center shadow-[0_24px_80px_-38px_rgba(26,61,133,.4)] sm:p-10" role="status" aria-live="polite">
      <div className="mx-auto w-28"><Tiggy action="search" /></div>
      <div className="mx-auto mt-5 flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Sparkles className="size-6 animate-pulse" aria-hidden /></div>
      <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Optimising your study space</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">We’re putting your subjects and study goals at the front of your dashboard.</p>
      <div className="mt-7 space-y-2 text-left text-sm">
        <p className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 font-semibold"><Check className="size-4 text-blue-700" aria-hidden /> {stageLabel(stage)} learning path selected</p>
        <p className="flex items-center gap-3 rounded-xl bg-violet-50 px-4 py-3 font-semibold"><Check className="size-4 text-violet-700" aria-hidden /> {subjects.length ? subjects.join(", ") : "Your subjects"} added</p>
        <p className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 font-semibold"><Check className="size-4 text-amber-700" aria-hidden /> Next steps and practice tools ready</p>
      </div>
      <div className="mx-auto mt-7 h-2 w-full max-w-sm overflow-hidden rounded-full bg-blue-100"><motion.div className="h-full rounded-full bg-blue-700" initial={{ width: "8%" }} animate={{ width: "100%" }} transition={{ duration: 2.1, ease: "easeInOut" }} /></div>
      <p className="mt-4 text-xs text-slate-500">Your choices stay private and can be changed later.</p>
    </div>
  </div>;
}
