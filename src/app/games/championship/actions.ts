"use server";

import { revalidatePath } from "next/cache";

import { getSupabase } from "@/lib/social/server";

export type Division = "gcse-foundation" | "gcse-higher" | "a-level" | "vocational";
export type ChampStatus = {
  week: string;
  endsAt: number;
  entry: { division: Division; points: number; answered: number; right: number; rank: number; players: number; today: number } | null;
  history: { week: string; division: Division; points: number; answered: number; right: number; rank: number; players: number; reward: number | null; badge: string | null }[];
};
export type ChampQuestion = { id: number; prompt: string; subject: string; topic: string; options: string[]; worth: number; deadline: number; today: number };
export type ChampAnswer = { correct: boolean; late: boolean; answer: number; explain: string; worth: number; points: number; answered: number; right: number };
export type ChampBoard = { top: { name: string; points: number; acc: number; me: boolean }[] };

const FRIENDLY: Record<string, string> = {
  not_allowed: "Sign in to enter the Championship.",
  not_entered: "Pick your division to enter this week.",
  daily_cap: "That's today's 15 questions done. Come back tomorrow: steady practice beats cramming.",
  no_questions: "You've answered every question in your division this week. Impressive!",
  too_fast: "Read the question first: answers in under two seconds don't count.",
  not_finished: "This week's Championship is still running.",
  already_claimed: "You've already collected this reward.",
  invalid: "That didn't work. Try again.",
};
const friendly = (m?: string) => FRIENDLY[Object.keys(FRIENDLY).find((k) => m?.includes(k)) ?? ""] ?? "Couldn't reach the server. Try again.";

export async function champStatus(): Promise<ChampStatus | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.rpc("champ_status");
  return (data as ChampStatus) ?? null;
}
export async function champEnter(division: Division) {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: friendly() };
  const { error } = await sb.rpc("champ_enter", { p_division: division });
  return error ? { ok: false as const, error: friendly(error.message) } : { ok: true as const };
}
export async function champNext() {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: friendly() };
  const { data, error } = await sb.rpc("champ_next");
  return error ? { ok: false as const, error: friendly(error.message), code: error.message } : { ok: true as const, q: data as ChampQuestion };
}
export async function champAnswer(attempt: number, choice: number) {
  if (!Number.isInteger(attempt) || !Number.isInteger(choice) || choice < 0 || choice > 3) return { ok: false as const, error: FRIENDLY.invalid };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: friendly() };
  const { data, error } = await sb.rpc("champ_answer", { p_attempt: attempt, p_choice: choice });
  return error ? { ok: false as const, error: friendly(error.message) } : { ok: true as const, a: data as ChampAnswer };
}
export async function champBoard(division: Division, week?: string): Promise<ChampBoard> {
  const sb = await getSupabase();
  if (!sb) return { top: [] };
  const { data } = await sb.rpc("champ_board", { p_division: division, p_week: week ?? null });
  return (data as ChampBoard) ?? { top: [] };
}
export async function champClaim(week: string) {
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: friendly() };
  const { data, error } = await sb.rpc("champ_claim", { p_week: week });
  if (error) return { ok: false as const, error: friendly(error.message) };
  revalidatePath("/games/championship");
  return { ok: true as const, ...(data as { reward: number; badge: string | null; rank: number; players: number }) };
}
