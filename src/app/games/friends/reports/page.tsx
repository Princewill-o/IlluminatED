import { notFound } from "next/navigation";

import { CityHeading } from "@/components/game/city/city-panels";
import { requireAccount } from "@/lib/account/server";
import { getSupabase } from "@/lib/social/server";
export const metadata = { title: "Friend message reports" };
export default async function ReportsPage() {
  const account = await requireAccount("/games/friends/reports");
  if (account.profile.role !== "moderator") notFound();
  const sb = await getSupabase();
  const { data, error } = sb
    ? await sb
        .from("city_friend_reports")
        .select("id,reporter,message_id,disclosed_text,created_at")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: null, error: true };
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <CityHeading eyebrow="Safety team" title="Reported friend messages">
        Only the text the reporter chose to disclose is shown. Disclosures are
        user-supplied and cannot be independently checked against the encrypted
        message here. Use existing moderation tools for account action.
      </CityHeading>
      {error ? (
        <p role="alert">Reports are unavailable.</p>
      ) : !data?.length ? (
        <p>No reports.</p>
      ) : (
        data.map((r) => (
          <article className="mb-4 rounded-2xl border p-5" key={r.id}>
            <p className="text-xs">
              Report #{r.id} · Message #{r.message_id} ·{" "}
              {new Date(r.created_at).toLocaleString("en-GB", {
                timeZone: "Europe/London",
              })}
            </p>
            <p className="mt-2 text-xs">Reporter: {r.reporter}</p>
            <blockquote className="mt-3 border-l-2 pl-3 break-words whitespace-pre-wrap">
              {r.disclosed_text}
            </blockquote>
          </article>
        ))
      )}
    </main>
  );
}
