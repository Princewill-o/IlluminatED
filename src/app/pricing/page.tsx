import Link from "next/link";

import type { Metadata } from "next";

import { SubscriptionPlans } from "@/components/pricing/subscription-plans";
import { getAccount } from "@/lib/account/server";
import { getBilling } from "@/lib/billing";
import { subscriptionCheckoutReady } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Plans and pricing",
  description: "Revision is free. Plus (£5.99 a month) adds Ask Tiggy whenever you're stuck; Plus+ Experience adds career simulations; schools start with a paid pilot.",
  alternates: { canonical: "/pricing" },
};
export const dynamic = "force-dynamic";

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ error?: string; cancelled?: string }> }) {
  const [account, params] = await Promise.all([getAccount(), searchParams]);
  const billing = account ? await getBilling(account.id) : null;
  const trialAvailable = Boolean(account && !billing?.trial_used && !billing?.subscription_id);
  const hasPlan = Boolean(billing && ["active", "trialing", "past_due", "unpaid", "paused"].includes(billing.status));
  return <main className="container max-w-7xl py-12 sm:py-16">
    <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.22em] text-primary">Plans and pricing</p><h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Revising is free. Here&apos;s what you pay for.</h1><p className="mt-5 text-lg leading-8 text-muted-foreground">Every course, quiz, flashcard and the 3D city are free. Plus gives you Ask Tiggy whenever you&apos;re stuck and extras in the game. Plus+ Experience adds practice at the world of work.</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Paid through Stripe. Cancel any time from Billing. Under-18s need a parent or guardian&apos;s permission.</p></div>
    {hasPlan && <p className="mx-auto mt-7 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-950">You’re on IlluminatED {billing?.tier === "plus_experience" ? "Plus+ Experience" : "Plus"} ({billing?.status.replaceAll("_", " ")}).<Link href="/billing" className="underline">Manage billing and invoices</Link></p>}
    <section id="plans" className="mt-10" aria-label="Learner subscription plans"><SubscriptionPlans prices={{
      plusMonth: subscriptionCheckoutReady("plus", "month"), plusYear: subscriptionCheckoutReady("plus", "year"),
      experienceMonth: subscriptionCheckoutReady("plus_experience", "month"), experienceYear: subscriptionCheckoutReady("plus_experience", "year"),
    }} trialAvailable={trialAvailable} needsGuardian={account?.details?.ageBand !== "18+"} error={params.error} cancelled={Boolean(params.cancelled)}/></section>
    <section className="mt-12 grid gap-5 border-t pt-10 md:grid-cols-2" aria-label="School and employer partnerships">
      <article className="rounded-3xl border bg-card p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-widest text-primary">Education partners</p><h2 className="mt-3 text-2xl font-black">IlluminatED for Schools</h2><p className="mt-3 leading-7 text-muted-foreground">Teacher dashboards, curriculum-linked quests, homework workflows, class progress and onboarding. Start with a one-term paid pilot; seats, safeguarding, support and term are agreed in writing.</p><Link href="/schools#pilot" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-bold text-primary-foreground">Discuss a school pilot</Link></article>
      <article className="rounded-3xl border bg-card p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-widest text-violet-700">Employer partners</p><h2 className="mt-3 text-2xl font-black">Meet future talent in the Career District</h2><p className="mt-3 leading-7 text-muted-foreground">A branded virtual space, clearly labelled simulated challenges, moderated networking events and engagement reporting. Proposed starting points are £250/month for an employer presence and £500–£2,000 for a sponsored event; these are pilot estimates, not live checkout prices or guaranteed outcomes.</p><Link href="/employers" className="mt-5 inline-flex min-h-11 items-center rounded-full border px-5 font-bold">Explore employer partnerships</Link></article>
    </section>
    <p className="mx-auto mt-9 max-w-4xl text-center text-sm leading-7 text-muted-foreground">Real employer-hosted placements are separate from subscriptions. They require a confirmed employer partnership, appropriate eligibility and safeguarding checks. IlluminatED does not sell the right to apply, promise a job or present a simulation as real work experience. Learn about <Link href="/about" className="underline">IlluminatED</Link>, read the <Link href="/terms#premium" className="underline">subscription terms</Link>, or <Link href="/contact?topic=billing" className="underline">contact billing support</Link>.</p>
  </main>;
}
