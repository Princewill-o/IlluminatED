import "server-only";

import { getSupabase } from "@/lib/social/server";

export interface ThreadSummary {
  id: string;
  learnerId: string;
  staffId: string;
  learner: string;
  staff: string;
  org: { slug: string; name: string; accent: string };
  mode: "e2ee" | "moderated";
  guardian: "not_needed" | "pending" | "approved" | "declined";
  closed: boolean;
  lastMessageAt: string;
}

const SELECT =
  "id,learner_id,staff_id,mode,guardian_status,closed,last_message_at,learner:profiles!dm_threads_learner_id_fkey(username),staff:profiles!dm_threads_staff_id_fkey(username),org:organisations(slug,name,accent)";

const one = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

function toSummary(r: Record<string, unknown>): ThreadSummary {
  const org = one(r.org as { slug: string; name: string; accent: string } | null);
  return {
    id: r.id as string,
    learnerId: r.learner_id as string,
    staffId: r.staff_id as string,
    learner: one(r.learner as { username: string } | null)?.username ?? "learner",
    staff: one(r.staff as { username: string } | null)?.username ?? "staff",
    org: org ?? { slug: "", name: "Company", accent: "#6bc6ff" },
    mode: r.mode as ThreadSummary["mode"],
    guardian: r.guardian_status as ThreadSummary["guardian"],
    closed: Boolean(r.closed),
    lastMessageAt: r.last_message_at as string,
  };
}

export async function listThreads(userId: string): Promise<ThreadSummary[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("dm_threads")
    .select(SELECT)
    .or(`learner_id.eq.${userId},staff_id.eq.${userId}`)
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (error) return [];
  return (data ?? []).map((r) => toSummary(r as Record<string, unknown>));
}

export async function getThread(id: string): Promise<ThreadSummary | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("dm_threads").select(SELECT).eq("id", id).maybeSingle();
  return data ? toSummary(data as Record<string, unknown>) : null;
}

export interface Meeting {
  id: string;
  startsAt: string;
  endsAt: string;
  room: string;
  staffId: string;
  bookedBy: string;
  orgSlug: string;
}

/** Upcoming booked office hours between two people. */
export async function meetingsBetween(learnerId: string, staffId: string): Promise<Meeting[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("office_slots")
    .select("id,starts_at,ends_at,room,staff_id,booked_by,org:organisations(slug)")
    .eq("staff_id", staffId)
    .eq("booked_by", learnerId)
    .eq("cancelled", false)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");
  return (data ?? []).map((r) => ({
    id: r.id as string,
    startsAt: r.starts_at as string,
    endsAt: r.ends_at as string,
    room: r.room as string,
    staffId: r.staff_id as string,
    bookedBy: r.booked_by as string,
    orgSlug: one(r.org as unknown as { slug: string } | null)?.slug ?? "",
  }));
}
