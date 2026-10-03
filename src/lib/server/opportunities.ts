import "server-only";
import { unstable_cache } from "next/cache";

import stored from "@/lib/data/education/opportunities.json";
import {
  isUpcoming,
  normaliseVacancies,
  parseUniversityCalendar,
  type OpportunityFeed,
} from "@/lib/opportunities";
import { readStoredOpportunities } from "@/lib/server/education-store";
import { fetchUpstream } from "@/lib/server/proxy";
const EVENTS = "https://www.buckingham.ac.uk/events/?ical=1";
const VACANCIES =
  "https://api.apprenticeships.education.gov.uk/vacancies/vacancy?PageSize=100&PageNumber=1&Sort=AgeDesc&FilterBySubscription=false";
const KEY = process.env.APPRENTICESHIPS_API_KEY?.trim();
async function loadEvents() {
  const response = await fetchUpstream(EVENTS, {
    revalidate: 3600,
    headers: { accept: "text/calendar" },
  });
  if (!response.ok) throw new Error("Events unavailable");
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error("Calendar too large");
  const checkedAt = new Date().toISOString();
  return { items: parseUniversityCalendar(text, checkedAt), checkedAt };
}
async function loadVacancies() {
  const response = await fetchUpstream(VACANCIES, {
    noStore: true,
    redirect: "error",
    headers: { "Ocp-Apim-Subscription-Key": KEY!, "X-Version": "2" },
  });
  if (!response.ok) throw new Error("Vacancies unavailable");
  const checkedAt = new Date().toISOString();
  return {
    items: normaliseVacancies(await response.json(), checkedAt),
    checkedAt,
  };
}
// Separate caches ensure a source failure cannot overwrite its last successful snapshot.
const cachedEvents = unstable_cache(loadEvents, ["university-events-v1"], {
  revalidate: 3600,
});
const cachedVacancies = unstable_cache(
  loadVacancies,
  ["apprenticeship-adverts-v1"],
  { revalidate: 3600 },
);
export async function getOpportunities(): Promise<OpportunityFeed> {
  const results = await Promise.allSettled([
    cachedEvents(),
    KEY ? cachedVacancies() : Promise.resolve(null),
  ]);
  let fallback: OpportunityFeed = stored as OpportunityFeed;
  try {
    const remote = await readStoredOpportunities();
    if (
      remote &&
      typeof remote === "object" &&
      "items" in remote &&
      "sources" in remote &&
      Array.isArray(remote.items) &&
      Array.isArray(remote.sources)
    )
      fallback = remote as OpportunityFeed;
  } catch {
    /* Use the last shipped snapshot when database storage is unavailable. */
  }
  const sources: OpportunityFeed["sources"] = [];
  const items: OpportunityFeed["items"] = [];
  for (const [index, r] of results.entries()) {
    const name =
      index === 0
        ? "University of Buckingham events"
        : "Find an apprenticeship";
    const url =
      index === 0
        ? "https://www.buckingham.ac.uk/events/"
        : "https://www.findapprenticeship.service.gov.uk/";
    if (r.status === "fulfilled" && r.value) {
      items.push(...r.value.items);
      sources.push({ name, url, status: "live", checkedAt: r.value.checkedAt });
    } else {
      const source = fallback.sources.find((s) => s.name === name);
      const snapshot = fallback.items.filter(
        (i) => i.kind === (index === 0 ? "university-event" : "apprenticeship"),
      );
      if (snapshot.length && (index === 0 || KEY)) {
        items.push(...snapshot);
        sources.push({
          name,
          url,
          status: "cached",
          checkedAt: source?.checkedAt ?? null,
        });
      } else
        sources.push({
          name,
          url,
          status: index === 1 && !KEY ? "not-configured" : "unavailable",
          checkedAt: null,
        });
    }
  }
  return {
    items: items
      .filter((i) => isUpcoming(i))
      .sort((a, b) =>
        (a.date ?? a.closes ?? "").localeCompare(b.date ?? b.closes ?? ""),
      ),
    sources,
  };
}
