import type { Metadata } from "next";

import { guardianDecision } from "@/app/messages/actions";
import { getSupabase } from "@/lib/social/server";

export const metadata: Metadata = { title: "Approve a careers conversation", robots: { index: false } };

const RESULTS: Record<string, string> = {
  accepted: "Thank you. You've approved the conversation. Messages are checked for safety and you can contact us at any time.",
  declined: "You've declined the conversation. It won't go ahead.",
  expired: "This link has expired. Your child can send a new request.",
  invalid: "This link isn't valid or has already been used.",
};

export default async function GuardianMessagesPage({ searchParams }: { searchParams: Promise<{ token?: string; result?: string }> }) {
  const { token, result } = await searchParams;
  if (result) {
    return (
      <div className="container max-w-lg py-16">
        <h1 className="text-3xl font-bold">Thanks</h1>
        <p className="text-muted-foreground mt-4 leading-7">{RESULTS[result] ?? RESULTS.invalid}</p>
      </div>
    );
  }
  const sb = await getSupabase();
  const { data } = sb && token ? await sb.rpc("dm_guardian_summary", { p_token: token }) : { data: null };
  const s = data as { learner: string; staff: string; title: string | null; org: string; status: string; expired: boolean } | null;

  return (
    <div className="container max-w-lg py-16">
      <p className="text-primary text-sm font-bold tracking-widest uppercase">Parent or carer approval</p>
      <h1 className="mt-2 text-3xl font-bold">Approve a careers conversation?</h1>
      {!s || s.expired || s.status !== "pending" ? (
        <p className="text-muted-foreground mt-4">{RESULTS[s?.expired ? "expired" : "invalid"]}</p>
      ) : (
        <>
          <p className="mt-4 leading-7">
            <strong>@{s.learner}</strong> would like to ask <strong>@{s.staff}</strong>
            {s.title ? `, ${s.title},` : ""} at <strong>{s.org}</strong> (a verified employer) for careers advice on IlluminatED.
          </p>
          <ul className="text-muted-foreground mt-4 list-disc space-y-2 pl-5 text-sm leading-6">
            <li>The employer verified that they work at {s.org} using their work email.</li>
            <li>Messages are checked automatically, can be seen by our moderators and can be reported.</li>
            <li>Phone numbers, email addresses and social media handles are blocked.</li>
            <li>Any meetings happen inside IlluminatED, never in person or on other apps.</li>
          </ul>
          <form action={guardianDecision} className="mt-6 flex flex-wrap gap-3">
            <input type="hidden" name="token" value={token} />
            <button name="decision" value="accept" className="bg-primary text-primary-foreground h-12 rounded-full px-6 font-semibold">
              Approve
            </button>
            <button name="decision" value="decline" className="h-12 rounded-full border px-6 font-semibold">
              Decline
            </button>
          </form>
        </>
      )}
    </div>
  );
}
