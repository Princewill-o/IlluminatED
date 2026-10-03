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

export const paymentsEnabled = Boolean(SECRET_KEY);

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

export const stripeLive = /^(sk|rk)_live_/.test(SECRET_KEY);
export const premiumEnabled = Boolean(SECRET_KEY && PREMIUM_PRICE_ID && process.env.BILLING_CALLBACK_SECRET && process.env.STRIPE_WEBHOOK_SECRET && (!stripeLive || process.env.HF_TOKEN));
