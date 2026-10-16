import "server-only";

import { getSupabase } from "@/lib/social/server";

export type ArcadeState = Record<string, { best: number; plays: number }>;

/** Which arcade games you own, with your best scores. */
export async function loadArcade(userId: string): Promise<ArcadeState> {
  const sb = await getSupabase();
  if (!sb) return {};
  const { data } = await sb.from("player_arcade").select("game, best, plays").eq("user_id", userId);
  return Object.fromEntries(((data ?? []) as { game: string; best: number; plays: number }[]).map((r) => [r.game, { best: r.best, plays: r.plays }]));
}
