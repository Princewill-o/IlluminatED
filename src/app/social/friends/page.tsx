import Link from "next/link";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { changeConnection } from "./actions";

import { getSupabase, getViewer } from "@/lib/social/server";

export const metadata: Metadata = { title: "Your Social friends", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/social/friends");
  const sb = await getSupabase();
  const { data: rows, error } = sb ? await sb.from("social_connections").select("requester,recipient,status,created_at").or(`requester.eq.${viewer.id},recipient.eq.${viewer.id}`).order("created_at", { ascending: false }) : { data: [], error: null };
  const ids = [...new Set((rows ?? []).map((row) => row.requester === viewer.id ? row.recipient : row.requester))];
  const { data: profiles } = sb && ids.length ? await sb.from("profiles").select("id,username").in("id", ids) : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
  return <main className="container max-w-3xl py-10 lg:py-14">
    <h1 className="text-4xl tracking-tight">Your Social friends</h1>
    <p className="text-muted-foreground mt-3">Friend requests are private to the people involved. You can remove a connection or block someone at any time.</p>
    {error && <p role="status" className="mt-8 rounded-xl border p-6 text-sm">Friends are being set up. Please try again later.</p>}
    {!error && !rows?.length && <p className="mt-8 rounded-xl border p-6 text-sm">No friends or requests yet. Visit a member&apos;s profile to send a request.</p>}
    <ul className="mt-8 space-y-3">{(rows ?? []).map((row) => {
      const other = row.requester === viewer.id ? row.recipient : row.requester;
      const name = names.get(other);
      if (!name) return null;
      const incoming = row.recipient === viewer.id && row.status === "pending";
      return <li key={`${row.requester}:${row.recipient}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div><Link className="font-semibold text-primary hover:underline" href={`/social/u/${name}`}>{name}</Link><p className="text-muted-foreground text-xs">{row.status === "accepted" ? "Friends" : incoming ? "Wants to be friends" : "Request sent"}</p></div>
        <form action={changeConnection} className="flex gap-2">
          <input type="hidden" name="target" value={other} /><input type="hidden" name="username" value={name} />
          {incoming && <button name="action" value="accept" className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Accept</button>}
          <button name="action" value="remove" className="rounded-lg border px-3 py-2 text-xs font-semibold">{incoming ? "Decline" : "Remove"}</button>
        </form>
      </li>;
    })}</ul>
  </main>;
}
