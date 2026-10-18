"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { SKILLS, WORKPLACES } from "@/game/core/careers";
import { FURNITURE, HOMES, validLayout } from "@/game/core/homes";
import { getSupabase } from "@/lib/social/server";

const FRIENDLY: Record<string, string> = {
  overlap: "That furniture overlaps another item.",
  door_blocked: "Keep the front door clear.",
  unreachable: "Leave a clear walking path to the front of every item.",
  not_allowed: "Sign in with your IlluminatED account to work and save.",
  cooldown: "They've just interviewed you. Brush up and try again in 10 minutes.",
  already_hired: "You already work here.",
  no_job: "You need a job first. Pop into the job centre.",
  too_fast: "That shift was a bit quick to be real. Take your time on each task.",
  rate_limited: "Take a short break between shifts (45 seconds).",
  not_enough_clout: "Not enough Clout yet. Work a few shifts to earn more!",
  unknown_item: "That item isn't for sale.",
  too_many: "You've got plenty of those already.",
  not_owned: "You need to buy that first.",
  out_of_room: "That doesn't fit in the room.",
  invalid: "That didn't save. Try again.",
};
const friendly = (m?: string) => FRIENDLY[Object.keys(FRIENDLY).find((k) => m?.includes(k)) ?? ""] ?? "Couldn't reach the server. Try again in a moment.";
type Result<T = Record<string, unknown>> = { ok: true; data: T } | { ok: false; error: string };

async function rpc<T>(fn: string, args: Record<string, unknown>, paths: string[]): Promise<Result<T>> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: friendly() };
  const { data, error } = await sb.rpc(fn, args);
  if (error) return { ok: false, error: friendly(error.message) };
  paths.forEach((p) => revalidatePath(p));
  return { ok: true, data: data as T };
}

const workplaceId = z.string().refine((id) => WORKPLACES.some((w) => w.id === id));

export async function sitInterview(workplace: string, correct: number, durationMs: number) {
  const p = z.object({ workplace: workplaceId, correct: z.number().int().min(0).max(3), durationMs: z.number().int().min(0).max(3_600_000) }).safeParse({ workplace, correct, durationMs });
  if (!p.success) return { ok: false as const, error: FRIENDLY.invalid };
  return rpc<{ passed: boolean; role: string }>("career_interview", { p_workplace: workplace, p_correct: correct, p_duration_ms: durationMs }, ["/games/careers", "/games/world"]);
}

export async function finishWorkShift(seed: number, correct: number, durationMs: number, skills: Record<string, [number, number]>) {
  const p = z
    .object({
      seed: z.number().int().min(1).max(2_147_483_647),
      correct: z.number().int().min(0).max(5),
      durationMs: z.number().int().min(0).max(3_600_000),
      skills: z.record(z.string().refine((k) => k in SKILLS), z.tuple([z.number().int().min(0).max(5), z.number().int().min(1).max(5)])),
    })
    .safeParse({ seed, correct, durationMs, skills });
  if (!p.success) return { ok: false as const, error: FRIENDLY.invalid };
  return rpc<{ pay: number; promoted: boolean; role: string; shifts: number }>(
    "career_finish_shift",
    { p_seed: seed, p_correct: correct, p_total: 5, p_duration_ms: durationMs, p_skills: skills },
    ["/games/careers", "/games/world", "/me"],
  );
}

export async function quitJob() {
  return rpc("career_quit", {}, ["/games/careers"]);
}

export async function buyHome(home: string) {
  if (!HOMES.some((h) => h.id === home)) return { ok: false as const, error: FRIENDLY.invalid };
  return rpc("home_buy", { p_home: home }, ["/games/home", "/games/world"]);
}

export async function buyFurniture(item: string) {
  if (!FURNITURE.some((f) => f.id === item && !f.starter)) return { ok: false as const, error: FRIENDLY.unknown_item };
  return rpc("furniture_buy", { p_item: item }, ["/games/home"]);
}

export async function saveLayout(layout: { key: string; item: string; x: number; y: number }[]) {
  const parsed = z.array(z.object({ key: z.string().min(1).max(40), item: z.string().max(60), x: z.number().int(), y: z.number().int() })).max(40).safeParse(layout);
  if (!parsed.success) return { ok: false as const, error: FRIENDLY.invalid };
  const problem = validLayout(layout);
  if (problem) return { ok: false as const, error: problem };
  return rpc("home_save_layout", { p_layout: layout.map(({ key, item, x, y }) => ({ key: key.slice(0, 40), item, x, y })) }, ["/games/home", "/games/world"]);
}
