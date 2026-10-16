import Link from "next/link";

import type { Metadata } from "next";

import { requireAccount } from "@/lib/account/server";
import { myMembership } from "@/lib/employers/server";
import { listThreads } from "@/lib/messages/server";

export const metadata: Metadata = { title: "Messages" };

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
};

export default async function MessagesPage() {
  const account = await requireAccount("/messages");
  const [threads, staff] = await Promise.all([listThreads(account.id), myMembership(account.id)]);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-5 pb-10 md:pt-10">
      <h1 className="hidden text-3xl font-extrabold tracking-tight md:block">Messages</h1>
      <p className="text-muted-foreground text-sm md:mt-2">
        {staff
          ? `Conversations with learners who've asked ${staff.org.name} for advice.`
          : "Ask verified people at real companies for careers advice. You can't message other learners."}
      </p>
      {!staff && (
        <Link href="/companies" className="mt-4 inline-block rounded-full bg-[#f2d9a6] px-5 py-2.5 text-sm font-black text-[#0d1726]">
          Find a company to ask
        </Link>
      )}
      <ul className="bg-card mt-5 divide-y divide-border overflow-hidden rounded-3xl border">
        {threads.length === 0 && <li className="text-muted-foreground px-4 py-6 text-center text-sm">No conversations yet.</li>}
        {threads.map((t) => {
          const them = account.id === t.learnerId ? t.staff : t.learner;
          return (
            <li key={t.id}>
              <Link href={`/messages/${t.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-hover">
                <span className="grid size-11 shrink-0 place-items-center rounded-full text-base font-black text-[#0d1726]" style={{ background: t.org.accent }}>
                  {them.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">
                    @{them} {account.id === t.learnerId && <span className="text-xs text-ink-sky">✓ {t.org.name}</span>}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {t.mode === "e2ee" ? "End-to-end encrypted" : "Safeguarded chat"}
                    {t.guardian === "pending" && " · waiting for parent/carer approval"}
                    {t.guardian === "declined" && " · declined"}
                    {t.closed && " · closed"}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs">{ago(t.lastMessageAt)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
