/**
 * IlluminatED's Supabase project. These are the public, browser-safe values
 * (the publishable key is shipped to every visitor anyway); the data is
 * protected by Row Level Security in the database.
 *
 * The built-in values are only used on the production deployment, or when
 * NEXT_PUBLIC_SUPABASE_URL is set. Preview deployments and local copies
 * without env vars run in preview mode (socialConfigured = false), so they
 * never write to the live database by accident.
 *
 * VERCEL_ENV is only readable on the server, so the browser reads
 * NEXT_PUBLIC_VERCEL_ENV instead. Vercel sets it when "Automatically expose
 * System Environment Variables" is on (the default), and next.config.ts
 * copies VERCEL_ENV into it at build time as a backup.
 * Never put a service_role or secret key here.
 */
const DEFAULT_SUPABASE_URL = "https://wfcihsbgkbjfvphzuuyi.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_MOwypIaox9OuKENpjbBwyA_oTV659oN";

const ENV_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ENV_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const isProduction =
  process.env.VERCEL_ENV === "production" ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

const useDefaults = isProduction || Boolean(ENV_URL);

export const SUPABASE_URL =
  ENV_URL || (useDefaults ? DEFAULT_SUPABASE_URL : "");
export const SUPABASE_KEY =
  ENV_KEY || (useDefaults ? DEFAULT_SUPABASE_KEY : "");

/** Social is live only when a Supabase project is configured. Otherwise pages show a labelled preview. */
export const socialConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const CATEGORIES = [
  {
    slug: "universities",
    name: "Universities",
    description:
      "Is it any good? Courses, teaching, halls, nightlife and cost of living, from people who've been there.",
  },
  {
    slug: "sixth-form",
    name: "Sixth form and college",
    description:
      "Choosing a sixth form or college, what it's really like, and settling in.",
  },
  {
    slug: "applying",
    name: "Applying",
    description:
      "UCAS, personal statements, offers, interviews and results day.",
  },
  {
    slug: "apprenticeships",
    name: "Apprenticeships and jobs",
    description:
      "Degree and higher apprenticeships, T Level placements and first jobs.",
  },
  {
    slug: "student-life",
    name: "Student life",
    description:
      "Money, housing, wellbeing and fitting study around everything else.",
  },
  {
    slug: "chat",
    name: "General chat",
    description: "Anything else. Keep it friendly.",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export const categoryBySlug = (slug: string) =>
  CATEGORIES.find((c) => c.slug === slug);

export const REPORT_REASONS = [
  { value: "bullying", label: "Bullying or harassment" },
  { value: "personal-info", label: "Shares someone's personal information" },
  { value: "self-harm", label: "Someone may be at risk" },
  { value: "inappropriate", label: "Inappropriate or offensive" },
  { value: "spam", label: "Spam or advertising" },
  { value: "other", label: "Something else" },
] as const;
