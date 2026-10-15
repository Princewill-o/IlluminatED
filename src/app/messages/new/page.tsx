import Link from "next/link";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { OpenForm } from "@/components/messages/open-form";
import { requireAccount } from "@/lib/account/server";
import { myMembership } from "@/lib/employers/server";

export const metadata: Metadata = { title: "New message" };

export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to } = await searchParams;
  const account = await requireAccount(`/messages/new${to ? `?to=${encodeURIComponent(to)}` : ""}`);
  if (!to || !/^[0-9a-f-]{36}$/.test(to)) redirect("/companies");
  if (await myMembership(account.id)) redirect("/messages");
  const staff = await myMembership(to);

  return (
    <div className="mx-auto max-w-md px-4 pt-5 pb-10 md:pt-10">
      <h1 className="text-2xl font-extrabold">Ask for advice</h1>
      {staff ? (
        <>
          <div className="bg-card mt-4 rounded-3xl border p-4">
            <p className="text-xs font-black tracking-[0.2em] text-[#6bc6ff] uppercase">✓ Verified · {staff.org.name}</p>
            <p className="mt-1 font-bold">{staff.title ?? "Team member"}</p>
            <Link href={`/companies/${staff.org.slug}`} className="text-primary mt-1 inline-block text-sm font-bold">
              Company page →
            </Link>
          </div>
          <div className="mt-5">
            <OpenForm to={to} adult={account.details.ageBand === "18+"} />
          </div>
        </>
      ) : (
        <p className="text-muted-foreground mt-4">That person isn&apos;t a verified employer, so you can&apos;t message them.</p>
      )}
    </div>
  );
}
