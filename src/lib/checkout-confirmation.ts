import type Stripe from "stripe";

/** Read-only confirmation: account access is still granted by the signed webhook. */
export function confirmedSubscription(
  session: Stripe.Checkout.Session,
  userId: string,
  customerId: string | null | undefined,
  priceId: string,
  live: boolean,
): Stripe.Subscription | null {
  const sub = session.subscription;
  if (
    !customerId ||
    !priceId ||
    session.mode !== "subscription" ||
    session.status !== "complete" ||
    session.livemode !== live ||
    session.client_reference_id !== userId ||
    session.metadata?.user_id !== userId ||
    !sub ||
    typeof sub === "string"
  )
    return null;
  const customer =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const subCustomer =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  if (
    customer !== customerId ||
    subCustomer !== customerId ||
    sub.livemode !== live ||
    sub.metadata.user_id !== userId ||
    !sub.items.data.some((item) => item.price.id === priceId) ||
    !["active", "trialing"].includes(sub.status) ||
    !["paid", "no_payment_required"].includes(session.payment_status)
  )
    return null;
  return sub;
}
