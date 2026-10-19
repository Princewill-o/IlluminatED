"use client";

import { useState } from "react";

import Link from "next/link";

import { startSubscriptionCheckout } from "@/lib/premium-actions";

type Props = {
  prices: { plusMonth: boolean; plusYear: boolean; experienceMonth: boolean; experienceYear: boolean };
  trialAvailable: boolean;
  needsGuardian: boolean;
  error?: string;
  cancelled?: boolean;
};

function PaidPlan({ tier, cadence, enabled, trialAvailable, needsGuardian }: {
  tier: "plus" | "plus_experience"; cadence: "month" | "year"; enabled: boolean; trialAvailable: boolean; needsGuardian: boolean;
}) {
  const isExperience = tier === "plus_experience";
  const price = isExperience ? (cadence === "month" ? "£12.99" : "£129.90") : (cadence === "month" ? "£5.99" : "£59.90");
  const trial = isExperience && trialAvailable;
  if (!enabled) return <p className="mt-5 rounded-xl bg-slate-100 p-3 text-xs font-semibold leading-relaxed text-slate-600">Secure checkout opens when the matching Stripe price is configured.</p>;
  return <form action={startSubscriptionCheckout} className="mt-5 space-y-3">
    <input type="hidden" name="tier" value={tier}/><input type="hidden" name="cadence" value={cadence}/><input type="hidden" name="trial" value={trial ? "yes" : "no"}/>
    {needsGuardian && <label className="flex gap-2 text-xs leading-relaxed"><input type="checkbox" name="guardian" required className="mt-0.5"/>I have parent or guardian permission for this recurring subscription.</label>}
    <label className="flex gap-2 text-xs leading-relaxed"><input type="checkbox" name="consent" required className="mt-0.5"/><span>{trial ? `I agree to £0 for 7 days, then ${price}/${cadence === "month" ? "month" : "year"} until cancelled if I am eligible.` : `I agree to ${price}/${cadence === "month" ? "month" : "year"} until cancelled.`} I have read the <Link href="/terms#premium" className="underline">subscription terms</Link>.</span></label>
    <button className={`min-h-12 w-full rounded-full px-5 py-3 font-black text-white ${isExperience ? "bg-[#4b35a5]" : "bg-[#173e8a]"}`}>{trial ? "Start my 7-day free trial" : `Choose ${isExperience ? "Plus+ Experience" : "Plus"}`}</button>
    {trial && <p className="text-xs text-slate-600">No charge for 7 days, then {price}/{cadence === "month" ? "month" : "year"}. Cancel before the trial ends to avoid the first charge.</p>}
  </form>;
}

