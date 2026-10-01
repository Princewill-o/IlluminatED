import type { MetadataRoute } from "next";

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://illuminated-omega.vercel.app"
).replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/tutors",
        "/social/u",
        "/account",
        "/onboarding",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
