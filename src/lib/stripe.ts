import "server-only";

import Stripe from "stripe";

/**
 * Card payments through Stripe Checkout. Off unless STRIPE_SECRET_KEY is set;
 * when off, learners are told payment is arranged after a tutor is matched.
 *
 * When you switch this on, also set payments_required = 'true' in
 * private.app_secrets so tutors can only take paid requests.
 */
const SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim() || "";

export const stripeLive = /^(sk|rk)_live_/.test(SECRET_KEY);

// Tutoring charges require a live key and the webhook-to-database callback.
// Sandbox charges cannot settle real tutoring requests.
export const paymentsEnabled = Boolean(
  SECRET_KEY && stripeLive && process.env.STRIPE_WEBHOOK_SECRET && process.env.PAYMENT_CALLBACK_SECRET,
);

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!SECRET_KEY) return null;
  client ??= new Stripe(SECRET_KEY);
  return client;
}

/**
 * Premium (Ask Tiggy) monthly subscriptions. Off unless STRIPE_SECRET_KEY and
 * STRIPE_PREMIUM_PRICE_ID (a recurring monthly Price in GBP) are both set.
 */
export const PREMIUM_PRICE_ID =
  process.env.STRIPE_PREMIUM_PRICE_ID?.trim() || "";

export type PaidTier = "plus" | "plus_experience";
export type BillingCadence = "month" | "year";
const SUBSCRIPTION_PRICES: Record<PaidTier, Record<BillingCadence, string>> = {
  plus: {
    month: PREMIUM_PRICE_ID,
    year: process.env.STRIPE_PLUS_ANNUAL_PRICE_ID?.trim() || "",
  },
  plus_experience: {
    month: process.env.STRIPE_PLUS_EXPERIENCE_PRICE_ID?.trim() || "",
    year: process.env.STRIPE_PLUS_EXPERIENCE_ANNUAL_PRICE_ID?.trim() || "",
  },
};
export const subscriptionPriceId = (tier: PaidTier, cadence: BillingCadence) => SUBSCRIPTION_PRICES[tier][cadence];
export const subscriptionPriceTier = (priceId: string) => (Object.entries(SUBSCRIPTION_PRICES).flatMap(([tier, prices]) => Object.values(prices).map(id => [id, tier] as const)).find(([id]) => id && id === priceId)?.[1] as PaidTier | undefined);
export const subscriptionCheckoutReady = (tier: PaidTier, cadence: BillingCadence) => Boolean(
  SECRET_KEY && SUBSCRIPTION_PRICES[tier][cadence] && process.env.BILLING_CALLBACK_SECRET && process.env.STRIPE_WEBHOOK_SECRET && (!stripeLive || process.env.HF_TOKEN),
);

export const premiumEnabled = Boolean(SECRET_KEY && PREMIUM_PRICE_ID && process.env.BILLING_CALLBACK_SECRET && process.env.STRIPE_WEBHOOK_SECRET && (!stripeLive || process.env.HF_TOKEN));
