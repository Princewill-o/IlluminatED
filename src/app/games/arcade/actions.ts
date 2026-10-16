"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { ARCADE } from "@/game/core/arcade";
import { getSupabase } from "@/lib/social/server";

const FRIENDLY: Record<string, string> = {
  not_allowed: "Sign in with your IlluminatED account to play and save.",
  not_enough_clout: "Not enough Clout yet. Work a shift or play the free game to earn more.",
  already_owned: "You already own this game.",
  not_owned: "Unlock this game first.",
  too_fast: "Play the full 60 seconds to bank your score.",
  invalid: "That score didn't save. Try again.",
  unknown_item: "That game isn't in the arcade.",
};
const friendly = (m?: string) => FRIENDLY[Object.keys(FRIENDLY).find((k) => m?.includes(k)) ?? ""] ?? "Couldn't reach the server. Try again in a moment.";

const gameId = z.string().refine((id) => ARCADE.some((g) => g.id === id));

export async function buyArcadeGame(game: string) {
  if (!gameId.safeParse(game).success) return { ok: false as const, error: FRIENDLY.unknown_item };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: friendly() };
  const { error } = await sb.rpc("arcade_buy", { p_game: game });
  if (error) return { ok: false as const, error: friendly(error.message) };
  revalidatePath("/games/arcade");
  return { ok: true as const };
}

export async function finishArcadeRound(game: string, score: number, durationMs: number) {
  const p = z.object({ game: gameId, score: z.number().int().min(0).max(60), durationMs: z.number().int().min(0).max(600_000) }).safeParse({ game, score, durationMs });
  if (!p.success) return { ok: false as const, error: FRIENDLY.invalid };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: friendly() };
  const { data, error } = await sb.rpc("arcade_finish", { p_game: game, p_score: score, p_duration_ms: durationMs });
  if (error) return { ok: false as const, error: friendly(error.message) };
  revalidatePath("/games/arcade");
  const row = (Array.isArray(data) ? data[0] : data) as { reward: number; best: number } | null;
  return { ok: true as const, reward: row?.reward ?? 0, best: row?.best ?? score };
}
