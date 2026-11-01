"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { type RaceEvent, replay, rivalEvents, rivals, trackById } from "@/game/core/maths-racing";
import { getSupabase } from "@/lib/social/server";

const FRIENDLY: Record<string, string> = {
  not_allowed: "Sign in to save your races.",
  slow_down: "Take a breather: too many races started in the last minute.",
  no_ghost: "That ghost race isn't available any more.",
  too_fast: "That race didn't add up, so it wasn't saved.",
  invalid: "That race couldn't be saved.",
};
const friendly = (m?: string) => FRIENDLY[Object.keys(FRIENDLY).find((k) => m?.includes(k)) ?? ""] ?? "Couldn't reach the server. Your race wasn't saved.";

export type Board = { top: { run: number; name: string; time: number; acc: number; me: boolean }[]; mine: { run: number; time: number } | null };
export type Ghost = { id: number; track: string; seed: number; time: number; events: RaceEvent[]; name: string };

export async function racingStart(track: string, mode: "campaign" | "trial" | "ghost", ghost?: number) {
  if (!trackById(track)) return { ok: false as const, error: FRIENDLY.invalid };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: friendly() };
  const { data, error } = await sb.rpc("racing_start", { p_track: track, p_mode: mode, p_ghost: ghost ?? null });
  if (error) return { ok: false as const, error: friendly(error.message) };
  return { ok: true as const, ...(data as { id: number; seed: number }) };
}

const eventSchema = z.array(z.union([
  z.object({ t: z.number().int().min(0).max(900_000), kind: z.literal("answer"), choice: z.number().int().min(0).max(3) }),
  z.object({ t: z.number().int().min(0).max(900_000), kind: z.literal("lane"), dir: z.union([z.literal(-1), z.literal(1)]) }),
])).max(1500);

/** Replays the race on the server to work out the real time and finishing place. */
export async function racingFinish(id: number, track: string, seed: number, events: RaceEvent[], ghostTime?: number | null) {
  const t = trackById(track);
  const parsed = eventSchema.safeParse(events);
  if (!t || !parsed.success || !Number.isInteger(id) || !Number.isInteger(seed)) return { ok: false as const, error: FRIENDLY.invalid };
  const me = replay(t, seed, parsed.data);
  if (me.finishedAt === null) return { ok: false as const, error: FRIENDLY.invalid };
  const others = ghostTime ? [ghostTime] : rivals(t, seed).map((r, i) => replay(t, seed, rivalEvents(t, seed, r, i)).finishedAt ?? Infinity);
  const place = 1 + others.filter((x) => x < me.finishedAt!).length;
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: friendly() };
  const { data, error } = await sb.rpc("racing_finish", { p_id: id, p_time_ms: me.finishedAt, p_correct: me.right, p_wrong: me.wrong, p_place: Math.min(5, place), p_events: parsed.data });
  if (error) return { ok: false as const, error: friendly(error.message) };
  revalidatePath("/games/racing");
  const r = data as { stars: number | null; clout: number; best: number | null };
  return { ok: true as const, time: me.finishedAt, place, right: me.right, wrong: me.wrong, ...r };
}

export async function racingProgress(): Promise<Record<string, { stars: number; best: number | null }>> {
  const sb = await getSupabase();
  if (!sb) return {};
  const { data } = await sb.rpc("racing_progress");
  return (data as Record<string, { stars: number; best: number | null }>) ?? {};
}

export async function racingBoard(track: string): Promise<Board> {
  const sb = await getSupabase();
  if (!sb || !trackById(track)) return { top: [], mine: null };
  const { data } = await sb.rpc("racing_board", { p_track: track });
  return (data as Board) ?? { top: [], mine: null };
}

export async function racingGhost(run: number): Promise<Ghost | null> {
  const sb = await getSupabase();
  if (!sb || !Number.isInteger(run)) return null;
  const { data } = await sb.rpc("racing_ghost", { p_run: run });
  return (data as Ghost) ?? null;
}
