import "server-only";

import { getSupabase } from "@/lib/social/server";

export interface ClassInfo {
  id: string;
  name: string;
  subject: string;
  school: string | null;
  code: string;
  ownerId: string;
  createdAt: string;
}

export interface HomeworkQuestion {
  key: string;
  q: string;
  options: string[];
  topic?: string;
}

export interface HomeworkItem {
  id: string;
  classId: string;
  className: string;
  title: string;
  instructions: string | null;
  questions: HomeworkQuestion[];
  dueAt: string;
  createdAt: string;
  /** Your result, if you've handed it in. */
  mine: { correct: number; total: number; attempts: number; submittedAt: string } | null;
}

const toClass = (r: Record<string, unknown>): ClassInfo => ({
  id: String(r.id),
  name: String(r.name),
  subject: String(r.subject),
  school: (r.school as string) ?? null,
  code: String(r.code),
  ownerId: String(r.owner_id),
  createdAt: String(r.created_at),
});

/** Classes you teach and classes you're in. */
export async function loadClasses(userId: string) {
  const sb = await getSupabase();
  if (!sb) return { teaching: [] as ClassInfo[], joined: [] as ClassInfo[] };
  const { data } = await sb.from("classes").select("*").order("created_at", { ascending: false });
  const all = ((data ?? []) as Record<string, unknown>[]).map(toClass);
  return { teaching: all.filter((c) => c.ownerId === userId), joined: all.filter((c) => c.ownerId !== userId) };
}

/** Homework set for the classes you're in, soonest due first. */
export async function loadMyHomework(userId: string): Promise<HomeworkItem[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { joined } = await loadClasses(userId);
  if (!joined.length) return [];
  const names = Object.fromEntries(joined.map((c) => [c.id, c.name]));
  const [hw, subs] = await Promise.all([
    sb.from("homework").select("*").in("class_id", joined.map((c) => c.id)).order("due_at", { ascending: true }).limit(50),
    sb.from("homework_submissions").select("homework_id, correct, total, attempts, submitted_at").eq("user_id", userId),
  ]);
  const mine = new Map(((subs.data ?? []) as Record<string, unknown>[]).map((s) => [String(s.homework_id), s]));
  return ((hw.data ?? []) as Record<string, unknown>[]).map((h) => {
    const s = mine.get(String(h.id));
    return {
      id: String(h.id),
      classId: String(h.class_id),
      className: names[String(h.class_id)] ?? "",
      title: String(h.title),
      instructions: (h.instructions as string) ?? null,
      questions: h.questions as HomeworkQuestion[],
      dueAt: String(h.due_at),
      createdAt: String(h.created_at),
      mine: s ? { correct: Number(s.correct), total: Number(s.total), attempts: Number(s.attempts), submittedAt: String(s.submitted_at) } : null,
    };
  });
}

/** A class you teach: students (usernames only), homework and everyone's results. */
export async function loadClassForTeacher(classId: string, userId: string) {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data: c } = await sb.from("classes").select("*").eq("id", classId).maybeSingle();
  if (!c || c.owner_id !== userId) return null;
  const [roster, hw] = await Promise.all([
    sb.rpc("class_roster", { p_class: classId }),
    sb.from("homework").select("*").eq("class_id", classId).order("due_at", { ascending: false }),
  ]);
  const homework = (hw.data ?? []) as Record<string, unknown>[];
  const ids = homework.map((h) => String(h.id));
  const { data: subs } = ids.length
    ? await sb.from("homework_submissions").select("homework_id, user_id, answers, correct, total, attempts, submitted_at").in("homework_id", ids)
    : { data: [] };
  return {
    cls: toClass(c as Record<string, unknown>),
    students: ((roster.data ?? []) as { user_id: string; username: string | null; joined_at: string }[]).map((r) => ({
      id: r.user_id,
      username: r.username ?? "student",
      joinedAt: r.joined_at,
    })),
    homework: homework.map((h) => ({
      id: String(h.id),
      title: String(h.title),
      dueAt: String(h.due_at),
      questions: h.questions as HomeworkQuestion[],
    })),
    submissions: ((subs ?? []) as Record<string, unknown>[]).map((s) => ({
      homeworkId: String(s.homework_id),
      userId: String(s.user_id),
      answers: s.answers as number[],
      correct: Number(s.correct),
      total: Number(s.total),
      attempts: Number(s.attempts),
      submittedAt: String(s.submitted_at),
    })),
  };
}
