import "server-only";

import { unstable_cache } from "next/cache";

import {
  STANDARD_REF,
  type StandardDetail,
  type StandardSearch,
  type StandardSummary,
} from "@/lib/apprenticeships";
import { UpstreamError, fetchUpstreamJson } from "@/lib/server/proxy";

/**
 * Skills England apprenticeship standards (OGL v3.0, no key).
 *
 * There's no documented search or summary endpoint: query parameters on the
 * list are ignored and it always returns every standard (about 50 MB). That is
 * far over the Next.js data cache's 2 MB per-item limit, so the list is
 * fetched with no-store, cut down to a slim index (well under 1 MB), and the
 * slim index is cached twice: in this server instance's memory for a day, and
 * in the data cache (unstable_cache) so other instances skip the 50 MB
 * download. A cold instance with an empty data cache pays for one download.
 */
const BASE =
  "https://skillsengland.education.gov.uk/api/apprenticeshipstandards";
const DAY = 86400;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 300) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v)
    ? v
    : typeof v === "string" && v.trim() && Number.isFinite(Number(v))
      ? Number(v)
      : null;
const strList = (v: unknown, n: number, max = 120) =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string" && x.trim() !== "")
        .slice(0, n)
        .map((x) => x.trim().slice(0, max))
    : [];

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  pound: "£",
};
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code =
        e[1] === "x" || e[1] === "X"
          ? parseInt(e.slice(2), 16)
          : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });

