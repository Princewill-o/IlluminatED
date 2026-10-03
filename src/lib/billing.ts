import "server-only";
import { getSupabase } from "@/lib/social/server";
import { stripeLive } from "@/lib/stripe";

export async function getBilling(userId: string) {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("billing_accounts").select("status,customer_id,subscription_id,period_end,trial_end,trial_used,cancel_at_period_end,last_paid_at").eq("user_id", userId).eq("livemode", stripeLive).maybeSingle();
  if (error) throw new Error("Billing status is temporarily unavailable.");
  return data;
}

export async function isPlatformAdmin() {
  const sb = await getSupabase();
  if (!sb) return false;
  const { data, error } = await sb.rpc("platform_admin_status");
  return !error && data === true;
}
