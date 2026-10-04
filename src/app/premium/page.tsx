import Link from "next/link";

import { Check, Sparkles } from "lucide-react";

import { Note, PageHeader, Section } from "@/components/kit";
import { Tiggy } from "@/components/tiggy";
import { requireAccount } from "@/lib/account/server";
import { getBilling } from "@/lib/billing";
import { q4OfferOpen, PREMIUM_MONTHLY_LABEL } from "@/lib/campaign";
import { startPremiumCheckout } from "@/lib/premium-actions";
import { premiumEnabled, stripeLive } from "@/lib/stripe";

export const metadata = { title: "Free & Premium" };
export const dynamic = "force-dynamic";
const features = [
  ["Courses, quizzes, flashcards and resources", "Included", "Included"],
  ["Study planner, exam practice progress and careers", "Included", "Included"],
  ["Ask Tiggy messages", "15 free credits, once per account", "Up to 200 a day"],
  ["Tiggy answers", "Hints and shorter explanations", "Longer, detailed explanations"],
  ["Full worked solutions on request", "Hints first", "Included"],
  ["AI model", "Standard", "Stronger model"],
  ["Conversation context", "Last 6 messages", "Last 20 messages"],
];

export default async function PremiumPage({ searchParams }: { searchParams: Promise<{ error?: string; cancelled?: string }> }) {
  const account = await requireAccount("/premium");
  const billing = await getBilling(account.id);
  const sp = await searchParams;
  const subscribed = billing && ["active", "trialing", "past_due", "unpaid", "paused", "incomplete"].includes(billing.status);
  const trial = q4OfferOpen() && !billing?.trial_used && !billing?.subscription_id;
  return <>
    <PageHeader title="Your goals. Your plan." intro="Start with the free revision tools. Choose Premium for more support from Ask Tiggy." aside={<Tiggy action="graduate" className="w-32" />} />
    <Section title="Free or Premium. Clearly compared." rule={false}>
      {!stripeLive && <Note>Stripe sandbox: test payments only. No real money is charged and test subscriptions do not unlock live Premium.</Note>}
      {sp.error && <p role="alert" className="my-5 rounded-xl border p-4">We couldn’t start checkout. Check the consent boxes and your billing status, then try again. If your offer has changed, reload this page. <Link href="/billing" className="underline">Billing and support</Link></p>}
      {sp.cancelled && <p role="status" className="my-5">Checkout cancelled. No subscription was started by returning to this page.</p>}
      <div className="my-8 grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border p-7"><p className="font-bold">IlluminatED Free</p><p className="my-4 text-4xl font-bold">£0</p><p>Your everyday revision toolkit. No card needed.</p><Link href="/dashboard?learner=1" className="mt-6 inline-block underline">Keep learning for free</Link></div>
        <div className="relative overflow-hidden rounded-3xl border-2 border-blue-600 bg-blue-50 p-7 text-blue-950"><Sparkles className="absolute right-6 top-6 text-blue-600" aria-hidden/><p className="font-bold">IlluminatED Premium</p><p className="my-4 text-4xl font-bold">{trial ? "30 days free" : PREMIUM_MONTHLY_LABEL}</p><p>{trial ? "Then £5.99/month. Cancel before the trial ends to avoid a charge." : "Billed monthly. Cancel future renewals any time."}</p>{trial && <p className="mt-3 text-sm font-semibold">Q4 Lock In · New subscribers · Offer ends 15 October 2026</p>}<a href="#upgrade" className="mt-6 inline-block font-semibold underline">{subscribed ? "Manage your plan" : "Choose Premium"}</a></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[32rem] text-left text-sm"><caption className="sr-only">Features included with each plan</caption><thead><tr className="border-b"><th className="p-4">What you get</th><th className="p-4">Free</th><th className="rounded-t-xl bg-blue-50 p-4 text-blue-950">Premium</th></tr></thead><tbody>{features.map(([label,free,premium])=><tr key={label} className="border-b"><th scope="row" className="p-4 font-medium">{label}</th><td className="p-4">{free}</td><td className="bg-blue-50 p-4 text-blue-950">{premium === "Included" ? <span className="inline-flex gap-2"><Check className="size-4" aria-hidden/>Included</span> : premium}</td></tr>)}</tbody></table></div>
    </Section>
    <Section id="upgrade" title={subscribed ? "Your subscription" : trial ? "Lock in your 30-day trial" : "Choose Premium"}>
      <div className="max-w-2xl space-y-5">
        {subscribed ? <><p>Your subscription status is <strong>{billing.status.replaceAll("_"," ")}</strong>.</p><Link href="/billing" className="inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Manage billing and invoices</Link></> : premiumEnabled ? <form action={startPremiumCheckout} className="space-y-5">
          <input type="hidden" name="trial" value={trial ? "yes" : "no"}/>
          <p>{trial ? "£0 today. Stripe securely collects your payment details. After 30 days, the same payment method is charged £5.99 every month unless you cancel." : "Stripe securely charges £5.99 today and every month until you cancel."}</p>
          {account.details.ageBand !== "18+" && <label className="flex gap-3 rounded-xl bg-secondary p-4"><input type="checkbox" name="guardian" required className="mt-1"/>I have my parent or guardian’s permission. They should pay or agree to the recurring payments.</label>}
          <label className="flex gap-3"><input type="checkbox" name="consent" required className="mt-1"/><span>I want Premium to start immediately and agree to {trial ? "£0 for 30 days, then " : ""}£5.99/month until I cancel. I have read the <Link href="/terms#premium" className="underline">Premium terms</Link>. My statutory rights are unaffected.</span></label>
          <button className="rounded-full bg-primary px-7 py-3 font-semibold text-primary-foreground">{trial ? "Start my free 30 days" : "Subscribe for £5.99/month"}</button>
        </form> : <Note>Premium checkout is being prepared. Please keep using the free study tools while we finish setup.</Note>}
        <p className="text-sm">Cancel, update your payment method or download invoices in <Link href="/billing" className="underline">Billing</Link>. For payment or refund questions, <Link href="/contact?topic=billing" className="underline">contact billing support</Link>.</p>
        <Note>Tiggy is AI and can make mistakes. Check important answers against your exam specification or with your teacher. Premium does not guarantee an exam result.</Note>
      </div>
    </Section>
  </>;
}
