import "server-only";

import { type Company } from "@/game/core/companies";
import { type Avatar, sanitiseAvatar } from "@/game/core/cosmetics";
import { type DeckSources, sourcesFor } from "@/game/core/deck";
import { FLASHCARDS, QUESTION_BANK } from "@/lib/data/topics";
import { getSupabase } from "@/lib/social/server";

export interface CompanyProgress {
  bestScore: number;
  bestRank: number;
  shifts: number;
}

export interface PlayerState {
  /** False until the games migration is applied. The game still runs, it just can't save. */
  ready: boolean;
  xp: number;
  level: number;
  clout: number;
  /** Current streak, already zeroed if a day was missed. */
  streak: number;
  streakBest: number;
  shiftsPlayed: number;
  dailyBonusReady: boolean;
  avatar: Avatar;
  owned: string[];
  companies: Record<string, CompanyProgress>;
}

/** Today's date in London as YYYY-MM-DD (matches private.london_today()). */
export function londonDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const EMPTY: PlayerState = {
  ready: false,
  xp: 0,
  level: 1,
  clout: 0,
  streak: 0,
  streakBest: 0,
  shiftsPlayed: 0,
  dailyBonusReady: true,
  avatar: sanitiseAvatar(null, new Set()),
  owned: [],
  companies: {},
};

export async function loadPlayer(userId: string): Promise<PlayerState> {
  const sb = await getSupabase();
  if (!sb) return EMPTY;
  const [stats, items, progress] = await Promise.all([
    sb.from("player_stats").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("player_items").select("item_id").eq("user_id", userId),
    sb
      .from("game_company_progress")
      .select("company_id,best_score,best_rank,shifts")
      .eq("user_id", userId),
  ]);
  if (stats.error || items.error || progress.error) return EMPTY;
  const owned = (items.data ?? []).map((r) => r.item_id as string);
  const s = stats.data;
  const last = (s?.last_played_on as string | null) ?? null;
  const today = londonDate();
  const alive = last === today || last === londonDate(-1);
  return {
    ready: true,
    xp: s?.xp ?? 0,
    level: s?.level ?? 1,
    clout: s?.clout ?? 0,
    streak: alive ? (s?.streak_days ?? 0) : 0,
    streakBest: s?.streak_best ?? 0,
    shiftsPlayed: s?.shifts_played ?? 0,
    dailyBonusReady: last !== today,
    avatar: sanitiseAvatar(s?.avatar, new Set(owned)),
    owned,
    companies: Object.fromEntries(
      (progress.data ?? []).map((r) => [
        r.company_id,
        { bestScore: r.best_score, bestRank: r.best_rank, shifts: r.shifts },
      ]),
    ),
  };
}

const ALL_SOURCES: DeckSources = {
  bank: QUESTION_BANK.map((q) => ({
    key: q.key,
    q: q.q,
    options: q.options,
    answer: q.answer,
    explain: q.explain,
    topicTitle: q.topicTitle,
    courseId: q.courseId,
  })),
  terms: FLASHCARDS.filter((f) => f.kind === "Key term").map((f) => ({
    key: f.key,
    front: f.front,
    back: f.back,
    topicTitle: f.topicTitle,
    courseId: f.courseId,
  })),
};

/** Only the questions this company needs, so the game page stays light. */
export const gameSources = (company: Company, prefer: string[] = []) =>
  sourcesFor(company, ALL_SOURCES, prefer);

export interface ChallengeCard {
  code: string;
  company: string;
  seed: number;
  score: number;
  rank: number;
  username: string | null;
  avatar: Avatar;
  attempts: number;
  beaten: number;
  best: number;
}

export async function loadChallenge(
  code: string,
): Promise<ChallengeCard | null> {
  if (!/^[A-Za-z0-9]{6}$/.test(code)) return null;
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("game_challenge", { p_code: code });
  if (error || !data) return null;
  const c = data as Omit<ChallengeCard, "avatar"> & { avatar: unknown };
  return {
    ...c,
    avatar: sanitiseAvatar(
      c.avatar,
      new Set(Object.values(c.avatar ?? {}) as string[]),
    ),
  };
}
