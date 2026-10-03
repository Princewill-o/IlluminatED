export type OpportunityKind =
  | "university-event"
  | "apprenticeship"
  | "work-experience";
export interface Opportunity {
  id: string;
  title: string;
  provider: string;
  kind: OpportunityKind;
  url: string;
  location: string;
  date: string | null;
  closes: string | null;
  summary: string;
  checkedAt: string;
}
export interface OpportunityFeed {
  items: Opportunity[];
  sources: {
    name: string;
    status: "live" | "cached" | "unavailable" | "not-configured";
    checkedAt: string | null;
    url: string;
  }[];
}
export function safeHttpsUrl(value: unknown, hosts?: string[]): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!hosts || hosts.includes(u.hostname))
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export const londonDate = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
export function isUpcoming(item: Opportunity, now = new Date()) {
  const end = item.closes ?? item.date;
  return !end || end.slice(0, 10) >= londonDate(now);
}
const unescapeIcal = (v: string) =>
  v
    .replace(/\\n/gi, " ")
    .replace(/\\([,;\\])/g, "$1")
    .trim();
/** We index event dates, not ambiguous local times. No executable HTML is retained. */
export function parseUniversityCalendar(
  text: string,
  checkedAt: string,
): Opportunity[] {
  if (!text.startsWith("BEGIN:VCALENDAR")) throw new Error("Invalid calendar");
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const items: Opportunity[] = [];
  for (const chunk of unfolded.split("BEGIN:VEVENT").slice(1, 201)) {
    const get = (name: string) =>
      unescapeIcal(
        chunk.match(
          new RegExp(`(?:^|\\n)${name}(?:;[^:\\n]*)?:([^\\r\\n]+)`),
        )?.[1] ?? "",
      );
    if (get("STATUS") === "CANCELLED" || get("RRULE") || get("RECURRENCE-ID"))
      continue;
    const title = get("SUMMARY").slice(0, 200);
    if (
      !/open day|taster|young people|undergraduate|apprenticeships explained/i.test(
        title,
      ) ||
      /postgraduate|master.?s|PGCE|iQTS/i.test(title)
    )
      continue;
    const raw = get("DTSTART");
    const m = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T\d{6}Z?)?$/);
    const url = safeHttpsUrl(get("URL"), [
      "www.buckingham.ac.uk",
      "buckingham.ac.uk",
    ]);
    if (!m || !title || !url) continue;
    const date = `${m[1]}-${m[2]}-${m[3]}`;
    if (
      Number.isNaN(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      continue;
    items.push({
      id: `buckingham:${get("UID") || url}`,
      title,
      provider: "University of Buckingham",
      kind: "university-event",
      url,
      location: get("LOCATION").slice(0, 180) || "See organiser",
      date,
      closes: null,
      summary:
        "Meet the university and explore study or training options. Check the organiser's page for eligibility, booking and any cost.",
      checkedAt,
    });
  }
  return [...new Map(items.map((i) => [i.id, i])).values()];
}
export function normaliseVacancies(
  value: unknown,
  checkedAt: string,
): Opportunity[] {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as { vacancies?: unknown }).vacancies)
  )
    throw new Error("Invalid vacancy list");
  return (value as { vacancies: unknown[] }).vacancies
    .slice(0, 100)
    .flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const r = raw as Record<string, unknown>;
      const title = typeof r.title === "string" ? r.title.slice(0, 200) : "";
      const url = safeHttpsUrl(r.vacancyUrl, [
        "www.findapprenticeship.service.gov.uk",
        "findapprenticeship.service.gov.uk",
      ]);
      const closes =
        typeof r.closingDate === "string" &&
        !Number.isNaN(Date.parse(r.closingDate))
          ? r.closingDate
          : null;
      if (!title || !url || !closes) return [];
      const course =
        r.course && typeof r.course === "object"
          ? (r.course as Record<string, unknown>)
          : {};
      const addresses = Array.isArray(r.addresses)
        ? (r.addresses as Record<string, unknown>[])
        : [];
      return [
        {
          id: `faa:${String(r.vacancyReference ?? url).slice(0, 150)}`,
          title,
          provider:
            typeof r.employerName === "string"
              ? r.employerName.slice(0, 150)
              : "Employer",
          kind: "apprenticeship" as const,
          url,
          location: r.isNationalVacancy
            ? "Nationwide"
            : addresses
                .map((a) => (typeof a.postcode === "string" ? a.postcode : ""))
                .filter(Boolean)
                .join(", ")
                .slice(0, 180) || "See advert",
          date: null,
          closes,
          summary: `${typeof course.title === "string" ? course.title.slice(0, 160) : "Paid apprenticeship with training"}. Check the advert for entry requirements, pay and start date.`,
          checkedAt,
        },
      ];
    });
}
export const OPPORTUNITY_DIRECTORIES = [
  {
    id: "ucas-events",
    title: "UCAS events and university open days",
    provider: "UCAS",
    kind: "university-event" as const,
    url: "https://www.ucas.com/ucas-events",
    summary:
      "Meet universities, colleges and employers; browse the organiser's latest events.",
  },
  {
    id: "springpod",
    title: "Virtual work experience",
    provider: "Springpod",
    kind: "work-experience" as const,
    url: "https://www.springpod.com/virtual-work-experience/search",
    summary:
      "Explore employer programmes, try practical tasks and build evidence for applications. Check each programme's age and access requirements.",
  },
  {
    id: "futures-for-all",
    title: "Find work experience with employers",
    provider: "Futures for All",
    kind: "work-experience" as const,
    url: "https://finder.futuresforall.org/browse-by-industry",
    summary:
      "Browse available employer opportunities. Eligibility may depend on age, school, location and dates.",
  },
  {
    id: "ucas-experience",
    title: "Explore careers through virtual experience",
    provider: "UCAS",
    kind: "work-experience" as const,
    url: "https://www.ucas.com/careers-advice/virtual-work-experiences",
    summary:
      "Discover virtual experience options while comparing university and employment routes.",
  },
  {
    id: "faa",
    title: "Find apprenticeship vacancies",
    provider: "GOV.UK",
    kind: "apprenticeship" as const,
    url: "https://www.findapprenticeship.service.gov.uk/",
    summary:
      "Search the official current adverts by occupation and location; check the closing date before applying.",
  },
];
