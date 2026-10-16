import "server-only";

import type { CareerRecord } from "@/game/core/careers";
import { type Placed, STARTER_LAYOUT } from "@/game/core/homes";
import { getSupabase } from "@/lib/social/server";

export interface CareerState {
  active: (CareerRecord & { rank: number; rankShifts: number; rankCorrect: number; rankTotal: number }) | null;
  history: CareerRecord[];
  skills: Record<string, { correct: number; total: number }>;
  recent: { workplace: string; role: string; correct: number; total: number; pay: number; at: string }[];
}

const day = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

export async function loadCareer(userId: string): Promise<CareerState> {
  const empty: CareerState = { active: null, history: [], skills: {}, recent: [] };
  const sb = await getSupabase();
  if (!sb) return empty;
  const [jobs, skills, shifts] = await Promise.all([
    sb.from("career_jobs").select("*").eq("user_id", userId).order("hired_at", { ascending: false }),
    sb.from("career_skills").select("skill, correct, total").eq("user_id", userId),
    sb.from("career_shifts").select("workplace, role, correct, total, pay, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
  ]);
  const rows = (jobs.data ?? []) as Record<string, unknown>[];
  const toRecord = (j: Record<string, unknown>): CareerRecord => ({
    workplace: String(j.workplace),
    role: String(j.role),
    shifts: Number(j.shifts),
    correct: Number(j.correct),
    total: Number(j.total),
    startedOn: day(String(j.hired_at)),
  });
  const a = rows.find((j) => j.status === "active");
  return {
    active: a
      ? { ...toRecord(a), rank: Number(a.rank), rankShifts: Number(a.rank_shifts), rankCorrect: Number(a.rank_correct), rankTotal: Number(a.rank_total) }
      : null,
    history: rows.map(toRecord),
    skills: Object.fromEntries(((skills.data ?? []) as { skill: string; correct: number; total: number }[]).map((s) => [s.skill, { correct: s.correct, total: s.total }])),
    recent: ((shifts.data ?? []) as Record<string, unknown>[]).map((s) => ({
      workplace: String(s.workplace),
      role: String(s.role),
      correct: Number(s.correct),
      total: Number(s.total),
      pay: Number(s.pay),
      at: day(String(s.created_at)),
    })),
  };
}

export interface HomeState {
  owned: string[];
  current: string;
  layout: Placed[];
  furniture: Record<string, number>;
}

export async function loadHome(userId: string): Promise<HomeState> {
  const fallback: HomeState = { owned: ["studio"], current: "studio", layout: STARTER_LAYOUT, furniture: {} };
  const sb = await getSupabase();
  if (!sb) return fallback;
  const { data } = await sb.from("player_homes").select("owned, current, layout, furniture").eq("user_id", userId).maybeSingle();
  if (!data) return fallback;
  return {
    owned: (data.owned as string[]) ?? ["studio"],
    current: String(data.current ?? "studio"),
    layout: Array.isArray(data.layout) ? (data.layout as Placed[]) : STARTER_LAYOUT,
    furniture: (data.furniture as Record<string, number>) ?? {},
  };
}
