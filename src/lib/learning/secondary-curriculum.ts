import type { SubjectProduct } from "./packs";

import type { OakLessonSummary } from "@/lib/education/school-stages";

export const SECONDARY_YEARS = [7, 8, 9, 10, 11] as const;
export type SecondaryYear = (typeof SECONDARY_YEARS)[number];
export type SecondarySelection = {
  product: SubjectProduct;
  year: SecondaryYear;
  strand: string;
  query: string;
  page: number;
};
export const SECONDARY_STRANDS: Record<
  SubjectProduct,
  readonly { id: string; label: string }[]
> = {
  maths: [{ id: "all", label: "All maths" }],
  english: [
    { id: "all", label: "All English" },
    { id: "language", label: "English Language" },
    { id: "literature", label: "English Literature" },
  ],
  science: [
    { id: "all", label: "All science" },
    { id: "biology", label: "Biology" },
    { id: "chemistry", label: "Chemistry" },
    { id: "physics", label: "Physics" },
    { id: "working-scientifically", label: "Working scientifically" },
  ],
};
export function secondarySelection(
  product: SubjectProduct,
  raw: {
    year?: unknown;
    strand?: unknown;
    query?: unknown;
    page?: unknown;
  } = {},
): SecondarySelection {
  const n =
    typeof raw.year === "number" ||
    (typeof raw.year === "string" && /^\d+$/.test(raw.year))
      ? Number(raw.year)
      : 0;
  const page =
    typeof raw.page === "number" && Number.isFinite(raw.page)
      ? Math.floor(raw.page)
      : 1;
  return {
    product,
    year: SECONDARY_YEARS.includes(n as SecondaryYear)
      ? (n as SecondaryYear)
      : 7,
    strand: SECONDARY_STRANDS[product].some((s) => s.id === raw.strand)
      ? String(raw.strand)
      : "all",
    query: typeof raw.query === "string" ? raw.query.trim().slice(0, 100) : "",
    page: Math.max(1, Math.min(500, page)),
  };
}
const strandSearch: Record<string, string> = {
  language:
    "writing OR grammar OR punctuation OR inference OR rhetoric OR non-fiction",
  literature:
    "poetry OR Shakespeare OR Macbeth OR novel OR fiction OR character OR theme",
  biology:
    "cell OR organism OR reproduction OR photosynthesis OR respiration OR ecosystem",
  chemistry: "particle OR atom OR element OR reaction OR acid OR material",
  physics: "force OR energy OR current OR circuit OR wave OR pressure",
  "working-scientifically":
    "investigation OR practical OR variables OR experiment OR data OR measurement",
};
export type SecondaryRequest = { url: string; subject: string; label: string };
export function secondaryRequests(
  selection: SecondarySelection,
): SecondaryRequest[] {
  const { product, year, strand } = selection;
  const ks4 = year >= 10;
  const subject =
    product === "science"
      ? ks4
        ? ["biology", "chemistry", "physics"].includes(strand)
          ? strand
          : "combined-science"
        : "science"
      : product === "english"
        ? "english"
        : "maths";
  const useTopicSearch =
    product === "english" ||
    (product === "science" && (!ks4 || strand === "working-scientifically"));
  const query =
    selection.query ||
    (useTopicSearch && strand !== "all" ? (strandSearch[strand] ?? "") : "");
  const url = new URL("https://illumed.co.uk/api/education/oak");
  for (const [key, value] of Object.entries({
    stage: "secondary",
    keyStage: ks4 ? "ks4" : "ks3",
    year: String(year),
    subject,
    page: String(selection.page),
    q: query,
  }))
    if (value) url.searchParams.set(key, value);
  return [
    {
      url: url.pathname + url.search,
      subject,
      label:
        product === "science" &&
        ks4 &&
        ["all", "working-scientifically"].includes(strand)
          ? "Combined Science"
          : (SECONDARY_STRANDS[product].find((s) => s.id === strand)?.label ??
            product),
    },
  ];
}
export function isSecondaryLesson(
  value: unknown,
  selection: SecondarySelection,
  request: SecondaryRequest,
): value is OakLessonSummary {
  if (!value || typeof value !== "object") return false;
  const l = value as Record<string, unknown>;
  if (
    typeof l.slug !== "string" ||
    !/^[a-z0-9-]{1,250}$/.test(l.slug) ||
    typeof l.title !== "string" ||
    !l.title.trim() ||
    l.title.length > 1000
  )
    return false;
  if (
    l.phase !== "secondary" ||
    l.subject !== request.subject ||
    l.key_stage !== (selection.year >= 10 ? "ks4" : "ks3")
  )
    return false;
  if (!Array.isArray(l.years) || !l.years.includes(selection.year))
    return false;
  if (
    typeof l.unit_title !== "string" ||
    typeof l.unit_slug !== "string" ||
    typeof l.subject_title !== "string" ||
    typeof l.restricted !== "boolean" ||
    typeof l.source_url !== "string"
  )
    return false;
  try {
    const u = new URL(l.source_url);
    return (
      u.protocol === "https:" &&
      ["www.thenational.academy", "thenational.academy"].includes(u.hostname) &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}
export function secondaryPage(
  value: unknown,
  selection: SecondarySelection,
  request: SecondaryRequest,
) {
  if (!value || typeof value !== "object")
    throw new Error("The lesson library returned an unreadable response.");
  const v = value as Record<string, unknown>;
  if (
    v.available !== true ||
    !Array.isArray(v.lessons) ||
    typeof v.total !== "number" ||
    !Number.isInteger(v.total) ||
    v.total < 0 ||
    v.total > 1000000
  )
    throw new Error("The lesson library is temporarily unavailable.");
  const lessons = v.lessons.filter((l) =>
    isSecondaryLesson(l, selection, request),
  );
  const unique = [...new Map(lessons.map((l) => [l.slug, l])).values()];
  const pageSize =
    typeof v.pageSize === "number" &&
    Number.isInteger(v.pageSize) &&
    v.pageSize > 0 &&
    v.pageSize <= 100
      ? v.pageSize
      : 24;
  return {
    lessons: unique,
    total: v.total,
    omitted: v.lessons.length - unique.length,
    hasNext: selection.page * pageSize < v.total,
  };
}
