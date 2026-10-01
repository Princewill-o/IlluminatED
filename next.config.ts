import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy. Next.js needs inline scripts (its hydration data and
 * the splash boot script in the root layout) and inline styles, so both allow
 * 'unsafe-inline'. Dev mode also needs 'unsafe-eval' for fast refresh.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://covers.openlibrary.org",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://register-api.ofqual.gov.uk",
    "https://api.education.gov.uk",
    "https://openlibrary.org",
    "https://vitals.vercel-insights.com",
    "https://*.stripe.com",
    ...(isDev ? ["ws:"] : []),
  ].join(" "),
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  images: {
    unoptimized: true,
  },
  // The browser can't read VERCEL_ENV, so copy it across at build time in case
  // "Automatically expose System Environment Variables" is switched off.
  ...(process.env.VERCEL_ENV && !process.env.NEXT_PUBLIC_VERCEL_ENV
    ? { env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV } }
    : {}),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
