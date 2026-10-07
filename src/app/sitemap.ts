import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

/** Only the pages anyone can open. Everything else needs an account. */
const PUBLIC_PAGES = [
  "/",
  "/about",
  "/faq",
  "/accessibility",
  "/your-data",
  "/privacy",
  "/terms",
  "/cookies",
  "/contact",
  "/safeguarding",
  "/social/guidelines",
  "/sign-in",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((path) => ({
    url: `${SITE}${path === "/" ? "" : path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
