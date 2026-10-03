/** Offer closes at midnight after 15 October, in British Summer Time. */
export const Q4_OFFER_END = "2026-10-15T23:00:00.000Z";
export const PREMIUM_MONTHLY_PENCE = 599;
export const PREMIUM_MONTHLY_LABEL = "£5.99/month";
export const TRIAL_DAYS = 30;
export const q4OfferOpen = (now = Date.now()) => now < Date.parse(Q4_OFFER_END);
