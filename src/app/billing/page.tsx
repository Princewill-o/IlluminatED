import Link from "next/link";

import { PageHeader, Section, Note } from "@/components/kit";
import { requireAccount } from "@/lib/account/server";
import { getBilling } from "@/lib/billing";
import { openBillingPortal } from "@/lib/premium-actions";
import { stripeLive } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing & support" };
const date = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
export default async function BillingPage({searchParams}: {searchParams: Promise<{checkout?:string;error?:string}>}) {
  const account = await requireAccount("/billing");
  const b = await getBilling(account.id);
  const sp = await searchParams;
  // A paid tier only counts while Stripe says the subscription is live.
  const paid = Boolean(b && (b.tier === "plus" || b.tier === "plus_experience") && ["active","trialing","past_due"].includes(b.status));
  return <><PageHeader title="Billing & support" intro="Your plan, payment details and invoices in one place."/><Section rule={false}><div className="max-w-2xl space-y-6">
    {!stripeLive && <Note>Sandbox billing: test payments only. Live Premium access is unchanged.</Note>}
    {sp.checkout && <Note>Thanks for completing checkout. Your subscription appears here once Stripe confirms it. <Link href="/billing" className="underline">Refresh billing status</Link>.</Note>}
    {sp.error && <p role="alert">Billing settings could not be opened. Please try again or contact billing support below.</p>}
    <div className="rounded-3xl border p-7"><p className="text-sm text-muted-foreground">Your plan</p><h2 className="mt-2 text-2xl font-bold">{paid ? (b?.tier === "plus_experience" ? "Plus+ Experience" : "Plus") : "Free"}{paid && b?.status !== "active" && <span className="ml-2 text-base font-semibold text-muted-foreground">({b?.status?.replaceAll("_"," ")})</span>}</h2>
      {!paid && <div className="mt-4 rounded-2xl bg-secondary p-5"><p className="font-semibold">You don&apos;t have a subscription on this account.</p><p className="mt-1 text-sm text-muted-foreground">Choose Plus for deeper revision, or Plus+ Experience to add career simulations. Pay securely with Stripe; cancel any time.</p><Link href="/pricing#plans" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">Choose a plan</Link></div>}
      {b?.trial_end && b.status === "trialing" && <p className="mt-3">Your 30-day trial ends {date(b.trial_end)}. {b.cancel_at_period_end ? "It is set to cancel; no renewal is scheduled." : "Then £5.99/month is charged to your saved payment method."}</p>}
      {b?.period_end && b.status !== "trialing" && <p className="mt-3">{b.cancel_at_period_end ? "Scheduled end" : b.status === "active" ? "Next renewal" : "Current period end"}: {date(b.period_end)}.</p>}
      {["past_due","unpaid"].includes(b?.status) && <p className="mt-3 font-semibold">A payment needs attention. Update your payment method in Stripe.</p>}
      {b?.customer_id && <form action={openBillingPortal}><button className={paid ? "mt-6 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground" : "mt-4 font-semibold underline"}>{paid ? "Manage subscription, cards & invoices" : "Past invoices and payment details"}</button></form>}
      {paid && <Link href="/pricing#plans" className="mt-4 inline-block text-sm underline">Compare plans</Link>}
    </div>
    <p>Cancel through Stripe before your trial ends to avoid the first charge. Cancellation stops future renewals; Stripe shows the exact end date before you confirm. You can download subscription invoices and change your payment method in the same portal.</p>
    <div className="rounded-2xl bg-secondary p-6"><h2 className="text-xl font-bold">Need a hand?</h2><p className="mt-2">For a payment problem, cancellation help or a refund request, send our billing team a message. Include your account email and invoice reference. Never send card numbers or passwords.</p><Link href="/contact?topic=billing" className="mt-4 inline-block font-semibold underline">Contact billing support</Link></div>
  </div></Section></>;
}
