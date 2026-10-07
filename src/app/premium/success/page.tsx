import Link from "next/link";

import { CheckCircle2, Clock3, Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { ActivationRefresh } from "./activation-refresh";

import { requireAccount } from "@/lib/account/server";
import { getBilling } from "@/lib/billing";
import { confirmedSubscription } from "@/lib/checkout-confirmation";
import { getStripe, PREMIUM_PRICE_ID, stripeLive } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your Premium membership",
  robots: { index: false, follow: false },
};

export default async function PremiumSuccess({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId =
    typeof params.session_id === "string" &&
    /^cs_(test_|live_)?[A-Za-z0-9]{10,250}$/.test(params.session_id)
      ? params.session_id
      : null;
  const path = `/premium/success${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`;
  const account = await requireAccount(path);
  let billing: Awaited<ReturnType<typeof getBilling>> = null;
  let subscription: ReturnType<typeof confirmedSubscription> = null;
  try {
    billing = await getBilling(account.id);
    const stripe = getStripe();
    if (stripe && sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });
      subscription = confirmedSubscription(
        session,
        account.id,
        billing?.customer_id,
        PREMIUM_PRICE_ID,
        stripeLive,
      );
    }
  } catch {
    /* Never show payment or customer details when verification is unavailable. */
  }
  const verified = Boolean(subscription);
  const trial = subscription?.status === "trialing";
  const activated =
    stripeLive &&
    verified &&
    billing?.subscription_id === subscription?.id &&
    billing?.status === subscription?.status;
  const date = subscription?.trial_end
    ? new Date(subscription.trial_end * 1000).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/London",
      })
    : null;
  const title = !verified
    ? "Let’s check your membership"
    : !stripeLive
      ? "Test checkout complete"
      : trial
        ? "Your Premium trial has started!"
        : "Welcome to IlluminatED Premium!";

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <section className="overflow-hidden rounded-3xl border border-blue-200 bg-white text-slate-900 shadow-xl">
        <div className="bg-gradient-to-br from-blue-700 to-indigo-900 px-8 py-10 text-white">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
            <Sparkles size={16} /> IlluminatED Premium
          </span>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-4 text-blue-100">
            {verified
              ? "Thanks for choosing IlluminatED. Your next study chapter starts here."
              : "We haven’t confirmed a completed Premium checkout for this account yet. Check Billing for your current status."}
          </p>
        </div>
        <div className="space-y-6 p-8">
          {verified && (
            <div className="flex gap-3 rounded-2xl bg-blue-50 p-5">
              {activated ? (
                <CheckCircle2 className="shrink-0 text-blue-700" />
              ) : (
                <Clock3 className="shrink-0 text-blue-700" />
              )}
              <div>
                <h2 className="font-semibold">
                  {!stripeLive
                    ? "Sandbox confirmation"
                    : activated
                      ? "Premium is ready to use"
                      : "Stripe confirmed your checkout"}
                </h2>
                <p className="mt-2 text-sm text-slate-700">
                  {!stripeLive
                    ? "This was a test checkout. No real payment was taken and it does not unlock live Premium."
                    : activated
                      ? "Your account now has Premium access. Your plan badge and features update with your membership."
                      : "We’re waiting for the subscription update to reach your account. Premium access appears once that update is complete."}
                </p>
                {stripeLive && !activated && <ActivationRefresh />}
              </div>
            </div>
          )}
          {verified && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h2 className="font-semibold">
                {trial
                  ? "Your trial and upcoming billing"
                  : "Your monthly membership"}
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                {trial
                  ? `£0 during your trial${date ? `, which ends on ${date}` : ""}. After your trial, £5.99/month is charged automatically to your saved payment method unless you cancel before it ends.`
                  : "Your Premium subscription is £5.99/month. View your renewal date, invoices and payment method in Billing."}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {subscription?.cancel_at_period_end
                  ? "Your subscription is set to cancel at the end of its current period."
                  : "You can manage or cancel your subscription through Billing."}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Link
              href={activated ? "/dashboard" : "/billing"}
              className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white"
            >
              {activated ? "Start studying" : "View billing status"}
            </Link>
            <Link
              href={activated ? "/billing" : path}
              className="rounded-xl border border-slate-300 px-6 py-3 font-semibold"
            >
              {activated ? "Manage subscription" : "Check again"}
            </Link>
          </div>
          <p className="text-sm text-slate-600">
            Need help?{" "}
            <Link href="/contact" className="underline">
              Contact our support team
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
