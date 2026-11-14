"use server";

import { findSubjectPack, type SubjectProduct } from "./packs";

import { getSupabase } from "@/lib/social/server";

export type SubjectAttempt = {
  id: string; product: SubjectProduct; topic_slug: string; mode: "practice" | "race";
  started_at: string; submitted_at: string | null; score: number | null;
  max_score: number; elapsed_seconds: number | null; race_points: number | null;
  written_response: string | null; draft_answers: number[]; question_indices: number[]; assignment_id: string | null;
};
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function message(error: string) {
  if (error.includes("writing_required")) return "Add your written response before submitting this English assignment.";
  if (error.includes("assignment_mismatch")) return "This assignment does not match this topic, or you are not a member of its class.";
  if (error.includes("not_allowed")) return "Finish setting up your learner profile to save progress. Open account setup, then return here.";
  if (error.includes("expired")) return "This practice session expired. Start a fresh attempt.";
  if (error.includes("rate_limit")) return "You have started many attempts. Take a short break and try again.";
  return "Your work could not sync. Your browser draft is still available; retry when connected.";
}
export async function loadSubjectProgress(product: SubjectProduct): Promise<{signedIn:boolean;userId?:string;attempts:SubjectAttempt[];error?:string}> {
  const sb = await getSupabase();
  if (!sb) return { signedIn: false, attempts: [] as SubjectAttempt[] };
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { signedIn: false, attempts: [] as SubjectAttempt[] };
  const { data, error } = await sb.from("learning_subject_attempts").select("id,product,topic_slug,mode,started_at,submitted_at,score,max_score,elapsed_seconds,race_points,written_response,draft_answers,question_indices,assignment_id").eq("user_id", auth.user.id).eq("product", product).order("started_at", { ascending: false }).limit(60);
  return { signedIn: true, userId: auth.user.id, attempts: (data ?? []) as SubjectAttempt[], ...(error ? { error: message(error.message) } : {}) };
}
export async function startSubjectAttempt(product: SubjectProduct, slug: string, mode: "practice" | "race", assignment: string | null) {
  if (!findSubjectPack(product, slug) || (mode !== "practice" && mode !== "race") || (mode === "race" && product !== "maths") || (assignment !== null && !uuid(assignment))) return { ok: false as const, error: "That topic or assignment is not valid." };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, guest: true as const };
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { ok: false as const, guest: true as const };
  const { data, error } = await sb.rpc("learning_subject_start", { p_product: product, p_slug: slug, p_mode: mode, p_assignment: assignment });
  return error ? { ok: false as const, error: message(error.message) } : { ok: true as const, attempt: data as SubjectAttempt };
}
export async function saveSubjectDraft(session: string, answers: number[], written: string) {
  if (!uuid(session) || !Array.isArray(answers) || answers.length > 12 || answers.some((a) => !Number.isInteger(a) || a < -1 || a > 7) || typeof written !== "string" || written.length > 12000) return { ok: false as const, error: "That draft is not valid." };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: "Sign in to sync this draft." };
  const { error } = await sb.rpc("learning_subject_draft", { p_session: session, p_answers: answers, p_written: written });
  return error ? { ok: false as const, error: message(error.message) } : { ok: true as const };
}
export async function submitSubjectAttempt(session: string, answers: number[], written: string) {
  if (!uuid(session) || !Array.isArray(answers) || answers.length < 1 || answers.length > 12 || answers.some((a) => !Number.isInteger(a) || a < 0 || a > 7) || typeof written !== "string" || written.length > 12000) return { ok: false as const, error: "Answer every question before submitting." };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: "Sign in to save your result." };
  const { data, error } = await sb.rpc("learning_subject_submit", { p_session: session, p_answers: answers, p_written: written });
  return error ? { ok: false as const, error: message(error.message) } : { ok: true as const, attempt: data as SubjectAttempt };
}
