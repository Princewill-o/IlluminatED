import "server-only";

import { siteOrigin as canonicalOrigin } from "@/lib/site";

/**
 * Transactional email through Resend's REST API. Off unless RESEND_API_KEY
 * and EMAIL_FROM are set, in which case sendEmail does nothing and returns false.
 *
 * Keep emails short and plain: say what happened and link to the page.
 * Never include message contents or anyone's contact details.
 */
const API_KEY = process.env.RESEND_API_KEY?.trim() || "";
const FROM = process.env.EMAIL_FROM?.trim() || "";

export const emailEnabled = Boolean(API_KEY && FROM);

export interface Email {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Plain text to simple HTML: paragraphs, with bare links made clickable. */
function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p>${escapeHtml(p)
          .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
          .replace(/\n/g, "<br>")}</p>`,
    )
    .join("\n");
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: Email): Promise<boolean> {
  if (!emailEnabled) return false;
  const recipients = (Array.isArray(to) ? to : [to])
    .map((t) => t.trim())
    .filter(Boolean);
  if (!recipients.length) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: recipients,
        subject,
        text,
        html: html ?? textToHtml(text),
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Addresses from MODERATOR_EMAILS (comma-separated). */
export function moderatorEmails(): string[] {
  return (process.env.MODERATOR_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

/**
 * Tells the moderators something needs their attention, e.g. a new tutor
 * application or an urgent safeguarding contact. Links to a page; never
 * put the learner's words or contact details in `summary`.
 */
export async function notifyModerators(
  subject: string,
  summary: string,
  path: string,
): Promise<boolean> {
  const to = moderatorEmails();
  if (!to.length) return false;
  const link = `${await siteOrigin()}${path}`;
  return sendEmail({
    to,
    subject,
    text: `${summary}\n\nOpen it on IlluminatED:\n${link}`,
  });
}

/** The site's own address, for links in emails. */
export async function siteOrigin(): Promise<string> {
  return canonicalOrigin();
}

/** The shared secret the server passes to database functions that browsers mustn't call. */
export const serverSecret = () =>
  process.env.PAYMENT_CALLBACK_SECRET?.trim() || "";
