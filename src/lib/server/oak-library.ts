import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { LessonRecall } from "@/lib/education/lesson-adaptation";
import type { OakFilters, OakLesson, OakLessonSummary } from "@/lib/education/school-stages";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/social/config";

function client() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000), next: { revalidate: 300 } }) } });
}
export async function oakLibrary(filters: OakFilters) {
  const sb = client();
  if (!sb) return { lessons: [] as OakLessonSummary[], total: 0, available: false };
  let query = sb.from("oak_lessons").select("slug,title,unit_slug,unit_title,subject,subject_title,key_stage,phase,years,restricted,source_url", { count: "exact" });
  if (filters.stage === "sixth-form") return { lessons: [] as OakLessonSummary[], total: 0, available: true };
  if (filters.stage === "primary" || filters.stage === "secondary") query = query.eq("phase", filters.stage);
  if (filters.keyStage) query = query.eq("key_stage", filters.keyStage);
  if (filters.subject) query = query.eq("subject", filters.subject);
  if (filters.year) query = query.contains("years", [filters.year]);
  if (filters.q) query = query.textSearch("title", filters.q, { type: "websearch", config: "english" });
  const start = (filters.page - 1) * 24;
  try {
    const { data, error, count } = await query.order("title").order("slug").range(start,start+23);
    return { lessons: (data ?? []) as OakLessonSummary[], total: count ?? 0, available: !error };
  } catch { return { lessons: [] as OakLessonSummary[], total: 0, available: false }; }
}
export async function oakLesson(slug: string): Promise<OakLesson | null> {
  if (!/^[a-z0-9-]{1,250}$/.test(slug)) return null;
  try {
    const sb = client();
    if (!sb) return null;
    const { data, error } = await sb.from("oak_lessons").select("*").eq("slug",slug).maybeSingle();
    return error ? null : data as OakLesson | null;
  } catch { return null; }
}
export async function oakSummary(): Promise<{ subject: string; title: string; lessons: number }[]> {
  try {
    const { data, error } = await client()?.rpc("oak_library_subjects") ?? {};
    return error ? [] : data ?? [];
  } catch { return []; }
}
export async function lessonPractice(slug: string): Promise<LessonRecall[]> {
  if(!/^[a-z0-9-]{1,250}$/.test(slug))return [];
  try {
    const { data,error }=await client()?.from("illumed_lesson_questions").select("id,kind,question,answer,explanation").eq("lesson_slug",slug).order("kind").order("id")??{};
    return error?[]:data??[];
  } catch {return [];}
}
