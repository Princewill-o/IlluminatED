"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getSupabase } from "@/lib/social/server";

interface Session {
  id: string;
  courseId: string;
  questions: { key: string; prompt: string; options: string[] }[];
}

interface Result {
  correct: number;
  total: number;
  xp: number;
  clout: number;
  answers: { answer: number; explain: string }[];
}

const ERRORS: Record<string, string> = {
  not_allowed: "Sign in with an active IlluminatED account to save a study session.",
  unknown_course: "That subject isn't available in the study room yet. Choose another subject.",
  rate_limited: "You've started a lot of sessions. Take a short break and try again later.",
  session_unavailable: "This study session has expired or isn't yours. Start a new session.",
  invalid_answers: "Answer all five questions before handing in your session.",
};

const friendly = (message?: string) =>
  ERRORS[Object.keys(ERRORS).find((key) => message?.includes(key)) ?? ""] ??
  "We couldn't save your study session. Your answers are still here; please try again.";

export async function startStudy(courseId: string) {
  if (!z.string().regex(/^[a-z0-9-]{2,80}$/).safeParse(courseId).success)
    return { ok: false as const, error: ERRORS.unknown_course };
  try {
    const sb = await getSupabase();
    if (!sb) return { ok: false as const, error: ERRORS.not_allowed };
    const { data, error } = await sb.rpc("study_start_session", { p_course: courseId });
    if (error || !data) return { ok: false as const, error: friendly(error?.message) };
    return { ok: true as const, session: data as Session };
  } catch {
    return { ok: false as const, error: "We couldn't open the study room. Please try again." };
  }
}

export async function submitStudy(sessionId: string, answers: number[]) {
  if (!z.object({ id: z.uuid(), answers: z.array(z.number().int().min(0).max(7)).length(5) })
    .safeParse({ id: sessionId, answers }).success)
    return { ok: false as const, error: ERRORS.invalid_answers };
  try {
    const sb = await getSupabase();
    if (!sb) return { ok: false as const, error: ERRORS.not_allowed };
    const { data, error } = await sb.rpc("study_submit_session", { p_session: sessionId, p_answers: answers });
    if (error || !data) return { ok: false as const, error: friendly(error?.message) };
    for (const path of ["/learn", "/games/study", "/games/world", "/me"]) revalidatePath(path);
    return { ok: true as const, result: data as Result };
  } catch {
    return { ok: false as const, error: friendly() };
  }
}
