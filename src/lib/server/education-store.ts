import "server-only";
import { unstable_cache } from "next/cache";

import { createClient } from "@supabase/supabase-js";

import { curriculumForCourse, type CourseCurriculum } from "@/lib/education";
import {
  SUPABASE_URL,
  SUPABASE_KEY,
  socialConfigured,
} from "@/lib/social/config";
/** Public catalogue reads use the publishable key. No service key enters the app. */
const client = () =>
  socialConfigured
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
        },
      })
    : null;
const readCatalogue = unstable_cache(
  async (courseId: string): Promise<CourseCurriculum | null> => {
    const sb = client();
    if (!sb) return null;
    const { data, error } = await sb
      .from("education_catalogue")
      .select("content")
      .eq("course_id", courseId)
      .maybeSingle();
    if (
      error ||
      !data ||
      data.content?.course?.id !== courseId ||
      !Array.isArray(data.content.syllabuses) ||
      !Array.isArray(data.content.programmes) ||
      !Array.isArray(data.content.guides)
    )
      return null;
    return data.content as CourseCurriculum;
  },
  ["education-catalogue-v1"],
  { revalidate: 3600 },
);
export async function getCourseCurriculum(courseId: string) {
  const local = curriculumForCourse(courseId);
  if (!local) return null;
  try {
    return (await readCatalogue(courseId)) ?? local;
  } catch {
    return local;
  }
}
export const readStoredOpportunities = unstable_cache(
  async (): Promise<unknown> => {
    const sb = client();
    if (!sb) return null;
    const { data, error } = await sb
      .from("education_source_snapshots")
      .select("content")
      .eq("id", "opportunities")
      .maybeSingle();
    return error ? null : (data?.content ?? null);
  },
  ["education-opportunity-snapshot-v1"],
  { revalidate: 3600 },
);
