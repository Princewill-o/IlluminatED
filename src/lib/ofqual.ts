"use client";

import { fetchJson, isObj, safeUrl, str } from "@/lib/api-client";

export const OFQUAL_BASE = "https://register-api.ofqual.gov.uk";
export const OFQUAL_DOCS = "https://github.com/OfqualGovUK/ofqual-register-api";
export const OFQUAL_REGISTER = "https://register.ofqual.gov.uk/";

export interface Qualification {
  number: string;
  numberNoObliques: string;
  title: string;
  status: string;
  organisation: string;
  acronym: string;
  type: string;
  level: string;
  ssa: string;
  offeredInEngland: boolean | null;
  offeredInNI: boolean | null;
  specUrl: string | null;
  lastUpdated: string;
  operationalEnd: string;
}

export interface QualPage {
  count: number;
  page: number;
  limit: number;
  results: Qualification[];
}

interface RawPage {
  count: number;
  currentPage: number;
  limit: number;
  results: unknown[];
}

const isRawPage = (j: unknown): j is RawPage =>
  isObj(j) && typeof j.count === "number" && Array.isArray(j.results);

const toQual = (r: unknown): Qualification | null => {
  if (!isObj(r) || typeof r.title !== "string") return null;
  return {
    number: str(r.qualificationNumber, 20),
    numberNoObliques: str(r.qualificationNumberNoObliques, 20),
    title: str(r.title, 300),
    status: str(r.status, 60),
    organisation: str(r.organisationName, 160),
    acronym: str(r.organisationAcronym, 40),
    type: str(r.type, 120),
    level: str(r.level, 60),
    ssa: str(r.ssa, 120),
    offeredInEngland:
      typeof r.offeredInEngland === "boolean" ? r.offeredInEngland : null,
    offeredInNI:
      typeof r.offeredInNorthernIreland === "boolean"
        ? r.offeredInNorthernIreland
        : null,
    specUrl: safeUrl(r.linkToSpecification),
    lastUpdated: str(r.lastUpdatedDate, 40),
    operationalEnd: str(r.operationalEndDate, 40),
  };
};

export interface QualQuery {
  title: string;
  qualificationTypes?: string;
  qualificationLevels?: string;
  awardingOrganisations?: string;
  availability?: string;
  page?: number;
  limit?: number;
}

export async function searchQualifications(q: QualQuery, signal?: AbortSignal) {
  const params = new URLSearchParams();
  params.set("title", q.title.trim());
  if (q.qualificationTypes)
    params.set("qualificationTypes", q.qualificationTypes);
  if (q.qualificationLevels)
    params.set("qualificationLevels", q.qualificationLevels);
  if (q.awardingOrganisations)
    params.set("awardingOrganisations", q.awardingOrganisations);
  if (q.availability) params.set("availability", q.availability);
  params.set("page", String(q.page ?? 1));
  params.set("limit", String(Math.min(q.limit ?? 10, 25)));
  const qs = params.toString();
  const res = await fetchJson<RawPage>({
    proxy: `/api/ofqual/qualifications?${qs}`,
    direct: `${OFQUAL_BASE}/api/Qualifications?${qs}`,
    cacheKey: `ofqual:q:${qs}`,
    ttlMs: 1000 * 60 * 60 * 6,
    signal,
    validate: isRawPage,
  });
  const results = res.data.results
    .slice(0, 25)
    .map(toQual)
    .filter(Boolean) as Qualification[];
  return {
    ...res,
    page: {
      count: res.data.count,
      page: res.data.currentPage,
      limit: res.data.limit,
      results,
    } as QualPage,
  };
}

export const QUAL_TYPES = [
  "GCSE (9 to 1)",
  "GCE A Level",
  "GCE AS Level",
  "Technical Qualification",
  "Vocationally-Related Qualification",
  "Functional Skills",
  "Other General Qualification",
  "Occupational Qualification",
  "Project",
];

export const QUAL_LEVELS = [
  "Entry Level",
  "Level 1",
  "Level 1/Level 2",
  "Level 2",
  "Level 3",
];

export const AVAILABILITY = ["Available to learners", "No longer awarded"];
