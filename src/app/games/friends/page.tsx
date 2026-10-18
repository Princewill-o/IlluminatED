import Link from "next/link";

import { CityHeading } from "@/components/game/city/city-panels";
import {
  FriendsPanel,
  type FriendEdge,
} from "@/components/game/city/friends-panel";
import { requireAccount } from "@/lib/account/server";
import { getSupabase } from "@/lib/social/server";
export const metadata = { title: "Friends & private messages" };
export default async function FriendsPage() {
  const account = await requireAccount("/games/friends");
  const sb = await getSupabase();
  const select =
    "id,low_id,high_id,requested_by,state,blocked_by,low:profiles!city_friends_low_id_fkey(username),high:profiles!city_friends_high_id_fkey(username)";
  const active = sb
    ? await sb
        .from("city_friends")
        .select(select)
        .or(`low_id.eq.${account.id},high_id.eq.${account.id}`)
        .in("state", ["accepted", "pending"])
        .order("updated_at", { ascending: false })
        .limit(100)
    : { data: [], error: true };
  const blocked = sb
    ? await sb
        .from("city_friends")
        .select(select)
        .or(`low_id.eq.${account.id},high_id.eq.${account.id}`)
        .eq("state", "blocked")
        .order("updated_at", { ascending: false })
        .limit(30)
    : { data: [], error: true };
  const data = [...(active.data ?? []), ...(blocked.data ?? [])];
  const error = active.error || blocked.error;
  const one = (v: unknown) =>
    (Array.isArray(v) ? v[0] : v) as { username: string } | null;
  const friends: FriendEdge[] = (data ?? []).map((f) => ({
    id: f.id,
    otherId: f.low_id === account.id ? f.high_id : f.low_id,
    username:
      one(f.low_id === account.id ? f.high : f.low)?.username ?? "player",
    requestedBy: f.requested_by,
    state: f.state,
    blockedBy: f.blocked_by,
  }));
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <CityHeading eyebrow="Your people" title="Meet. Study. Stay connected.">
        Keep up to 30 friends. Requests must be accepted before private messages
        become available. Your exact username is @{account.profile.username}.
      </CityHeading>
      {account.profile.role === "moderator" && (
        <Link
          href="/games/friends/reports"
          className="mb-5 inline-block min-h-11 font-bold underline"
        >
          Review reported messages →
        </Link>
      )}
      <FriendsPanel meId={account.id} friends={friends} ready={!error} />
    </main>
  );
}
