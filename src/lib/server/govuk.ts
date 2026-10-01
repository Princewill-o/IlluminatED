import "server-only";

import { fetchUpstreamJson } from "@/lib/server/proxy";

/**
 * GOV.UK site search (https://www.gov.uk/api/search.json), limited to the
 * organisations that publish guidance for learners. Unknown parameters make
 * the API reply 422, so only documented ones are used. Repeating
 * filter_organisations (without []) ORs the organisations together.
 */
export const GOVUK_ORGANISATIONS = [
  "department-for-education",
  "ofqual",
  "student-loans-company",
  "skills-england",
];

export interface GovUkResult {
  title: string;
  description: string;
  url: string;
  updated: string | null;
  format: string;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max) : "";

/** GOV.UK links are usually paths; a few formats link to other https sites. */
function toUrl(link: unknown): string | null {
  if (typeof link !== "string" || !link) return null;
  if (link.startsWith("/") && !link.startsWith("//"))
    return `https://www.gov.uk${link}`;
  try {
    const u = new URL(link);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Cached for 6 hours. Send only search terms: never anything about the learner. */
export async function searchGovUk(
  q: string,
  { count = 10, timeoutMs = 8000 }: { count?: number; timeoutMs?: number } = {},
): Promise<{ results: GovUkResult[]; total: number }> {
  const params = new URLSearchParams({
    q: q.slice(0, 120),
    count: String(Math.min(Math.max(count, 1), 10)),
    fields: "title,description,link,public_timestamp,format",
  });
  for (const org of GOVUK_ORGANISATIONS)
    params.append("filter_organisations", org);
  const json = await fetchUpstreamJson(
    `https://www.gov.uk/api/search.json?${params}`,
    { revalidate: 21600, timeoutMs },
  );
  if (!isObj(json) || !Array.isArray(json.results))
    return { results: [], total: 0 };
  const results = json.results.flatMap((r): GovUkResult[] => {
    if (!isObj(r)) return [];
    const url = toUrl(r.link);
    const title = str(r.title, 200);
    if (!url || !title) return [];
    return [
      {
        title,
        description: str(r.description, 400),
        url,
        updated:
          typeof r.public_timestamp === "string" ? r.public_timestamp : null,
        format: str(r.format, 40).replaceAll("_", " "),
      },
    ];
  });
  return {
    results,
    total: typeof json.total === "number" ? json.total : results.length,
  };
}
