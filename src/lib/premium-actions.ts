"use server";
import { redirect } from "next/navigation";

import { getAccount } from "@/lib/account/server";
import { PREMIUM_MONTHLY_PENCE, TRIAL_DAYS } from "@/lib/campaign";
import { getSupabase } from "@/lib/social/server";
import { PREMIUM_PRICE_ID, getStripe, premiumEnabled, stripeLive } from "@/lib/stripe";

function origin() { return new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").origin; }

export async function startPremiumCheckout(fd: FormData) {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account) redirect("/sign-in?next=/premium");
  if (!account.profile || !account.details) redirect("/onboarding?next=/premium");
  const stripe = getStripe();
  if (!stripe || !premiumEnabled) redirect("/premium?error=unavailable");
  const under18 = account.details.ageBand !== "18+";
  if (under18 && fd.get("guardian") !== "on") redirect("/premium?error=permission");
  if (fd.get("consent") !== "on") redirect("/premium?error=consent");
  let url: string | null = null;
  try {
    const price = await stripe.prices.retrieve(PREMIUM_PRICE_ID);
    if (!price.active || price.unit_amount !== PREMIUM_MONTHLY_PENCE || price.currency !== "gbp" || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1 || price.livemode !== stripeLive) throw Error("price_configuration");
    const { data: attempt, error } = await sb.rpc("reserve_premium_checkout", { p_live: stripeLive });
    if (error || !attempt) throw Error("checkout_unavailable");
    const { data: billing, error: readError } = await sb.from("billing_accounts").select("customer_id").eq("user_id", account.id).eq("livemode", stripeLive).maybeSingle();
    if (readError) throw readError;
    let customer = billing?.customer_id as string | undefined;
    if (!customer) {
      const created = await stripe.customers.create({ ...(account.email ? { email: account.email } : {}), metadata: { user_id: account.id } }, { idempotencyKey: `illuminated-customer-${account.id}` });
      const result = await sb.rpc("billing_set_customer", { p_user: account.id, p_live: stripeLive, p_customer: created.id, p_secret: process.env.BILLING_CALLBACK_SECRET });
      if (result.error) throw result.error;
      customer = created.id;
    }
    // Stripe is authoritative even when a webhook has not reached the database.
    const subscriptions = await stripe.subscriptions.list({ customer, status: "all", limit: 100 });
    if (subscriptions.has_more || subscriptions.data.some(s => !["canceled", "incomplete_expired"].includes(s.status))) throw Error("existing_subscription");
    const trial = Boolean(attempt.trial) && subscriptions.data.length === 0;
    // Never silently turn a consented free trial into an immediate charge.
    if ((fd.get("trial") === "yes") !== trial) throw Error("offer_changed");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", customer, client_reference_id: account.id,
      integration_identifier: "illuminated_q4_premium_kmvhqzrt",
      line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
      payment_method_collection: "always",
      subscription_data: { billing_mode: { type: "flexible" }, metadata: { user_id: account.id }, ...(trial ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } } } : {}) },
      metadata: { user_id: account.id, guardian_permission: under18 ? "confirmed" : "not_needed", recurring_consent: "accepted", campaign: trial ? "q4_2026" : "standard" },
      custom_text: { submit: { message: trial ? "£0 for 30 days, then £5.99/month automatically. Cancel before your trial ends to avoid a charge." : "£5.99/month automatically until cancelled." } },
      success_url: `${origin()}/billing?checkout=complete`, cancel_url: `${origin()}/premium?cancelled=1`,
      expires_at: Math.floor(new Date(attempt.createdAt).getTime() / 1000) + 31 * 60,
    }, { idempotencyKey: `illuminated-checkout-${attempt.id}` });
    url = session.url;
  } catch { /* No raw Stripe response or customer details in public errors. */ }
  redirect(url ?? "/premium?error=checkout");
}

export async function openBillingPortal() {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account) redirect("/sign-in?next=/billing");
  const stripe = getStripe();
  if (!stripe) redirect("/billing?error=portal");
  const { data: sub } = await sb.from("billing_accounts").select("customer_id").eq("user_id", account.id).eq("livemode", stripeLive).maybeSingle();
  let url: string | null = null;
  if (sub?.customer_id) {
    try {
      const portal = await stripe.billingPortal.sessions.create({ customer: sub.customer_id, configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined, return_url: `${origin()}/billing` });
      url = portal.url;
    } catch { /* Keep support available if Stripe is temporarily unavailable. */ }
  }
  redirect(url ?? "/billing?error=portal");
}
