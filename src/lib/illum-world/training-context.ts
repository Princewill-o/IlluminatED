const occupations = {
  data: "d3edb8f8-3a06-47a0-8fb9-9b212c006aa2",
  business: "60082a99-d8ef-4e84-9290-78902681b6ed",
  security: "7754d570-9519-48c2-b1c9-8e165f8bca0f",
  finance: "8d586ee9-0ab1-4155-a3b0-2ca786c8e48c",
  architect: "e1c72b5f-4c5c-487c-a6df-e84b64a51dae",
  ai: "35553663-deab-4d9a-bf22-15c1625d28e8",
  software: "f2b15a0e-e65a-438a-affb-29b9d50b77d1",
  risk: "b3ce981c-5b32-4de2-8e53-502a6357b2bc",
} as const;

const boards = {
  stripe: { name: "Stripe", domain: "stripe.com", path: "/jobs/search" },
  gitlab: { name: "GitLab", domain: null, path: null },
  mongodb: { name: "MongoDB", domain: "www.mongodb.com", path: "/careers/job/" },
} as const;

type Board = keyof typeof boards;
type Occupation = keyof typeof occupations;
const references = {
  data: ["stripe", /data analyst|data scientist|analytics engineer/i],
  business: ["stripe", /business analy|business operations|strategy and operations/i],
  security: ["stripe", /security analyst|security engineer|incident response/i],
  finance: ["stripe", /financial analy|quantitative|credit risk analyst/i],
  architect: ["mongodb", /solutions architect|cloud architect/i],
  ai: ["gitlab", /machine learning|ai engineer|data scientist/i],
  software: ["gitlab", /software engineer|backend engineer|frontend engineer/i],
  risk: ["stripe", /risk analyst|fraud analyst|fraud strategist/i],
} satisfies Record<Occupation, [Board, RegExp]>;

const roleOccupations: ReadonlyMap<string, Occupation> = new Map([
  ["data-analyst", "data"],
  ["business-analyst", "business"],
  ["cybersecurity-analyst", "security"],
  ["quantitative-researcher", "finance"],
  ["accenture-data-analyst", "data"],
  ["aws-solutions-architect", "architect"],
  ["deloitte-data-analyst", "data"],
  ["ai-engineer", "ai"],
  ["software-engineer", "software"],
  ["risk-analyst", "risk"],
  ["ibm-cybersecurity-analyst", "security"],
  ["walmart-software-engineer", "software"],
  ["tata-data-analyst", "data"],
]);

export function lookupTrainingContext(roleId: string) {
  const role = roleOccupations.get(roleId);
  if (!role) return null;
  const [board, matches] = references[role];
  return {
    occupation: `http://data.europa.eu/esco/occupation/${occupations[role]}`,
    board,
    boardName: boards[board].name,
    matches,
  };
}

export function escoOccupationUrl(uri: string) {
  const url = new URL("https://ec.europa.eu/esco/api/resource/occupation");
  url.searchParams.set("uri", uri);
  url.searchParams.set("language", "en");
  url.searchParams.set("selectedVersion", "v1.2.0");
  return url;
}

const record = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

function plain(value: unknown, maximum = 120) {
  if (typeof value !== "string" || /[<>\u0000-\u001f]/.test(value)) return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maximum);
}

export type OccupationContext = { title: string; skills: string[] };
export type VacancyExample = { id: number; title: string; location: string; url: string };
export type TrainingContextData = {
  occupation: OccupationContext | null;
  board: string;
  vacancies: VacancyExample[];
};

export function parseEscoOccupation(value: unknown, uri: string): OccupationContext | null {
  const occupation = record(value);
  if (occupation?.uri !== uri) return null;
  const title = plain(occupation.title);
  if (!title) return null;
  const linked = record(occupation._links)?.hasEssentialSkill;
  const skills = Array.isArray(linked) ? linked.map(skill => plain(record(skill)?.title)).filter(Boolean) : [];
  return { title, skills: [...new Set(skills)].slice(0, 6) };
}

function vacancyUrl(value: unknown, board: Board, id: number) {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
    const validBoard =
      ["job-boards.greenhouse.io", "boards.greenhouse.io"].includes(url.hostname) &&
      url.pathname === `/${board}/jobs/${id}`;
    const employer = boards[board];
    const validEmployer = url.hostname === employer.domain && url.pathname === employer.path &&
      url.searchParams.get("gh_jid") === String(id);
    return validBoard || validEmployer ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseBoardVacancies(
  value: unknown,
  config: NonNullable<ReturnType<typeof lookupTrainingContext>>,
): VacancyExample[] {
  const list = record(value)?.jobs;
  if (!Array.isArray(list)) return [];
  const matches: VacancyExample[] = [];
  const seen = new Set<number>();
  for (const raw of list) {
    const job = record(raw);
    if (!job || typeof job.id !== "number" || !Number.isSafeInteger(job.id) || job.id < 1 || seen.has(job.id)) continue;
    const title = plain(job.title);
    if (!title || !config.matches.test(title)) continue;
    const url = vacancyUrl(job.absolute_url, config.board, job.id);
    if (!url) continue;
    seen.add(job.id);
    matches.push({ id: job.id, title, location: plain(record(job.location)?.name, 100), url });
  }
  return matches.sort((a, b) => Number(/United Kingdom|London/i.test(b.location)) - Number(/United Kingdom|London/i.test(a.location))).slice(0, 3);
}
