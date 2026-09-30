import "server-only";

import { getSupabase } from "@/lib/social/server";
import {
  DEFAULT_PRICES,
  type HelpType,
  type Price,
  type Speed,
} from "@/lib/tutoring";

export interface TutorRequest {
  id: number;
  studentId: string;
  tutorId: string | null;
  student: string | null;
  tutor: string | null;
  courseId: string;
  subject: string;
  topic: string | null;
  helpType: HelpType;
  speed: Speed;
  details: string;
  availability: string | null;
  pricePence: number;
  matchBy: string;
  replyHours: number;
  needsGuardian: boolean;
  guardianOk: boolean;
  status: "open" | "matched" | "completed" | "cancelled";
  createdAt: string;
  lastMessageAt: string;
}

export interface TutorMessage {
  id: number;
  senderId: string;
  sender: string | null;
  senderRole: string | null;
  body: string;
  createdAt: string;
}

const COLS =
  "id, student_id, tutor_id, course_id, subject, topic, help_type, speed, details, availability, price_pence, match_by, reply_hours, needs_guardian, guardian_ok, status, created_at, last_message_at, student:profiles!tutor_requests_student_id_fkey(username), tutor:profiles!tutor_requests_tutor_id_fkey(username)";

type Row = Record<string, unknown>;
const one = (x: unknown) => (Array.isArray(x) ? x[0] : x) as Row | null;

const toRequest = (r: Row): TutorRequest => ({
  id: Number(r.id),
  studentId: String(r.student_id),
  tutorId: (r.tutor_id as string) ?? null,
  student: (one(r.student)?.username as string) ?? null,
  tutor: (one(r.tutor)?.username as string) ?? null,
  courseId: String(r.course_id),
  subject: String(r.subject),
  topic: (r.topic as string) ?? null,
  helpType: r.help_type as HelpType,
  speed: r.speed as Speed,
  details: String(r.details),
  availability: (r.availability as string) ?? null,
  pricePence: Number(r.price_pence),
  matchBy: String(r.match_by),
  replyHours: Number(r.reply_hours),
  needsGuardian: Boolean(r.needs_guardian),
  guardianOk: Boolean(r.guardian_ok),
  status: r.status as TutorRequest["status"],
  createdAt: String(r.created_at),
  lastMessageAt: String(r.last_message_at),
});

export async function getPrices(): Promise<{ prices: Price[]; live: boolean }> {
  const sb = await getSupabase();
  if (!sb) return { prices: DEFAULT_PRICES, live: false };
  const { data, error } = await sb
    .from("tutoring_prices")
    .select("help_type, speed, price_pence, match_hours, reply_hours");
  if (error || !data?.length) return { prices: DEFAULT_PRICES, live: false };
  return {
    live: true,
    prices: data.map((p) => ({
      helpType: p.help_type as HelpType,
      speed: p.speed as Speed,
      pricePence: p.price_pence,
      matchHours: p.match_hours,
      replyHours: p.reply_hours,
    })),
  };
}

export async function listMyRequests(userId: string): Promise<TutorRequest[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("tutor_requests")
    .select(COLS)
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((r) => toRequest(r as Row));
}

export async function getRequest(id: number) {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("tutor_requests")
    .select(COLS)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const [{ data: messages }, { data: guardian }] = await Promise.all([
    sb
      .from("tutor_messages")
      .select(
        "id, sender_id, body, created_at, sender:profiles(username, role)",
      )
      .eq("request_id", id)
      .order("created_at", { ascending: true })
      .limit(500),
    sb
      .from("request_guardians")
      .select("email")
      .eq("request_id", id)
      .maybeSingle(),
  ]);
  return {
    request: toRequest(data as Row),
    guardianEmail: (guardian?.email as string) ?? null,
    messages: (messages ?? []).map((m) => {
      const r = m as Row;
      const s = one(r.sender);
      return {
        id: Number(r.id),
        senderId: String(r.sender_id),
        sender: (s?.username as string) ?? null,
        senderRole: (s?.role as string) ?? null,
        body: String(r.body),
        createdAt: String(r.created_at),
      } satisfies TutorMessage;
    }),
  };
}

/** What a tutor or moderator sees on the tutor desk. RLS limits each list to what they're allowed to see. */
export async function loadDesk(userId: string, moderator: boolean) {
  const sb = await getSupabase();
  if (!sb)
    return {
      open: [],
      mine: [],
      guardians: [] as { request: TutorRequest; email: string | null }[],
    };
  const [open, mine, pending] = await Promise.all([
    sb
      .from("tutor_requests")
      .select(COLS)
      .eq("status", "open")
      .order("match_by", { ascending: true })
      .limit(100),
    sb
      .from("tutor_requests")
      .select(COLS)
      .eq("tutor_id", userId)
      .in("status", ["matched", "completed"])
      .order("last_message_at", { ascending: false })
      .limit(100),
    moderator
      ? sb
          .from("tutor_requests")
          .select(COLS)
          .eq("status", "open")
          .eq("needs_guardian", true)
          .eq("guardian_ok", false)
          .order("created_at", { ascending: true })
          .limit(100)
      : Promise.resolve({ data: [] as Row[] }),
  ]);
  const pendingRows = (pending.data ?? []).map((r) => toRequest(r as Row));
  let emails = new Map<number, string>();
  if (pendingRows.length) {
    const { data } = await sb
      .from("request_guardians")
      .select("request_id, email")
      .in(
        "request_id",
        pendingRows.map((r) => r.id),
      );
    emails = new Map(
      (data ?? []).map((g) => [Number(g.request_id), String(g.email)]),
    );
  }
  return {
    open: (open.data ?? []).map((r) => toRequest(r as Row)),
    mine: (mine.data ?? []).map((r) => toRequest(r as Row)),
    guardians: pendingRows.map((request) => ({
      request,
      email: emails.get(request.id) ?? null,
    })),
  };
}
