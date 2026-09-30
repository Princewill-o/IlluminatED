import "server-only";

import { type CategorySlug, socialConfigured } from "./config";
import { SAMPLE_POSTS, SAMPLE_THREADS } from "./sample";
import { getSupabase } from "./server";

export const PAGE_SIZE = 20;

export interface Author {
  username: string;
  role: "member" | "moderator";
}

export interface ThreadSummary {
  id: number;
  category: CategorySlug;
  university: string | null;
  title: string;
  excerpt: string;
  author: Author | null;
  replyCount: number;
  createdAt: string;
  lastActivityAt: string;
  hidden: boolean;
  locked: boolean;
}

export interface Reply {
  id: number;
  body: string;
  author: Author | null;
  authorId: string | null;
  createdAt: string;
  hidden: boolean;
}

export interface Thread extends ThreadSummary {
  body: string;
  authorId: string | null;
  replies: Reply[];
}

const THREAD_COLS =
  "id, category, university, title, body, author_id, reply_count, created_at, last_activity_at, hidden, locked, author:profiles(username, role)";

type Row = Record<string, unknown>;

const toAuthor = (a: unknown): Author | null => {
  const x = (Array.isArray(a) ? a[0] : a) as Row | null;
  return x && typeof x.username === "string"
    ? {
        username: x.username,
        role: x.role === "moderator" ? "moderator" : "member",
      }
    : null;
};

const excerpt = (s: string) =>
  s.length > 180 ? s.slice(0, 177).trimEnd() + "…" : s;

const toSummary = (r: Row): ThreadSummary => ({
  id: Number(r.id),
  category: r.category as CategorySlug,
  university: (r.university as string) ?? null,
  title: String(r.title),
  excerpt: excerpt(String(r.body ?? "")),
  author: toAuthor(r.author),
  replyCount: Number(r.reply_count ?? 0),
  createdAt: String(r.created_at),
  lastActivityAt: String(r.last_activity_at),
  hidden: Boolean(r.hidden),
  locked: Boolean(r.locked),
});

export interface ThreadQuery {
  category?: CategorySlug;
  university?: string;
  q?: string;
  page?: number;
}

export async function listThreads({
  category,
  university,
  q,
  page = 1,
}: ThreadQuery) {
  const from = (page - 1) * PAGE_SIZE;
  if (!socialConfigured) {
    let rows = SAMPLE_THREADS.filter(
      (t) =>
        (!category || t.category === category) &&
        (!university ||
          t.university?.toLowerCase() === university.toLowerCase()) &&
        (!q || t.title.toLowerCase().includes(q.toLowerCase())),
    );
    rows = rows.sort((a, b) =>
      b.lastActivityAt.localeCompare(a.lastActivityAt),
    );
    return {
      threads: rows.slice(from, from + PAGE_SIZE),
      total: rows.length,
      error: null as string | null,
    };
  }
  const sb = (await getSupabase())!;
  let query = sb
    .from("threads")
    .select(THREAD_COLS, { count: "exact" })
    .eq("hidden", false)
    .order("last_activity_at", { ascending: false });
  if (category) query = query.eq("category", category);
  if (university)
    query = query.ilike("university", university.replace(/[%_]/g, ""));
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  return {
    threads: (data ?? []).map((r) => toSummary(r as Row)),
    total: count ?? 0,
    error: error ? "load_failed" : null,
  };
}

