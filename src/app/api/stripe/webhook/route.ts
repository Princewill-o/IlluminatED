import { type NextRequest, NextResponse } from "next/server";

import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/social/config";
import { PREMIUM_PRICE_ID, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Statuses that keep Premium switched on. past_due covers Stripe's payment retries. */
const PREMIUM_STATUSES = new Set(["active", "trialing", "past_due"]);

type Db = SupabaseClient;

/**
 * Writes the subscription's current state (always re-read from Stripe, so
 * events arriving out of order can't leave a stale plan behind).
 * Returns false if it couldn't be recorded and Stripe should retry.
 */
async function syncSubscription(
  stripe: Stripe,
  sb: Db,
  callbackSecret: string,
  subscriptionId: string,
  fallbackUserId?: string | null,
): Promise<boolean> {
  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return false;
  }
  const userId = sub.metadata?.user_id || fallbackUserId || "";
  if (!UUID.test(userId)) return true; // Not one of ours (e.g. created by hand in Stripe).

  const items = sub.items?.data ?? [];
  const isPremiumPrice = items.some((i) => i.price?.id === PREMIUM_PRICE_ID);
  if (!isPremiumPrice) return true; // Some other product: leave the plan alone.

  const periodEnd = items
    .map((i) => i.current_period_end)
    .filter((n): n is number => typeof n === "number")
    .sort((a, b) => b - a)[0];
  const customer =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  const { error } = await sb.rpc("set_subscription", {
    user_id: userId,
    plan: PREMIUM_STATUSES.has(sub.status) ? "premium" : "free",
    status: sub.status,
    customer: customer ?? null,
    sub_id: sub.id,
    period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    secret: callbackSecret,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("set_subscription failed:", error.message);
    return false;
  }
  return true;
}

/**
 * Stripe calls this when a Checkout Session finishes or a subscription
 * changes. One-off tutoring payments are marked paid through
 * public.mark_request_paid; Premium subscriptions are recorded through
 * public.set_subscription. Both only accept the shared
 * PAYMENT_CALLBACK_SECRET. No service role key is used.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const callbackSecret = process.env.PAYMENT_CALLBACK_SECRET?.trim();
  if (
    !stripe ||
    !webhookSecret ||
    !callbackSecret ||
    !SUPABASE_URL ||
    !SUPABASE_KEY
  )
    return NextResponse.json(
      { error: "Payments aren't configured." },
      { status: 503 },
    );

  const signature = req.headers.get("stripe-signature");
  if (!signature)
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await req.text(),
      signature,
      webhookSecret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Premium subscriptions.
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const ok = await syncSubscription(
      stripe,
      sb,
      callbackSecret,
      event.data.object.id,
    );
    return ok
      ? NextResponse.json({ received: true })
      : NextResponse.json({ error: "Not recorded." }, { status: 500 });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  )
    return NextResponse.json({ received: true });

  const session = event.data.object;

  if (session.mode === "subscription") {
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    if (!subId)
      return NextResponse.json({ received: true, ignored: "no subscription" });
    const ok = await syncSubscription(
      stripe,
      sb,
      callbackSecret,
      subId,
      session.client_reference_id,
    );
    return ok
      ? NextResponse.json({ received: true })
      : NextResponse.json({ error: "Not recorded." }, { status: 500 });
  }

  // One-off tutoring payments (unchanged).
  if (session.payment_status !== "paid")
    return NextResponse.json({ received: true });

  const requestId = Number(session.metadata?.request_id);
  if (!Number.isInteger(requestId) || requestId <= 0)
    return NextResponse.json({ received: true, ignored: "no request_id" });

  const { error } = await sb.rpc("mark_request_paid", {
    request_id: requestId,
    session_id: session.id,
    secret: callbackSecret,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("mark_request_paid failed:", error.message);
    // A 500 makes Stripe retry later.
    return NextResponse.json({ error: "Not recorded." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
