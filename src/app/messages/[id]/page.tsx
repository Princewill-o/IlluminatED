import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { cancelBooking, closeThread } from "@/app/messages/actions";
import { ThreadView } from "@/components/messages/thread-view";
import { requireAccount } from "@/lib/account/server";
import { getThread, meetingsBetween } from "@/lib/messages/server";

export const metadata: Metadata = { title: "Conversation" };

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default async function ThreadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ booked?: string }> }) {
  const { id } = await params;
  const { booked } = await searchParams;
  const account = await requireAccount(`/messages/${id}`);
  const t = await getThread(id);
  if (!t || (account.id !== t.learnerId && account.id !== t.staffId)) notFound();
  const iAmLearner = account.id === t.learnerId;
  const them = iAmLearner ? t.staff : t.learner;
  const themId = iAmLearner ? t.staffId : t.learnerId;
  const usable = !t.closed && (t.guardian === "not_needed" || t.guardian === "approved");
  const meetings = await meetingsBetween(t.learnerId, t.staffId);
  const now = Date.now();

  return (
    <div className="mx-auto max-w-2xl px-4 pt-3 md:pt-8">
      <div className="mb-3 flex items-center gap-3">
        <Link href="/messages" className="text-muted-foreground text-sm font-bold" aria-label="Back to messages">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">@{them}</p>
          <p className="truncate text-xs text-ink-sky">
            {iAmLearner ? `✓ Verified · ${t.org.name}` : `Learner · asking ${t.org.name}`}
          </p>
        </div>
        {!t.closed && (
          <form action={closeThread}>
            <input type="hidden" name="thread" value={t.id} />
            <button className="text-muted-foreground text-xs font-bold">End chat</button>
          </form>
        )}
      </div>

      {booked && <p className="mb-2 rounded-2xl bg-[#5fd3a5] p-3 text-sm font-bold text-[#0d1726]">✓ Office hours booked.</p>}
      {meetings.map((m) => {
        const live = new Date(m.startsAt).getTime() - 10 * 60_000 < now && new Date(m.endsAt).getTime() > now;
        return (
          <div key={m.id} className="mb-2 flex flex-wrap items-center gap-2 rounded-2xl bg-brand p-3 text-sm text-white">
            <span className="flex-1 font-bold">
              {when(m.startsAt)} · {m.room}
            </span>
            <Link
              href={`/games/world?map=office-${m.orgSlug}`}
              className={live ? "rounded-full bg-[#f2d9a6] px-3 py-1.5 font-black text-[#0d1726]" : "rounded-full bg-black/30 px-3 py-1.5 font-bold"}
            >
              {live ? "Walk to the meeting room now" : "Office"}
            </Link>
            {iAmLearner && (
              <form action={cancelBooking}>
                <input type="hidden" name="slot" value={m.id} />
                <button className="text-xs underline">Cancel</button>
              </form>
            )}
          </div>
        );
      })}

      {t.mode === "moderated" && (
        <p className="mb-2 rounded-2xl bg-foreground/[0.05] p-3 text-xs leading-5">
          <strong>Safeguarded chat.</strong>{" "}
          {t.guardian === "pending"
            ? "We've emailed a parent or carer to approve this conversation. You can chat once they say yes."
            : t.guardian === "declined"
              ? "A parent or carer declined this conversation."
              : "A parent or carer approved this conversation. Messages are checked for safety and our moderators can see them. Never share contact details or agree to meet somewhere else."}
        </p>
      )}
      {t.closed && <p className="mb-2 rounded-2xl bg-foreground/[0.05] p-3 text-xs">This conversation was ended. {iAmLearner && "Message them again from their company page to reopen it."}</p>}

      <ThreadView threadId={t.id} meId={account.id} themId={themId} mode={t.mode} usable={usable} />
    </div>
  );
}
