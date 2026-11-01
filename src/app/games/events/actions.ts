"use server";

import { getSupabase } from "@/lib/social/server";

export type MarathonBoard = { endsAt: string; startsAt: string; entered: boolean; mine: { rank: number; points: number } | null; top: { rank: number; name: string; points: number; me: boolean }[] };
export type CoinWallet = { balance: number; earned: number; owned: string[] };

export async function marathonBoard(): Promise<MarathonBoard | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("marathon_board");
  return error ? null : data as MarathonBoard;
}
export async function marathonEnter(eligible: boolean, guardian: boolean) {
  const sb = await getSupabase();
  if (!sb || eligible !== true || guardian !== true) return { ok: false, error: "Confirm eligibility and permission first." };
  const { error } = await sb.rpc("marathon_join", { p_eligible: eligible, p_guardian: guardian });
  return error ? { ok: false, error: "Entry could not be saved. Sign in and try again." } : { ok: true, error: "" };
}
export async function eventCoins(item?: string): Promise<{ wallet: CoinWallet | null; error: string }> {
  if (item && !["marathoner", "race-fan", "what-if-dreamer"].includes(item)) return { wallet: null, error: "Unknown badge." };
  const sb = await getSupabase();
  if (!sb) return { wallet: null, error: "Sign in to open your coin wallet." };
  const { data, error } = await sb.rpc("event_coins", { p_item: item ?? null });
  return { wallet: error ? null : data as CoinWallet, error: error ? "Could not complete that action. You need 25 coins and must not already own the badge." : "" };
}
export async function searchEventSchools(query: string): Promise<{ name: string }[]> {
  if (query.trim().length < 2 || query.length > 80) return [];
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc("public_school_search", { p_search: query.trim() });
  return data ?? [];
}
