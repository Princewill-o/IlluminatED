/**
 * Who runs IlluminatED and how to reach them. Set these in the environment
 * before going live; the legal pages read them from here.
 */
export const OPERATOR_NAME =
  process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || "IlluminatED";

/** Public contact email. When it isn't set, pages point people to the contact form. */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;

/** The Designated Safeguarding Lead, named on the safeguarding page. */
export const DSL_NAME =
  process.env.NEXT_PUBLIC_DSL_NAME?.trim() || "Our safeguarding lead";

export const LEGAL_LAST_UPDATED = "1 October 2026";

export const LEGAL_LINKS = [
  { href: "/privacy", title: "Privacy" },
  { href: "/terms", title: "Terms" },
  { href: "/cookies", title: "Cookies" },
  { href: "/contact", title: "Contact" },
  { href: "/safeguarding", title: "Safeguarding" },
] as const;

export const CONTACT_TOPICS = [
  { value: "general", label: "General question" },
  { value: "account", label: "My account" },
  { value: "correction", label: "A mistake in the content" },
  { value: "safeguarding", label: "Safeguarding or safety concern" },
  { value: "tutoring", label: "Tutoring" },
  { value: "privacy", label: "Privacy or my data" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];
