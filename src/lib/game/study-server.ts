import "server-only";

import { getSupabase } from "@/lib/social/server";

export interface StudyState {
  ready: boolean;
  sessions: number;
  correct: number;
  total: number;
  courses: string[];
  lastStudiedAt: string | null;
}

export async function loadStudy(userId: string): Promise<StudyState> {
  const empty: StudyState = { ready: false, sessions: 0, correct: 0, total: 0, courses: [], lastStudiedAt: null };
  const sb = await getSupabase();
  if (!sb) return empty;
  const { data, error } = await sb.from("study_progress")
    .select("sessions, correct, total, courses, last_studied_at")
    .eq("user_id", userId).maybeSingle();
  if (error) return empty;
  return {
    ready: true,
    sessions: data?.sessions ?? 0,
    correct: data?.correct ?? 0,
    total: data?.total ?? 0,
    courses: data?.courses ?? [],
    lastStudiedAt: data?.last_studied_at ?? null,
  };
}
