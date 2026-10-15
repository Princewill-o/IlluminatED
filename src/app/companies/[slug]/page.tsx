import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { bookSlot } from "@/app/messages/actions";
import { requireAccount } from "@/lib/account/server";
import { adviceFor, myMembership, orgBySlug, sectorLabel, slotsFor, staffFor } from "@/lib/employers/server";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const org = await orgBySlug((await params).slug);
  return { title: org?.name ?? "Company" };
}

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const BOOKING: Record<string, string> = {
  message_first: "Message this person first. (If you're under 18, your parent or carer needs to approve the conversation.)",
  taken: "Someone just booked that slot. Try another.",
  unavailable: "That slot isn't available any more.",
  too_many_bookings: "You can hold up to 3 upcoming bookings.",
  error: "Couldn't book that slot. Please try again.",
};

export default async function CompanyPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ booking?: string }> }) {
  const { slug } = await params;
  const { booking } = await searchParams;
  const account = await requireAccount(`/companies/${slug}`);
  const org = await orgBySlug(slug);
  if (!org) notFound();
  const [advice, slots, staff, me] = await Promise.all([adviceFor(org.id), slotsFor(org.id), staffFor([org.id]), myMembership(account.id)]);
  const team = staff[org.id] ?? [];
  const open = slots.filter((s) => !s.cancelled && !s.bookedBy);
  const mine = slots.filter((s) => s.bookedBy === account.id && !s.cancelled);
  const isStaff = Boolean(me);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 pb-10 md:pt-10">
      <section className="overflow-hidden rounded-3xl border">
        <div className="h-3" style={{ background: org.accent }} />
        <div className="bg-card p-5 md:p-6">
          <p className="text-xs font-black tracking-[0.25em] text-[#6bc6ff] uppercase">✓ Verified employer</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{org.name}</h1>
          <p className="text-muted-foreground text-sm">
            {sectorLabel(org.sector)}
            {org.website && (
              <>
                {" · "}
                <a href={org.website} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                  Website
                </a>
              </>
            )}
          </p>
          {org.about && <p className="mt-4 leading-7 whitespace-pre-line">{org.about}</p>}
          <Link href={`/games/world?map=office-${org.slug}`} className="mt-5 inline-block rounded-full bg-[#c6f36b] px-5 py-3 font-black text-[#0b0910]">
            🚶 Visit their office
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">Ask the team</h2>
        <ul className="bg-card mt-3 divide-y divide-white/5 rounded-3xl border">
          {team.map((t) => (
            <li key={t.userId} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-bold">@{t.username}</span>
                {t.title && <span className="text-muted-foreground block text-sm">{t.title}</span>}
              </span>
              {!isStaff && t.userId !== account.id && (
                <Link href={`/messages/new?to=${t.userId}`} className="rounded-full bg-[#7c4dff] px-4 py-2 text-sm font-black text-white">
                  Message
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6" id="office-hours">
        <h2 className="text-lg font-extrabold">Office hours</h2>
        {booking && BOOKING[booking] && (
          <p className="mt-3 rounded-2xl bg-[#ffd166] p-3 text-sm font-bold text-[#0b0910]" role="alert">
            {BOOKING[booking]}
          </p>
        )}
        {mine.length > 0 && (
          <ul className="mt-3 space-y-2">
            {mine.map((s) => (
              <li key={s.id} className="rounded-2xl bg-[#5fd3a5] p-3 text-sm font-bold text-[#0b0910]">
                ✓ Booked: {when(s.startsAt)} with @{s.staff} in {s.room}
              </li>
            ))}
          </ul>
        )}
        <ul className="bg-card mt-3 divide-y divide-white/5 rounded-3xl border">
          {open.length === 0 && <li className="text-muted-foreground px-4 py-3 text-sm">No open slots right now. Check back soon.</li>}
          {open.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="flex-1">
                <strong>{when(s.startsAt)}</strong> · @{s.staff} · {s.room}
              </span>
              {!isStaff && (
                <form action={bookSlot}>
                  <input type="hidden" name="slot" value={s.id} />
                  <input type="hidden" name="slug" value={org.slug} />
                  <button className="rounded-full bg-[#c6f36b] px-4 py-2 font-black text-[#0b0910]">Book</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">Advice</h2>
        <ul className="mt-3 space-y-3">
          {advice.length === 0 && <li className="text-muted-foreground text-sm">No advice posted yet.</li>}
          {advice.map((a) => (
            <li key={a.id} className="bg-card rounded-3xl border p-5">
              <h3 className="font-extrabold">{a.title}</h3>
              <p className="mt-2 leading-7 whitespace-pre-line">{a.body}</p>
              <p className="text-muted-foreground mt-2 text-xs">@{a.author} · ✓ {org.name}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
