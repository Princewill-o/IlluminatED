import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/social/config";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe calls this when a Checkout Session finishes. It marks the tutor
 * request as paid through public.mark_request_paid, which only accepts the
 * shared PAYMENT_CALLBACK_SECRET. No service role key is used.
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

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  )
    return NextResponse.json({ received: true });

  const session = event.data.object;
  if (session.payment_status !== "paid")
    return NextResponse.json({ received: true });

  const requestId = Number(session.metadata?.request_id);
  if (!Number.isInteger(requestId) || requestId <= 0)
    return NextResponse.json({ received: true, ignored: "no request_id" });

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
