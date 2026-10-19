"use server";
import { redirect } from "next/navigation";

import { getAccount } from "@/lib/account/server";
import { PREMIUM_MONTHLY_PENCE, TRIAL_DAYS } from "@/lib/campaign";
import { siteOrigin as origin } from "@/lib/site";
import { getSupabase } from "@/lib/social/server";
import { PREMIUM_PRICE_ID, getStripe, premiumEnabled, stripeLive, subscriptionPriceId, type BillingCadence, type PaidTier } from "@/lib/stripe";

/** Starts one of the published individual learner plans. */
export async function startSubscriptionCheckout(fd: FormData) {
  const rawTier = fd.get("tier");
  const rawCadence = fd.get("cadence");
  const tier: PaidTier | null = rawTier === "plus" || rawTier === "plus_experience" ? rawTier : null;
  const cadence: BillingCadence | null = rawCadence === "month" || rawCadence === "year" ? rawCadence : null;
  if (!tier || !cadence) redirect("/pricing?error=plan");
  const account = await getAccount();
  const sb = await getSupabase();
  if (!account || !sb) redirect("/sign-in?next=/pricing");
  if (!account.profile || !account.details) redirect("/onboarding?next=/pricing");
  const under18 = account.details.ageBand !== "18+";
  if (under18 && fd.get("guardian") !== "on") redirect("/pricing?error=permission");
  if (fd.get("consent") !== "on") redirect("/pricing?error=consent");
  const stripe = getStripe();
  const priceId = subscriptionPriceId(tier, cadence);
  if (!stripe || !priceId) redirect("/pricing?error=unavailable");
  const trialDays = tier === "plus_experience" && fd.get("trial") === "yes" ? 7 : 0;
  try {
    const { data: attempt, error: reserveError } = await sb.rpc("reserve_subscription_checkout", {
      p_live: stripeLive, p_tier: tier, p_cadence: cadence, p_trial_days: trialDays,
    });
    if (reserveError || !attempt) redirect("/pricing?error=checkout");
    if (Boolean(attempt.trial) !== (trialDays === 7)) redirect("/pricing?error=trial");
    const price = await stripe.prices.retrieve(priceId);
    const expected = tier === "plus" ? (cadence === "month" ? PREMIUM_MONTHLY_PENCE : 5_990) : (cadence === "month" ? 1_299 : 12_990);
    if (!price.active || price.unit_amount !== expected || price.currency !== "gbp" || price.recurring?.interval !== cadence || price.recurring.interval_count !== 1 || price.livemode !== stripeLive) throw Error("price_configuration");
    const { data: billing, error: readError } = await sb.from("billing_accounts").select("customer_id").eq("user_id", account.id).eq("livemode", stripeLive).maybeSingle();
    if (readError) throw readError;
    let customer = billing?.customer_id as string | undefined;
    if (!customer) {
      const created = await stripe.customers.create({ ...(account.email ? { email: account.email } : {}), metadata: { user_id: account.id } }, { idempotencyKey: `illuminated-customer-${account.id}` });
      const saved = await sb.rpc("billing_set_customer", { p_user: account.id, p_live: stripeLive, p_customer: created.id, p_secret: process.env.BILLING_CALLBACK_SECRET });
      if (saved.error) throw saved.error;
      customer = created.id;
    }
    const subscriptions = await stripe.subscriptions.list({ customer, status: "all", limit: 100 });
    if (subscriptions.has_more || subscriptions.data.some(subscription => !["canceled", "incomplete_expired"].includes(subscription.status))) redirect("/pricing?error=existing");
    const paidPrice = cadence === "month" ? (tier === "plus" ? "£5.99/month" : "£12.99/month") : (tier === "plus" ? "£59.90/year" : "£129.90/year");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", customer, client_reference_id: account.id,
      integration_identifier: "illumed_student_tiers_2026",
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: "always",
      subscription_data: { billing_mode: { type: "flexible" }, metadata: { user_id: account.id, tier }, ...(attempt.trial ? { trial_period_days: 7, trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } } } : {}) },
      metadata: { user_id: account.id, tier, guardian_permission: under18 ? "confirmed" : "not_needed", recurring_consent: "accepted", cadence },
      custom_text: { submit: { message: attempt.trial ? `£0 for 7 days, then ${paidPrice}. Cancel before the trial ends to avoid a charge.` : `${paidPrice} automatically until cancelled.` } },
      success_url: `${origin()}/premium/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin()}/pricing?cancelled=1`,
    }, { idempotencyKey: `illuminated-subscription-${attempt.id}` });
    redirect(session.url ?? "/pricing?error=checkout");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/pricing?error=unavailable");
  }
}

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
      success_url: `${origin()}/premium/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin()}/premium?cancelled=1`,
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
