import type { MetadataRoute } from "next";

import { PUBLIC_WEB_URL as SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/admin",
        "/teacher",
        "/homework",
        "/school-access",
        "/getting-started",
        "/api/",
        "/tutors",
        "/social/u",
        "/account",
        "/onboarding",
        "/billing",
        "/premium/success",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
