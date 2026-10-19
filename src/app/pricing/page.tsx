import Link from "next/link";

import type { Metadata } from "next";

import { SubscriptionPlans } from "@/components/pricing/subscription-plans";
import { getAccount } from "@/lib/account/server";
import { getBilling } from "@/lib/billing";
import { subscriptionCheckoutReady } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Plans for learners, schools and employers",
  description: "Explore Illumed for free, unlock deeper revision with Plus, or add simulated career experience with Plus+.",
  alternates: { canonical: "/pricing" },
};
export const dynamic = "force-dynamic";

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ error?: string; cancelled?: string }> }) {
  const [account, params] = await Promise.all([getAccount(), searchParams]);
  const billing = account ? await getBilling(account.id) : null;
  const trialAvailable = Boolean(account && !billing?.trial_used && !billing?.subscription_id);
  const hasPlan = Boolean(billing && ["active", "trialing", "past_due", "unpaid", "paused"].includes(billing.status));
  return <main className="container max-w-7xl py-12 sm:py-16">
    <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.22em] text-primary">Proposed Illumed plans</p><h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Revise for your future. Experience your future.</h1><p className="mt-5 text-lg leading-8 text-muted-foreground">Start with free learning and explore the Career District. Choose Plus for more revision, or Plus+ Experience for structured workplace simulations.</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Prices follow the proposal and are subject to final validation. Secure checkout appears only for tiers with matching Stripe prices and billing configuration.</p></div>
    {hasPlan && <p className="mx-auto mt-7 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-950">You’re on Illumed {billing?.tier === "plus_experience" ? "Plus+ Experience" : "Plus"} ({billing?.status.replaceAll("_", " ")}).<Link href="/billing" className="underline">Manage billing and invoices</Link></p>}
    <section id="plans" className="mt-10" aria-label="Learner subscription plans"><SubscriptionPlans prices={{
      plusMonth: subscriptionCheckoutReady("plus", "month"), plusYear: subscriptionCheckoutReady("plus", "year"),
      experienceMonth: subscriptionCheckoutReady("plus_experience", "month"), experienceYear: subscriptionCheckoutReady("plus_experience", "year"),
    }} trialAvailable={trialAvailable} needsGuardian={account?.details?.ageBand !== "18+"} error={params.error} cancelled={Boolean(params.cancelled)}/></section>
    <section className="mt-12 grid gap-5 border-t pt-10 md:grid-cols-2" aria-label="School and employer partnerships">
      <article className="rounded-3xl border bg-card p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-widest text-primary">Education partners</p><h2 className="mt-3 text-2xl font-black">Illumed for Schools</h2><p className="mt-3 leading-7 text-muted-foreground">Teacher dashboards, curriculum-linked quests, homework workflows, class progress and onboarding. Start with a scoped pilot; licence seats, safeguarding, support and term are agreed in writing.</p><Link href="/book?for=school" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-bold text-primary-foreground">Discuss a school pilot</Link></article>
      <article className="rounded-3xl border bg-card p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-widest text-violet-700">Employer partners</p><h2 className="mt-3 text-2xl font-black">Meet future talent in the Career District</h2><p className="mt-3 leading-7 text-muted-foreground">A branded virtual space, clearly labelled simulated challenges, moderated networking events and engagement reporting. Proposed starting points are £250/month for an employer presence and £500–£2,000 for a sponsored event; these are pilot estimates, not live checkout prices or guaranteed outcomes.</p><Link href="/employers" className="mt-5 inline-flex min-h-11 items-center rounded-full border px-5 font-bold">Explore employer partnerships</Link></article>
    </section>
    <p className="mx-auto mt-9 max-w-4xl text-center text-sm leading-7 text-muted-foreground">Real employer-hosted placements are separate from subscriptions. They require a confirmed employer partnership, appropriate eligibility and safeguarding checks. Illumed does not sell the right to apply, promise a job or present a simulation as real work experience. Learn about <Link href="/about" className="underline">Illumed</Link>, read the <Link href="/terms#premium" className="underline">subscription terms</Link>, or <Link href="/contact?topic=billing" className="underline">contact billing support</Link>.</p>
  </main>;
}
