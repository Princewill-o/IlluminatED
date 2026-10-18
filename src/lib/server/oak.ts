import "server-only";
import { normaliseOakSummary } from "@/lib/education/oak-grounding";
import { normaliseOakQuiz } from "@/lib/oak-quiz";
import { fetchUpstreamJson } from "@/lib/server/proxy";
export const oakEnabled = Boolean(process.env.OAK_API_KEY?.trim());
export async function getOakSummary(slug: string) {
  if (!oakEnabled || !/^[a-z0-9-]{1,180}$/.test(slug)) return null;
  const data = await fetchUpstreamJson(
    `https://open-api.thenational.academy/api/v1/lessons/${encodeURIComponent(slug)}/summary`,
    {
      headers: { Authorization: `Bearer ${process.env.OAK_API_KEY!.trim()}` },
      revalidate: 86400,
      timeoutMs: 4000,
      redirect: "error",
    },
  );
  return {
    ...normaliseOakSummary(data, slug),
    fetchedAt: new Date().toISOString(),
  };
}
export async function getOakQuiz(slug: string) {
  if (!oakEnabled) return null;
  const data = await fetchUpstreamJson(
    `https://open-api.thenational.academy/api/v1/lessons/${encodeURIComponent(slug)}/quiz`,
    {
      headers: { Authorization: `Bearer ${process.env.OAK_API_KEY!.trim()}` },
      revalidate: 86400,
      redirect: "error",
    },
  );
  return {
    ...normaliseOakQuiz(data),
    checkedAt: new Date().toISOString(),
    attribution:
      "Lesson quiz by Oak National Academy, licensed under the Open Government Licence v3.0, except where otherwise stated.",
    sourceUrl: `https://www.thenational.academy/teachers/lessons/${encodeURIComponent(slug)}`,
  };
}
