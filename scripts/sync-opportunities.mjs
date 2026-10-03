import fs from "node:fs/promises";
import { projectData } from "./lib/project-data.mjs";
const { parseUniversityCalendar, normaliseVacancies, isUpcoming } = projectData(
  "src/lib/opportunities.ts",
);
const file = "src/lib/data/education/opportunities.json";
let previous = { items: [], sources: [] };
try {
  previous = JSON.parse(await fs.readFile(file, "utf8"));
} catch {}
const configs = [
  {
    name: "University of Buckingham events",
    url: "https://www.buckingham.ac.uk/events/?ical=1",
    page: "https://www.buckingham.ac.uk/events/",
    parse: parseUniversityCalendar,
    json: false,
  },
];
if (process.env.APPRENTICESHIPS_API_KEY)
  configs.push({
    name: "Find an apprenticeship",
    url: "https://api.apprenticeships.education.gov.uk/vacancies/vacancy?PageSize=100&PageNumber=1&Sort=AgeDesc&FilterBySubscription=false",
    page: "https://www.findapprenticeship.service.gov.uk/",
    parse: normaliseVacancies,
    json: true,
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.APPRENTICESHIPS_API_KEY,
      "X-Version": "2",
    },
  });
const snapshots = await Promise.all(
  configs.map(async (c) => {
    try {
      const r = await fetch(c.url, {
        headers: c.headers,
        signal: AbortSignal.timeout(20000),
        redirect: "error",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const checkedAt = new Date().toISOString();
      const items = c.parse(
        c.json ? await r.json() : await r.text(),
        checkedAt,
      );
      return {
        items: items.filter((i) => isUpcoming(i)),
        source: { name: c.name, url: c.page, status: "live", checkedAt },
      };
    } catch {
      console.error(`${c.name}: source unavailable, preserving prior snapshot`);
      return {
        items: previous.items.filter(
          (i) =>
            i.kind === (c.json ? "apprenticeship" : "university-event") &&
            isUpcoming(i),
        ),
        source: {
          name: c.name,
          url: c.page,
          status: "cached",
          checkedAt:
            previous.sources.find((s) => s.name === c.name)?.checkedAt ?? null,
        },
      };
    }
  }),
);
const data = {
  items: snapshots.flatMap((s) => s.items),
  sources: snapshots.map((s) => s.source),
};
await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n");
console.log(`Stored ${data.items.length} upcoming opportunities.`);
