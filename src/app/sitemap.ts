import type { MetadataRoute } from "next";

import { PUBLIC_WEB_URL as SITE } from "@/lib/site";

/** Only the pages anyone can open. Everything else needs an account. */
const PUBLIC_PAGES = [
  "/",
  "/world",
  "/world/pilot",
  "/world/tech-repair-trainee",
  "/maths",
  "/maths/percentages",
  "/maths/ratio-proportion",
  "/maths/profit-financial-maths",
  "/science",
  "/science/cells-microscopy",
  "/science/particles-materials",
  "/science/electricity-circuits",
  "/science/inspection-evidence",
  "/english",
  "/english/reading-evidence",
  "/english/language-analysis",
  "/english/writing-audience",
  "/english/condition-report",
  "/curriculum",
  "/about",
  "/book",
  "/schools",
  "/pricing",
  "/investors",
  "/revision-games",
  "/faq",
  "/accessibility",
  "/your-data",
  "/privacy",
  "/terms",
  "/cookies",
  "/contact",
  "/safeguarding",
  "/social/guidelines",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((path) => ({
    url: `${SITE}${path === "/" ? "" : path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