/** Some fields hold HTML (sometimes entity-escaped). We only ever show plain text. */
export function plainText(v: unknown, max = 2000): string {
  if (typeof v !== "string") return "";
  const text = decode(decode(v))
    .replace(/<\s*(br|\/p|\/li|\/div|\/h\d)\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function toSummary(s: Obj): StandardSummary | null {
  const ref = str(s.referenceNumber, 10).toUpperCase();
  if (!STANDARD_REF.test(ref)) return null;
  const status = str(s.status, 60);
  return {
    ref,
    title: str(s.title, 200) || ref,
    level: num(s.level),
    route: str(s.route, 80),
    duration: num(s.typicalDuration),
    maxFunding: num(s.maxFunding),
    status,
    open:
      status.toLowerCase() === "approved for delivery" &&
      s.approvedForDeliveryPausedStarts !== true,
    jobTitles: strList(
      Array.isArray(s.typicalJobTitles) && s.typicalJobTitles.length
        ? s.typicalJobTitles
        : s.jobRoles,
      5,
    ),
  };
}

const versionOf = (s: Obj) => {
  const v = parseFloat(str(s.version ?? s.versionNumber, 10));
  return Number.isFinite(v) ? v : 0;
};

async function downloadIndex(): Promise<StandardSummary[]> {
  const json = await fetchUpstreamJson(BASE, {
    noStore: true,
    timeoutMs: 45000,
  });
  if (!Array.isArray(json)) throw new UpstreamError(502, "Not a list");
  // Keep one entry per reference: the highest version.
  const best = new Map<string, { v: number; s: StandardSummary }>();
  for (const raw of json) {
    if (!isObj(raw)) continue;
    const s = toSummary(raw);
    if (!s) continue;
    const v = versionOf(raw);
    const prev = best.get(s.ref);
    if (!prev || v > prev.v) best.set(s.ref, { v, s });
  }
  return [...best.values()]
    .map((b) => b.s)
    .sort((a, b) => a.title.localeCompare(b.title, "en-GB"));
}

const cachedIndex = unstable_cache(downloadIndex, ["skills-england-index-v1"], {
  revalidate: DAY,
  tags: ["skills-england"],
});

let memory: { at: number; data: StandardSummary[] } | null = null;
let inflight: Promise<StandardSummary[]> | null = null;

export async function getStandardsIndex(): Promise<StandardSummary[]> {
  if (memory && Date.now() - memory.at < DAY * 1000) return memory.data;
  inflight ??= cachedIndex()
    .then((data) => {
      if (data.length) memory = { at: Date.now(), data };
      return data;
    })
    .catch((e: unknown) => {
      // Serve yesterday's index rather than nothing.
      if (memory) return memory.data;
      throw e;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function searchStandards({
  q,
  level,
  route,
  includeClosed,
  limit = 48,
}: {
  q: string;
  level: number | null;
  route: string;
  includeClosed: boolean;
  limit?: number;
}): Promise<StandardSearch> {
  const index = await getStandardsIndex();
  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .slice(0, 6);
  const scored: { s: StandardSummary; score: number }[] = [];
  for (const s of index) {
    if (!includeClosed && !s.open) continue;
    if (level !== null && s.level !== level) continue;
    if (route && s.route !== route) continue;
    if (!terms.length) {
      scored.push({ s, score: 0 });
      continue;
    }
    const title = s.title.toLowerCase();
    const jobs = s.jobTitles.join(" ").toLowerCase();
    let score = 0;
    let all = true;
    for (const t of terms) {
      if (s.ref.toLowerCase() === t) score += 10;
      else if (title.includes(t)) score += 3;
      else if (jobs.includes(t) || s.route.toLowerCase().includes(t))
        score += 1;
      else {
        all = false;
        break;
      }
    }
    if (all) scored.push({ s, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const visible = includeClosed ? index : index.filter((s) => s.open);
  return {
    results: scored.slice(0, limit).map((x) => x.s),
    total: scored.length,
    routes: [...new Set(visible.map((s) => s.route).filter(Boolean))].sort(),
    levels: [
      ...new Set(
        visible.map((s) => s.level).filter((l): l is number => l !== null),
      ),
    ].sort((a, b) => a - b),
  };
}

const details = (v: unknown, key: string, n: number) =>
  Array.isArray(v)
    ? v
        .map((x) => (isObj(x) ? plainText(x[key], 400) : ""))
        .filter(Boolean)
        .slice(0, n)
    : [];

const safePage = (v: unknown, ref: string) => {
  try {
    const u = new URL(String(v));
    if (u.protocol === "https:" && u.host.endsWith(".education.gov.uk"))
      return u.toString();
  } catch {}
  return `https://skillsengland.education.gov.uk/apprenticeship-standards/${ref.toLowerCase()}`;
};

/** One standard (tens of KB, so the data cache can hold it). Null if Skills England doesn't know the reference. */
export async function getStandard(ref: string): Promise<StandardDetail | null> {
  const id = ref.toUpperCase();
  if (!STANDARD_REF.test(id)) return null;
  let json: unknown;
  try {
    json = await fetchUpstreamJson(`${BASE}/${id}`, {
      revalidate: DAY,
      timeoutMs: 10000,
    });
  } catch (e) {
    if (e instanceof UpstreamError && (e.status === 404 || e.status === 400))
      return null;
    throw e;
  }
  if (!isObj(json)) return null;
  const base = toSummary(json);
  if (!base) return null;
  const duties = Array.isArray(json.duties) ? json.duties.filter(isObj) : [];
  // Core duties first.
  duties.sort(
    (a, b) => Number(b.isThisACoreDuty === 1) - Number(a.isThisACoreDuty === 1),
  );
  const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  return {
    ...base,
    jobTitles: strList(
      Array.isArray(json.typicalJobTitles) && json.typicalJobTitles.length
        ? json.typicalJobTitles
        : json.jobRoles,
      10,
    ),
    version: str(json.version ?? json.versionNumber, 10),
    overview: plainText(json.overviewOfRole, 600),
    summary: plainText(json.occupationalSummary, 1500),
    entryRequirements: plainText(json.entryRequirements, 1200),
    englishAndMaths: plainText(json.englishAndMathsQualifications, 800),
    duties: details(duties, "dutyDetail", 5),
    knowledge: details(json.knowledges, "detail", 5),
    skills: details(json.skills, "detail", 5),
    behaviours: details(json.behaviours, "detail", 5),
    counts: {
      duties: len(json.duties),
      knowledge: len(json.knowledges),
      skills: len(json.skills),
      behaviours: len(json.behaviours),
    },
    pageUrl: safePage(json.standardPageUrl, id),
  };
}
