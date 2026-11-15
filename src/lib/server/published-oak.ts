import "server-only";
import type { LessonRecall } from "@/lib/education/lesson-adaptation";
import type {
  OakFilters,
  OakLesson,
  OakLessonSummary,
} from "@/lib/education/school-stages";

const origin = "https://www.illumed.co.uk";
const slugPattern = /^[a-z0-9-]{1,250}$/;

async function publicRead(path: string, params?: URLSearchParams) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ILLUMINATED_PREVIEW !== "1"
  )
    return null;
  const url = new URL(path, origin);
  if (params) url.search = params.toString();
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(6_000),
      next: { revalidate: 300 },
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("application/json")
    )
      return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function summary(value: unknown): value is OakLessonSummary {
  if (!value || typeof value !== "object") return false;
  const lesson = value as OakLessonSummary;
  if (
    typeof lesson.slug !== "string" ||
    !slugPattern.test(lesson.slug) ||
    typeof lesson.restricted !== "boolean"
  )
    return false;
  if (
    ![
      lesson.title,
      lesson.unit_slug,
      lesson.unit_title,
      lesson.subject,
      lesson.subject_title,
      lesson.key_stage,
      lesson.phase,
    ].every((item) => typeof item === "string" && item.length <= 1000)
  )
    return false;
  if (
    !Array.isArray(lesson.years) ||
    !lesson.years.every((y) => Number.isInteger(y) && y >= 1 && y <= 11)
  )
    return false;
  try {
    const url = new URL(lesson.source_url);
    return (
      url.protocol === "https:" &&
      ["www.thenational.academy", "thenational.academy"].includes(
        url.hostname,
      ) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export async function publishedOakLibrary(filters: OakFilters) {
  const params = new URLSearchParams({ page: String(filters.page) });
  for (const [key, value] of Object.entries({
    stage: filters.stage,
    keyStage: filters.keyStage,
    year: filters.year,
    subject: filters.subject,
    q: filters.q,
  })) {
    if (value) params.set(key, String(value));
  }
  const data = await publicRead("/api/education/oak", params);
  if (
    data?.available !== true ||
    !Array.isArray(data.lessons) ||
    typeof data.total !== "number" ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0
  )
    return { lessons: [], total: 0, available: false };
  const lessons = data.lessons
    .slice(0, 24)
    .filter(summary)
    .filter(
      (lesson) =>
        (!filters.year || lesson.years.includes(filters.year)) &&
        (!filters.keyStage || lesson.key_stage === filters.keyStage) &&
        (!filters.subject || lesson.subject === filters.subject) &&
        (filters.stage === "all" || lesson.phase === filters.stage),
    );
  return { lessons, total: data.total, available: true };
}

export async function publishedOakLesson(
  slug: string,
): Promise<OakLesson | null> {
  if (!slugPattern.test(slug)) return null;
  const data = await publicRead(`/api/education/oak/${slug}`);
  const lesson = data?.lesson;
  if (!summary(lesson) || lesson.slug !== slug) return null;
  const content = (lesson as OakLesson).content;
  if (lesson.restricted) return { ...lesson, content: {} };
  if (!content || typeof content !== "object" || Array.isArray(content))
    return null;
  return { ...lesson, content };
}

export async function publishedOakPractice(
  slug: string,
): Promise<LessonRecall[]> {
  if (!slugPattern.test(slug)) return [];
  const data = await publicRead(
    `/api/education/oak/${slug}`,
    new URLSearchParams({ format: "qa" }),
  );
  const lesson = data?.lesson as
    { slug?: string; restricted?: boolean } | undefined;
  if (
    lesson?.slug !== slug ||
    lesson.restricted !== false ||
    !Array.isArray(data?.questions)
  )
    return [];
  return data.questions
    .filter(
      (item): item is LessonRecall =>
        item &&
        ["keyword", "cloze", "misconception"].includes(item.kind) &&
        [item.id, item.question, item.answer, item.explanation].every(
          (value) => typeof value === "string" && value.length <= 3000,
        ),
    )
    .slice(0, 40);
}
