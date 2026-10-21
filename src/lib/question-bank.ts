import "server-only";

import { getSupabase } from "@/lib/social/server";

/**
 * The Illumed GCSE and A-level question bank in Supabase (public.bank_questions,
 * loaded from data/question-bank). Every item carries its source, licence and
 * review status. Until a subject expert approves an item (publish_ready), the app
 * shows it as a draft.
 */
export interface BankItem {
  id: string;
  level: "GCSE" | "A-level";
  subject: string;
  topic: string;
  question_type: "short_answer" | "calculation" | "evaluation" | "constructed_response" | "multiple_choice";
  question: string;
  answer: string;
  explanation: string;
  marks: number;
  difficulty: string;
  source: string;
  licence: string;
  review_status: string;
  publish_ready: boolean;
}

/** What learners receive before answering: never the answer itself. */
export type PublicItem = Omit<BankItem, "answer" | "explanation"> & { selfMarked: boolean };

export const AUTO_MARKED = ["short_answer", "calculation", "multiple_choice"] as const;

export const toPublic = (q: BankItem): PublicItem => {
  const { answer: _a, explanation: _e, ...rest } = q;
  void _a;
  void _e;
  return { ...rest, selfMarked: !AUTO_MARKED.includes(q.question_type as (typeof AUTO_MARKED)[number]) };
};

export async function bankTopics() {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("bank_topics").select("level, subject, topic, questions, reviewed").order("subject").order("topic");
  if (error) return null;
  return data as { level: string; subject: string; topic: string; questions: number; reviewed: number }[];
}

export async function bankSample(opts: { level?: string | null; subject?: string | null; topic?: string | null; limit?: number; includeOpen?: boolean; reviewedOnly?: boolean }) {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("bank_sample", {
    p_level: opts.level ?? null,
    p_subject: opts.subject ?? null,
    p_topic: opts.topic ?? null,
    p_types: opts.includeOpen ? ["short_answer", "calculation", "multiple_choice", "evaluation", "constructed_response"] : [...AUTO_MARKED],
    p_limit: Math.min(Math.max(opts.limit ?? 10, 1), 50),
    p_reviewed_only: Boolean(opts.reviewedOnly),
  });
  if (error) return null;
  return data as BankItem[];
}

export async function bankItem(id: string) {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("bank_questions").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return data as BankItem | null;
}

export { markAnswer, normalise } from "@/lib/question-marking";
