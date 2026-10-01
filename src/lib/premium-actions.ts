"use server";

import { redirect } from "next/navigation";

import { getAccount } from "@/lib/account/server";
import { siteOrigin } from "@/lib/email";
import { getSupabase } from "@/lib/social/server";
import { PREMIUM_PRICE_ID, getStripe, premiumEnabled } from "@/lib/stripe";
import { getTiggyStatus } from "@/lib/tiggy-server";

/** Sends the member to Stripe Checkout to start a Premium subscription. */
export async function startPremiumCheckout(fd: FormData) {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account) redirect("/sign-in?next=/premium");
  if (!account.profile || !account.details)
    redirect("/onboarding?next=/premium");
  const stripe = getStripe();
  if (!stripe || !premiumEnabled) redirect("/premium");

  const under18 = account.details.ageBand !== "18+";
  if (under18 && fd.get("guardian") !== "on")
    redirect("/premium?error=permission#upgrade");
  if (fd.get("waiver") !== "on") redirect("/premium?error=waiver#upgrade");

  const status = await getTiggyStatus(sb);
  if (status?.plan === "premium") redirect("/premium");

  const { data: sub } = await sb
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", account.id)
    .maybeSingle();
  const customer = (sub?.stripe_customer_id as string | null) ?? undefined;

  const origin = await siteOrigin();
  let url: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
      client_reference_id: account.id,
      ...(customer
        ? { customer }
        : account.email
          ? { customer_email: account.email }
          : {}),
      metadata: {
        user_id: account.id,
        guardian_permission: under18 ? "confirmed" : "not_needed",
        cooling_off_waiver: "accepted",
      },
      subscription_data: { metadata: { user_id: account.id } },
      success_url: `${origin}/tiggy?upgraded=1`,
      cancel_url: `${origin}/premium?cancelled=1`,
    });
    url = session.url;
  } catch {
    // Falls through to the error notice on the pricing page.
  }
  redirect(url ?? "/premium?error=checkout");
}

/** Opens Stripe's billing portal, where members can cancel, change card or see invoices. */
export async function openBillingPortal() {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account) redirect("/sign-in?next=/premium");
  const stripe = getStripe();
  if (!stripe) redirect("/premium");

  const { data: sub } = await sb
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", account.id)
    .maybeSingle();
  const customer = sub?.stripe_customer_id as string | null;
  if (!customer) redirect("/premium");

  let url: string | null = null;
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${await siteOrigin()}/premium`,
    });
    url = portal.url;
  } catch {
    // Falls through to the error notice.
  }
  redirect(url ?? "/premium?error=portal");
}
