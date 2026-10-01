import type { MetadataRoute } from "next";

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://illuminated-omega.vercel.app"
).replace(/\/+$/, "");

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
