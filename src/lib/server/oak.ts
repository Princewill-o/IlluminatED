import "server-only";
import { normaliseOakQuiz } from "@/lib/oak-quiz";
import { fetchUpstreamJson } from "@/lib/server/proxy";
export const oakEnabled = Boolean(process.env.OAK_API_KEY?.trim());
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
  return { ...normaliseOakQuiz(data), checkedAt: new Date().toISOString() };
}
