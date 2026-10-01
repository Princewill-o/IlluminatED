import "server-only";

import { getSupabase } from "./server";

import { CONTACT_TOPICS, type ContactTopic } from "@/lib/site";

/** Mirrors reports.urgent in 0003_safety.sql. */
export const URGENT_REASONS = ["self-harm", "personal-info"] as const;

type Row = Record<string, unknown>;
const one = (x: unknown) =>
  ((Array.isArray(x) ? x[0] : x) as Row | null) ?? null;

export interface UrgentReport {
  id: number;
  reason: string;
  note: string | null;
  createdAt: string;
  kind: "thread" | "post";
  contentId: number;
  threadId: number;
  title: string;
  body: string;
  authorId: string | null;
  author: string | null;
  hidden: boolean;
}

/** Open reports that someone may be at risk or personal info was shared, oldest first. */
export async function urgentReports(): Promise<UrgentReport[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("reports")
    .select(
      "id, reason, note, created_at, thread_id, post_id, thread:threads(id, title, body, author_id, hidden, author:profiles(username)), post:posts(id, thread_id, body, author_id, hidden, author:profiles(username))",
    )
    .eq("resolved", false)
    .in("reason", [...URGENT_REASONS])
    .order("created_at", { ascending: true })
    .limit(100);
  return (data ?? []).map((raw) => {
    const r = raw as unknown as Row;
    const t = one(r.thread);
    const p = one(r.post);
    const c = t ?? p;
    return {
      id: Number(r.id),
      reason: String(r.reason),
      note: (r.note as string) ?? null,
      createdAt: String(r.created_at),
      kind: t ? "thread" : "post",
      contentId: Number(c?.id ?? r.thread_id ?? r.post_id),
      threadId: Number(t ? t.id : (p?.thread_id ?? 0)),
      title: t ? String(t.title) : "Reply",
      body: String(c?.body ?? "(deleted)"),
      authorId: (c?.author_id as string) ?? null,
      author: (one(c?.author)?.username as string) ?? null,
      hidden: Boolean(c?.hidden),
    };
  });
}

export interface ContactMessage {
  id: number;
  createdAt: string;
  name: string | null;
  email: string;
  topic: ContactTopic;
  message: string;
  status: "new" | "handled";
  signedIn: boolean;
}

/** Contact messages, safeguarding first, then newest first. Moderators only (RLS). */
export async function contactMessages({
  topic,
  status,
}: {
  topic?: ContactTopic;
  status: "new" | "handled";
}): Promise<{ messages: ContactMessage[]; counts: Record<string, number> }> {
  const sb = await getSupabase();
  if (!sb) return { messages: [], counts: {} };
  let q = sb
    .from("contact_messages")
    .select("id, created_at, name, email, topic, message, status, user_id")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (topic) q = q.eq("topic", topic);
  const [{ data }, { data: open }] = await Promise.all([
    q,
    sb.from("contact_messages").select("topic").eq("status", "new").limit(2000),
  ]);
  const counts: Record<string, number> = {};
  (open ?? []).forEach((r) => {
    counts[String(r.topic)] = (counts[String(r.topic)] ?? 0) + 1;
  });
  const messages = (data ?? []).map((r) => ({
    id: Number(r.id),
    createdAt: String(r.created_at),
    name: (r.name as string) ?? null,
    email: String(r.email),
    topic: r.topic as ContactTopic,
    message: String(r.message),
    status: r.status === "handled" ? ("handled" as const) : ("new" as const),
    signedIn: Boolean(r.user_id),
  }));
  messages.sort(
    (a, b) =>
      Number(b.topic === "safeguarding") - Number(a.topic === "safeguarding"),
  );
  return { messages, counts };
}

export const topicLabel = (t: string) =>
  CONTACT_TOPICS.find((x) => x.value === t)?.label ?? t;

export async function blockedTerms(): Promise<string[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("blocked_terms")
    .select("term")
    .order("term")
    .limit(1000);
  return (data ?? []).map((r) => String(r.term));
}

export async function bannedMembers(): Promise<
  { id: string; username: string; joined: string }[]
> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("profiles")
    .select("id, username, created_at")
    .eq("banned", true)
    .order("username")
    .limit(500);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    username: String(r.username),
    joined: String(r.created_at),
  }));
}
