"use server";

import { cookies } from "next/headers";

import { z } from "zod";

import { getAccount } from "@/lib/account/server";
import { sendEmail } from "@/lib/email";
import { siteOrigin } from "@/lib/site";
import { getSupabase } from "@/lib/social/server";

/** Where creator videos are reviewed. */
const CREATOR_INBOX = "okubep@gmail.com";

const Submission = z.object({
  platform: z.enum(["tiktok", "instagram", "youtube", "x", "snapchat", "other"]),
  url: z
    .string()
    .trim()
    .max(500)
    .url()
    .refine((u) => u.startsWith("https://"), "Paste the full https:// link to your post."),
  note: z.string().trim().max(500).optional(),
});

export async function submitCreatorVideo(input: { platform: string; url: string; note?: string }) {
  const account = await getAccount();
  if (!account) return { ok: false as const, error: "Sign in first so we know who to pay." };
  const p = Submission.safeParse(input);
  if (!p.success) return { ok: false as const, error: p.error.issues[0]?.message ?? "Check your link and try again." };
  const sb = await getSupabase();
  if (!sb) return { ok: false as const, error: "Couldn't reach the server. Try again in a moment." };
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await sb.from("creator_submissions").select("id", { count: "exact", head: true }).eq("user_id", account.id).gte("created_at", since);
  if ((count ?? 0) >= 10) return { ok: false as const, error: "That's 10 videos today. Send more tomorrow." };
  const { error } = await sb.from("creator_submissions").insert({ user_id: account.id, platform: p.data.platform, url: p.data.url, note: p.data.note || null });
  if (error) return { ok: false as const, error: "That didn't save. Try again." };

  const username = account.profile?.username ?? account.id.slice(0, 8);
  const body = [
    `New creator video from ${username} (account ${account.id}).`,
    `Platform: ${p.data.platform}\nLink: ${p.data.url}`,
    p.data.note ? `Their note: ${p.data.note}` : "",
    `Their referral link: ${siteOrigin()}/r/${username}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const emailed = await sendEmail({ to: CREATOR_INBOX, subject: `Creator video: ${username} on ${p.data.platform}`, text: body });
  // If email isn't set up on the server, the page offers a ready-made email instead.
  const mailto = emailed ? null : `mailto:${CREATOR_INBOX}?subject=${encodeURIComponent(`Creator video: ${username}`)}&body=${encodeURIComponent(body)}`;
  return { ok: true as const, mailto };
}

/** Credits whoever sent a new player here (once, for accounts under a week old). */
export async function claimReferral() {
  const jar = await cookies();
  const code = jar.get("ref")?.value;
  if (!code) return false;
  jar.delete("ref");
  const sb = await getSupabase();
  if (!sb) return false;
  const { data } = await sb.rpc("claim_referral", { p_code: code });
  return Boolean(data);
}
