import Link from "next/link";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { deleteAdvice, removeMember, removeSlot } from "@/app/employers/actions";
import { AdviceForm, ProfileForm, SlotForm } from "@/components/employers/office-forms";
import { SECTORS, adviceFor, myMembership, sectorLabel, slotsFor, staffFor } from "@/lib/employers/server";
import { getViewer } from "@/lib/social/server";

export const metadata: Metadata = { title: "Your office" };

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function Card({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="bg-card mt-6 rounded-3xl border p-5 md:p-6">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function EmployerOfficePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/employers/office");
  const m = await myMembership(viewer.id);
  if (!m) redirect("/employers/join");
  const { welcome } = await searchParams;
  const [advice, slots, staff] = await Promise.all([adviceFor(m.org.id), slotsFor(m.org.id), staffFor([m.org.id])]);
  const mine = slots.filter((s) => s.staffId === viewer.id && !s.cancelled);
  const team = staff[m.org.id] ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 pb-10 md:pt-10">
      {welcome && (
        <p className="mb-4 rounded-2xl bg-[#5fd3a5] p-4 font-bold text-[#0b0910]" role="status">
          ✓ You&apos;re verified. Your office at {m.org.name} is open on Careers Campus.
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-primary text-xs font-black tracking-[0.25em] uppercase">Your office</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{m.org.name}</h1>
          <p className="text-muted-foreground text-sm">
            {sectorLabel(m.org.sector)} · {m.org.domain} · you&apos;re {m.role === "owner" ? "the owner" : "a mentor"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/games/world?map=office-${m.org.slug}`} className="rounded-full bg-[#c6f36b] px-4 py-2.5 text-sm font-black text-[#0b0910]">
            🚶 Walk into your office
          </Link>
          <Link href="/messages" className="rounded-full bg-[#7c4dff] px-4 py-2.5 text-sm font-black text-white">
            💬 Messages
          </Link>
        </div>
      </div>

      <Card title="Company profile">
        <ProfileForm
          about={m.org.about}
          website={m.org.website}
          accent={m.org.accent}
          sector={m.org.sector}
          sectors={[...SECTORS]}
          canEdit={m.role === "owner"}
        />
        <Link href={`/companies/${m.org.slug}`} className="text-primary mt-4 inline-block text-sm font-bold">
          View your public company page →
        </Link>
      </Card>

      <Card title="Office hours" id="office-hours">
        <p className="text-muted-foreground mb-4 text-sm">
          Learners book a slot, then you meet in your office&apos;s meeting room with your conversation open. Learners must message
          you first (and under-18s need a parent or carer&apos;s approval).
        </p>
        <SlotForm />
        <ul className="mt-5 divide-y divide-white/5">
          {mine.length === 0 && <li className="text-muted-foreground py-2 text-sm">No upcoming office hours yet.</li>}
          {mine.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex-1">
                <strong>{when(s.startsAt)}</strong> · {s.room}
                {s.bookedBy ? <span className="ml-2 rounded-full bg-[#ffd166] px-2 py-0.5 text-xs font-black text-[#0b0910]">Booked</span> : null}
              </span>
              <form action={removeSlot}>
                <input type="hidden" name="id" value={s.id} />
                <button className="text-destructive text-xs font-bold">{s.bookedBy ? "Cancel" : "Remove"}</button>
              </form>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Advice for learners">
        <AdviceForm />
        <ul className="mt-5 space-y-3">
          {advice.map((a) => (
            <li key={a.id} className="rounded-2xl bg-white/5 p-4">
              <p className="font-bold">{a.title}</p>
              <p className="text-muted-foreground mt-1 text-sm whitespace-pre-line">{a.body}</p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">@{a.author}</span>
                {(a.authorId === viewer.id || m.role === "owner") && (
                  <form action={deleteAdvice}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="text-destructive font-bold">Delete</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Your team">
        <p className="text-muted-foreground mb-3 text-sm">
          Colleagues join by verifying their own @{m.org.domain} email at{" "}
          <Link href="/employers/join" className="underline">
            /employers/join
          </Link>
          .
        </p>
        <ul className="divide-y divide-white/5">
          {team.map((t) => (
            <li key={t.userId} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex-1">
                <strong>@{t.username}</strong> {t.title && <span className="text-muted-foreground">· {t.title}</span>}
                {t.role === "owner" && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">Owner</span>}
              </span>
              {m.role === "owner" && t.userId !== viewer.id && (
                <form action={removeMember}>
                  <input type="hidden" name="user" value={t.userId} />
                  <button className="text-destructive text-xs font-bold">Remove</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
