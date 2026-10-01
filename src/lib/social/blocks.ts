import "server-only";

import { socialConfigured } from "./config";
import type { ThreadSummary } from "./data";
import { getSupabase } from "./server";

export interface BlockList {
  ids: Set<string>;
  /** Lower-cased usernames, for lists that only carry the author's username. */
  usernames: Set<string>;
}

const EMPTY: BlockList = { ids: new Set(), usernames: new Set() };

/** Members the signed-in viewer has blocked. Empty when signed out or not configured. */
export async function getBlockList(): Promise<BlockList> {
  if (!socialConfigured) return EMPTY;
  const sb = await getSupabase();
  if (!sb) return EMPTY;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return EMPTY;
  const { data, error } = await sb
    .from("user_blocks")
    .select("blocked")
    .eq("blocker", auth.user.id)
    .limit(1000);
  // Table missing (migration not applied yet) or no blocks: nothing to hide.
  if (error || !data?.length) return EMPTY;
  const ids = data.map((r) => String(r.blocked));
  const { data: profiles } = await sb
    .from("profiles")
    .select("username")
    .in("id", ids);
  return {
    ids: new Set(ids),
    usernames: new Set(
      (profiles ?? []).map((p) => String(p.username).toLowerCase()),
    ),
  };
}

export function withoutBlocked<T extends Pick<ThreadSummary, "author">>(
  threads: T[],
  blocks: BlockList,
): T[] {
  if (!blocks.usernames.size) return threads;
  return threads.filter(
    (t) => !t.author || !blocks.usernames.has(t.author.username.toLowerCase()),
  );
}

/** The profile id for a username, and whether the viewer has blocked them. */
export async function getBlockState(username: string): Promise<{
  targetId: string;
  viewerId: string | null;
  blocked: boolean;
} | null> {
  if (!socialConfigured) return null;
  const sb = await getSupabase();
  if (!sb) return null;
  const { data: p } = await sb
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!p) return null;
  const { data: auth } = await sb.auth.getUser();
  const viewerId = auth.user?.id ?? null;
  if (!viewerId) return { targetId: String(p.id), viewerId, blocked: false };
  const { data: b } = await sb
    .from("user_blocks")
    .select("blocked")
    .eq("blocker", viewerId)
    .eq("blocked", p.id)
    .maybeSingle();
  return { targetId: String(p.id), viewerId, blocked: Boolean(b) };
}
