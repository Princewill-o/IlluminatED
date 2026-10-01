import "server-only";

import { getSupabase } from "@/lib/social/server";

export interface PaymentState {
  paidAt: string | null;
  refundedAt: string | null;
}

/** Payment columns for the given requests. RLS limits it to requests the viewer can see. */
export async function loadPayments(
  ids: number[],
): Promise<Map<number, PaymentState>> {
  const sb = await getSupabase();
  if (!sb || !ids.length) return new Map();
  const { data } = await sb
    .from("tutor_requests")
    .select("id, paid_at, refunded_at")
    .in("id", ids);
  return new Map(
    (data ?? []).map((r) => [
      Number(r.id),
      {
        paidAt: (r.paid_at as string) ?? null,
        refundedAt: (r.refunded_at as string) ?? null,
      },
    ]),
  );
}

/** Whether a consent email is out for this request. Only the learner and moderators can read it. */
export async function loadGuardianConsent(id: number) {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("request_guardians")
    .select("token_expires_at, consented_at")
    .eq("request_id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    linkExpiresAt: (data.token_expires_at as string) ?? null,
    consentedAt: (data.consented_at as string) ?? null,
  };
}
