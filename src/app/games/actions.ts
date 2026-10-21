"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { companyById } from "@/game/core/companies";
import { SLOTS } from "@/game/core/cosmetics";
import { getSupabase } from "@/lib/social/server";

const FRIENDLY: Record<string, string> = {
  not_allowed: "Sign in with your IlluminatED account to save your progress.",
  invalid_run: "That shift couldn't be saved. Give it another go.",
  too_fast: "Whoa, speedy! Wait a few seconds before saving another shift.",
  not_for_sale: "That item can't be bought. It has to be unlocked.",
  already_owned: "You already own that.",
  not_enough_clout: "Not enough Clout yet. Play a shift to earn more!",
  not_owned: "You need to own that item first.",
  invalid_avatar: "That outfit didn't save. Try again.",
  too_many_challenges:
    "You've made loads of challenges today. Try again tomorrow.",
  not_found: "Couldn't find that shift.",
};

const friendly = (message?: string) => {
  const key = Object.keys(FRIENDLY).find((k) => message?.includes(k));
  return key
    ? FRIENDLY[key]
    : "Couldn't reach the server. Your game is fine, it just didn't save.";
};

const RunInput = z.object({
  company: z.string().refine((id) => Boolean(companyById(id))),
  seed: z.number().int().min(1).max(2_147_483_647),
  score: z.number().int().min(0).max(9600),
  correct: z.number().int().min(0).max(12),
  total: z.number().int().min(1).max(12),
  bestStreak: z.number().int().min(0).max(12),
  durationMs: z.number().int().min(1).max(900_000),
  fired: z.boolean(),
  workplace: z.string().regex(/^[a-z0-9-]{2,40}$/).nullable().optional(),
  currentlyEmployed: z.boolean().optional(),
  challenge: z
    .string()
    .regex(/^[A-Z0-9]{6}$/)
    .nullable(),
});

export interface RunResult {
  runId: number;
  rank: number;
  xp: number;
  clout: number;
  dailyBonus: boolean;
  capped: boolean;
  level: number;
  totalXp: number;
  totalClout: number;
  streak: number;
  previousBest: number;
  newBest: boolean;
  unlocked: string[];
  employment: "fired" | "unemployed" | "still_employed" | null;
}

export async function finishShift(
  input: z.infer<typeof RunInput>,
): Promise<{ ok: true; result: RunResult } | { ok: false; error: string }> {
  const parsed = RunInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: FRIENDLY.invalid_run };
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: friendly() };
  const r = parsed.data;
  const { data, error } = await sb.rpc("game_finish_run", {
    p_company: r.company,
    p_seed: r.seed,
    p_score: r.score,
    p_correct: r.correct,
    p_total: r.total,
    p_best_streak: r.bestStreak,
    p_duration_ms: r.durationMs,
    p_fired: r.fired,
    p_challenge: r.challenge,
  });
  if (error || !data) return { ok: false, error: friendly(error?.message) };
  let employment: RunResult["employment"] = null;
  if (r.fired) {
    employment = r.currentlyEmployed ? "still_employed" : "unemployed";
    if (r.workplace) {
      const { data: wasFired, error: fireError } = await sb.rpc("career_fire", {
        p_workplace: r.workplace,
      });
      if (fireError) return { ok: false, error: friendly(fireError.message) };
      if (wasFired) employment = "fired";
    }
    revalidatePath("/games/careers");
    revalidatePath("/games/world");
  }
  const d = data as Record<string, unknown>;
  revalidatePath("/games");
  return {
    ok: true,
    result: {
      runId: Number(d.run_id),
      rank: Number(d.rank),
      xp: Number(d.xp),
      clout: Number(d.clout),
      dailyBonus: Boolean(d.daily_bonus),
      capped: Boolean(d.capped),
      level: Number(d.level),
      totalXp: Number(d.total_xp),
      totalClout: Number(d.total_clout),
      streak: Number(d.streak),
      previousBest: Number(d.previous_best),
      newBest: Boolean(d.new_best),
      unlocked: Array.isArray(d.unlocked) ? (d.unlocked as string[]) : [],
      employment,
    },
  };
}

export async function buyItem(
  itemId: string,
): Promise<{ ok: true; clout: number } | { ok: false; error: string }> {
  if (!/^[a-z0-9-]{2,40}$/.test(itemId))
    return { ok: false, error: FRIENDLY.not_for_sale };
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: friendly() };
  const { data, error } = await sb.rpc("game_buy_item", { p_item: itemId });
  if (error) return { ok: false, error: friendly(error.message) };
  revalidatePath("/games", "layout");
  return { ok: true, clout: Number(data) };
}

const AvatarInput = z.object(
  Object.fromEntries(
    SLOTS.map(({ slot }) => [slot, z.string().regex(/^[a-z0-9-]{2,40}$/)]),
  ) as Record<string, z.ZodString>,
);

export async function saveAvatar(
  avatar: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = AvatarInput.safeParse(avatar);
  if (!parsed.success) return { ok: false, error: FRIENDLY.invalid_avatar };
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: friendly() };
  // "Original" dyes are the default: leave them out so outfits save the same way everywhere.
  const toSave = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => !String(v).endsWith("-auto")));
  let { error } = await sb.rpc("game_set_avatar", { p_avatar: toSave });
  // Until the brands migration is applied the database doesn't know the brand
  // slot: save everything else rather than failing the whole outfit.
  if (error && "brand" in toSave && /invalid_avatar|not_owned/.test(error.message)) {
    const { brand: _brand, ...rest } = toSave;
    void _brand;
    ({ error } = await sb.rpc("game_set_avatar", { p_avatar: rest }));
  }
  if (error) return { ok: false, error: friendly(error.message) };
  revalidatePath("/games", "layout");
  return { ok: true };
}

export async function createChallenge(
  runId: number,
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  if (!Number.isInteger(runId) || runId < 1)
    return { ok: false, error: FRIENDLY.not_found };
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: friendly() };
  const { data, error } = await sb.rpc("game_create_challenge", {
    p_run: runId,
  });
  if (error || typeof data !== "string")
    return { ok: false, error: friendly(error?.message) };
  return { ok: true, code: data };
}
