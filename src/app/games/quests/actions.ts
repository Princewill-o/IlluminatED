"use server";

import { revalidatePath } from "next/cache";

import { getSupabase } from "@/lib/social/server";

export type Quest = { key: string; title: string; target: number; reward: number; weekly: boolean; progress: number; claimed: boolean };

export async function questBoard(): Promise<Quest[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc("quest_board");
  return (data as Quest[]) ?? [];
}

export async function claimQuest(key: string) {
  if (!/^[dw]-[a-z-]{2,20}$/.test(key)) return { ok: false as const, error: "That quest isn't available." };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: "Sign in to collect rewards." };
  const { data, error } = await sb.rpc("quest_claim", { p_key: key });
  if (error) return { ok: false as const, error: error.message.includes("already") ? "Already collected." : error.message.includes("not_done") ? "Not finished yet." : "Couldn't collect that reward. Try again." };
  revalidatePath("/games");
  return { ok: true as const, reward: (data as { reward: number }).reward };
}