export function SubscriptionPlans({ prices, trialAvailable, needsGuardian, error, cancelled }: Props) {
  const [annual, setAnnual] = useState(false);
  const cadence = annual ? "year" : "month";
  const canCadence = annual ? prices.plusYear || prices.experienceYear : prices.plusMonth || prices.experienceMonth;
  const message = error === "permission" ? "A parent or guardian must agree before an under-18 account can start a paid subscription." : error === "consent" ? "Please accept the subscription terms to continue." : error === "trial" ? "This account has already used its free trial. You can choose a paid plan without a trial." : error === "existing" ? "There is already a current or pending subscription on this account. Manage it from Billing." : error ? "Checkout is not ready for that plan yet. You can still explore the free features and contact us about a pilot." : "";
  return <>
    {message && <p role="alert" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-950">{message} {error === "existing" && <Link href="/billing" className="underline">Open Billing</Link>}</p>}
    {cancelled && <p role="status" className="mb-6 rounded-2xl bg-slate-100 p-4 font-semibold">Checkout was cancelled. No subscription was started.</p>}
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-4">
      <div><p className="font-black">Choose how to pay</p><p className="text-sm text-slate-600">Annual plans cost 10 months, so you save the equivalent of two months.</p></div>
      <div role="group" aria-label="Billing frequency" className="flex rounded-full bg-slate-100 p-1"><button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)} className={`rounded-full px-4 py-2 text-sm font-bold ${!annual ? "bg-white shadow" : "text-slate-600"}`}>Monthly</button><button type="button" aria-pressed={annual} onClick={() => setAnnual(true)} className={`rounded-full px-4 py-2 text-sm font-bold ${annual ? "bg-white shadow" : "text-slate-600"}`}>Annual · 2 months free</button></div>
    </div>
    {!canCadence && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">{annual ? "Annual checkout is not configured yet. Choose monthly or contact us for an annual pilot." : "Paid checkout is not configured yet. The free Explorer plan and pilot enquiries are open."}</p>}
    <div className="grid gap-5 lg:grid-cols-4">
      <article className="flex flex-col rounded-3xl border bg-white p-6"><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Start here</p><h3 className="mt-2 text-2xl font-black">Explorer</h3><p className="mt-4 text-4xl font-black">£0<span className="text-base font-semibold text-slate-500"> / forever</span></p><p className="mt-4 text-sm leading-6 text-slate-600">Discover Illumed at your own pace.</p><ul className="mt-5 flex-1 list-disc space-y-2 pl-5 text-sm"><li>Limited game-world access</li><li>Introductory revision quests</li><li>Basic XP and achievements</li><li>Personal learning progress</li><li>Explore the Career District and preview roles</li></ul><Link href="/book?for=individual" className="mt-6 rounded-full border px-5 py-3 text-center font-bold">Request free access</Link></article>
      <article className="flex flex-col rounded-3xl border-2 border-blue-700 bg-blue-50/40 p-6"><p className="text-xs font-black uppercase tracking-widest text-blue-800">Revision</p><h3 className="mt-2 text-2xl font-black">Plus</h3><p className="mt-4 text-4xl font-black">{annual ? "£59.90" : "£5.99"}<span className="text-base font-semibold text-slate-500"> / {annual ? "year" : "month"}</span></p><p className="mt-4 text-sm leading-6 text-slate-600">The complete revision experience.</p><ul className="mt-5 flex-1 list-disc space-y-2 pl-5 text-sm"><li>Full supported revision library</li><li>Unlimited revision quests</li><li>Enhanced game-world access</li><li>Advanced progress insights</li><li>Character customisation</li></ul><PaidPlan tier="plus" cadence={cadence} enabled={annual ? prices.plusYear : prices.plusMonth} trialAvailable={false} needsGuardian={needsGuardian}/></article>
      <article className="relative flex flex-col overflow-hidden rounded-3xl border-2 border-violet-700 bg-violet-50/40 p-6"><span className="absolute right-0 top-0 rounded-bl-2xl bg-violet-700 px-3 py-2 text-xs font-black text-white">CAREER EXPERIENCE</span><p className="mt-7 text-xs font-black uppercase tracking-widest text-violet-800">Learning · play · careers</p><h3 className="mt-2 text-2xl font-black">Plus+ Experience</h3><p className="mt-4 text-4xl font-black">{annual ? "£129.90" : "£12.99"}<span className="text-base font-semibold text-slate-500"> / {annual ? "year" : "month"}</span></p><p className="mt-4 text-sm leading-6 text-slate-600">Everything in Plus, with guided simulated workplace experience.</p><ul className="mt-5 flex-1 list-disc space-y-2 pl-5 text-sm"><li>Virtual company workplaces</li><li>Interactive career simulations</li><li>Company-designed challenges</li><li>Applications to real opportunities, where available</li><li>Completion records for eligible activities</li></ul><PaidPlan tier="plus_experience" cadence={cadence} enabled={annual ? prices.experienceYear : prices.experienceMonth} trialAvailable={trialAvailable} needsGuardian={needsGuardian}/></article>
      <article className="flex flex-col rounded-3xl border bg-[#f5f2e9] p-6"><p className="text-xs font-black uppercase tracking-widest text-amber-800">For classrooms</p><h3 className="mt-2 text-2xl font-black">Schools</h3><p className="mt-4 text-4xl font-black">£99<span className="text-base font-semibold text-slate-500"> / month*</span></p><p className="mt-4 text-sm leading-6 text-slate-600">Gamified learning with teacher support and school-safe management.</p><ul className="mt-5 flex-1 list-disc space-y-2 pl-5 text-sm"><li>Teacher dashboards</li><li>Homework quests and auto-marking</li><li>Class progress reporting</li><li>Student licences and onboarding</li></ul><Link href="/book?for=school" className="mt-6 rounded-full bg-[#17243c] px-5 py-3 text-center font-bold text-white">Discuss a school pilot</Link></article>
    </div>
    <p className="mt-5 text-xs leading-relaxed text-slate-600">*School pricing is a proposed starting point for pilot discussions; licences, seats and term are agreed in writing. Real employer-hosted opportunities appear only when confirmed with the employer and subject to eligibility and safeguarding. A subscription never guarantees a job, placement or real-world work experience, and students are not charged just to apply. Workplace simulations are clearly labelled as simulations. For learners under 18, checkout requires parent/guardian permission and transparent recurring-payment consent.</p>
  </>;
}