export async function categoryCounts(): Promise<Record<string, number>> {
  if (!socialConfigured) {
    return SAMPLE_THREADS.reduce<Record<string, number>>(
      (acc, t) => ({ ...acc, [t.category]: (acc[t.category] ?? 0) + 1 }),
      {},
    );
  }
  const sb = (await getSupabase())!;
  const { CATEGORIES } = await import("./config");
  const entries = await Promise.all(
    CATEGORIES.map(async (c) => {
      const { count } = await sb
        .from("threads")
        .select("id", { count: "exact", head: true })
        .eq("category", c.slug)
        .eq("hidden", false);
      return [c.slug, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function getThread(id: number): Promise<Thread | null> {
  if (!socialConfigured) {
    const t = SAMPLE_THREADS.find((x) => x.id === id);
    if (!t) return null;
    return {
      ...t,
      authorId: null,
      replies: SAMPLE_POSTS.filter((p) => p.threadId === id).map((p) => ({
        ...p,
        authorId: null,
      })),
    };
  }
  const sb = (await getSupabase())!;
  const { data: t } = await sb
    .from("threads")
    .select(THREAD_COLS)
    .eq("id", id)
    .maybeSingle();
  if (!t) return null;
  const { data: posts } = await sb
    .from("posts")
    .select(
      "id, body, author_id, created_at, hidden, author:profiles(username, role)",
    )
    .eq("thread_id", id)
    .order("created_at", { ascending: true })
    .limit(500);
  const row = t as Row;
  return {
    ...toSummary(row),
    body: String(row.body),
    authorId: (row.author_id as string) ?? null,
    replies: (posts ?? []).map((p) => {
      const r = p as Row;
      return {
        id: Number(r.id),
        body: String(r.body),
        author: toAuthor(r.author),
        authorId: (r.author_id as string) ?? null,
        createdAt: String(r.created_at),
        hidden: Boolean(r.hidden),
      };
    }),
  };
}

export async function listUniversities(): Promise<
  { university: string; count: number; lastActivityAt: string }[]
> {
  if (!socialConfigured) {
    const map = new Map<
      string,
      { university: string; count: number; lastActivityAt: string }
    >();
    SAMPLE_THREADS.filter((t) => t.university).forEach((t) => {
      const k = t.university!.toLowerCase();
      const cur = map.get(k);
      map.set(k, {
        university: t.university!,
        count: (cur?.count ?? 0) + 1,
        lastActivityAt:
          cur && cur.lastActivityAt > t.lastActivityAt
            ? cur.lastActivityAt
            : t.lastActivityAt,
      });
    });
    return [...map.values()].sort(
      (a, b) => b.count - a.count || a.university.localeCompare(b.university),
    );
  }
  const sb = (await getSupabase())!;
  const { data } = await sb
    .from("university_counts")
    .select("university, thread_count, last_activity_at")
    .order("thread_count", { ascending: false })
    .limit(300);
  return (data ?? []).map((r) => ({
    university: String(r.university),
    count: Number(r.thread_count),
    lastActivityAt: String(r.last_activity_at),
  }));
}

export async function getProfile(username: string) {
  if (!socialConfigured) {
    const threads = SAMPLE_THREADS.filter(
      (t) => t.author?.username === username,
    );
    if (
      !threads.length &&
      !SAMPLE_POSTS.some((p) => p.author?.username === username)
    )
      return null;
    return {
      username,
      role: "member" as const,
      joined: "2026-09-01T00:00:00Z",
      threads,
    };
  }
  const sb = (await getSupabase())!;
  const { data: p } = await sb
    .from("profiles")
    .select("id, username, role, created_at")
    .eq("username", username)
    .maybeSingle();
  if (!p) return null;
  const { data: threads } = await sb
    .from("threads")
    .select(THREAD_COLS)
    .eq("author_id", p.id)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(30);
  return {
    username: String(p.username),
    role: p.role === "moderator" ? ("moderator" as const) : ("member" as const),
    joined: String(p.created_at),
    threads: (threads ?? []).map((r) => toSummary(r as Row)),
  };
}

export interface ModItem {
  kind: "thread" | "post";
  id: number;
  threadId: number;
  title: string;
  body: string;
  author: Author | null;
  authorId: string | null;
  reportCount: number;
  hidden: boolean;
  reasons: string[];
  createdAt: string;
}

/** Content with open reports or currently hidden. Moderators only (enforced by RLS). */
export async function moderationQueue(): Promise<ModItem[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data: reports } = await sb
    .from("reports")
    .select("thread_id, post_id, reason")
    .eq("resolved", false)
    .limit(500);
  const reasons = new Map<string, string[]>();
  (reports ?? []).forEach((r) => {
    const key = r.thread_id ? `t${r.thread_id}` : `p${r.post_id}`;
    reasons.set(key, [...(reasons.get(key) ?? []), String(r.reason)]);
  });
  const threadIds = [...reasons.keys()]
    .filter((k) => k.startsWith("t"))
    .map((k) => Number(k.slice(1)));
  const postIds = [...reasons.keys()]
    .filter((k) => k.startsWith("p"))
    .map((k) => Number(k.slice(1)));

  const [
    { data: threads },
    { data: posts },
    { data: hiddenThreads },
    { data: hiddenPosts },
  ] = await Promise.all([
    threadIds.length
      ? sb
          .from("threads")
          .select(THREAD_COLS + ", report_count")
          .in("id", threadIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? sb
          .from("posts")
          .select(
            "id, thread_id, body, author_id, created_at, hidden, report_count, author:profiles(username, role)",
          )
          .in("id", postIds)
      : Promise.resolve({ data: [] }),
    sb
      .from("threads")
      .select(THREAD_COLS + ", report_count")
      .eq("hidden", true)
      .limit(100),
    sb
      .from("posts")
      .select(
        "id, thread_id, body, author_id, created_at, hidden, report_count, author:profiles(username, role)",
      )
      .eq("hidden", true)
      .limit(100),
  ]);

  const items = new Map<string, ModItem>();
  [...(threads ?? []), ...(hiddenThreads ?? [])].forEach((raw) => {
    const r = raw as unknown as Row;
    items.set(`t${r.id}`, {
      kind: "thread",
      id: Number(r.id),
      threadId: Number(r.id),
      title: String(r.title),
      body: String(r.body),
      author: toAuthor(r.author),
      authorId: (r.author_id as string) ?? null,
      reportCount: Number(r.report_count ?? 0),
      hidden: Boolean(r.hidden),
      reasons: reasons.get(`t${r.id}`) ?? [],
      createdAt: String(r.created_at),
    });
  });
  [...(posts ?? []), ...(hiddenPosts ?? [])].forEach((raw) => {
    const r = raw as unknown as Row;
    items.set(`p${r.id}`, {
      kind: "post",
      id: Number(r.id),
      threadId: Number(r.thread_id),
      title: "Reply",
      body: String(r.body),
      author: toAuthor(r.author),
      authorId: (r.author_id as string) ?? null,
      reportCount: Number(r.report_count ?? 0),
      hidden: Boolean(r.hidden),
      reasons: reasons.get(`p${r.id}`) ?? [],
      createdAt: String(r.created_at),
    });
  });
  return [...items.values()].sort((a, b) => b.reportCount - a.reportCount);
}
