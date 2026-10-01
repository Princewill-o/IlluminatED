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
