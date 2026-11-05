import Link from "next/link";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { PrincipalInvite } from "@/components/school/principal-invite";
import { courseById } from "@/lib/data/courses";
import { topicById } from "@/lib/data/topics";
import { requireTeacher } from "@/lib/school/access";
import { getSupabase } from "@/lib/social/server";

export const metadata: Metadata = { title: "School overview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Overview = {
  school: { name: string; seats: number; expiresAt: string };
  students: number; activeThisWeek: number; answeredThisWeek: number;
  staff: { username: string | null; role: string; classes: number; learners: number }[];
  classes: { name: string; subject: string; teacher: string | null; learners: number; homework: number; submissions: number }[];
  courses: { courseId: string; learners: number; accuracy: number | null }[];
  weakTopics: { topicId: string; courseId: string; learners: number; accuracy: number }[];
  invites: { email: string; role: string; at: string }[];
};
const pct = (n: number | null) => (n === null ? "–" : `${Math.round(n * 100)}%`);

/** The principal's view: the whole school at a glance, with aggregate learning only. */
export default async function PrincipalPage() {
  await requireTeacher();
  const sb = await getSupabase();
  const { data, error } = await sb!.rpc("school_overview");
  if (error || !data) redirect("/teacher");
  const o = data as Overview;
  const seatsLeft = Math.max(0, o.school.seats - o.students);
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-bold tracking-widest text-primary uppercase">Principal · {o.school.name}</p>
      <h1 className="mt-2 text-4xl font-bold">Your school at a glance.</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">Teachers, classes and how your learners are getting on across subjects. You see totals and averages only, never an individual student&apos;s answers.</p>

      <div className="my-7 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Students", o.students], ["Active this week", o.activeThisWeek], ["Questions this week", o.answeredThisWeek], ["Teachers", o.staff.length], ["Seats left", seatsLeft]].map(([label, n]) => (
          <div key={String(label)} className="rounded-2xl border bg-card p-5"><p className="text-3xl font-bold">{Number(n).toLocaleString("en-GB")}</p><p className="text-sm text-muted-foreground">{label}</p></div>
        ))}
      </div>

      <div className="grid gap-7 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-7">
          <section>
            <h2 className="text-xl font-bold">Subjects</h2>
            {!o.courses.length && <p className="mt-2 text-sm text-muted-foreground">No practice yet. Results appear as students answer questions on IlluminatED and in the game.</p>}
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {o.courses.map((c) => (
                <li key={c.courseId} className="rounded-2xl border bg-card p-4">
                  <p className="font-bold">{courseById(c.courseId)?.title ?? c.courseId}</p>
                  <p className="text-sm text-muted-foreground">{c.learners} learners · {pct(c.accuracy)} right on average</p>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-primary" style={{ width: `${(c.accuracy ?? 0) * 100}%` }} /></span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold">Topics to focus on</h2>
            <p className="mt-1 text-sm text-muted-foreground">The lowest-scoring topics practised by at least three students.</p>
            {!o.weakTopics.length && <p className="mt-2 text-sm text-muted-foreground">Not enough practice yet to spot gaps.</p>}
            <ul className="mt-3 space-y-2">
              {o.weakTopics.map((t) => (
                <li key={`${t.courseId}-${t.topicId}`} className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
                  <span><span className="font-bold">{topicById(t.topicId)?.title ?? t.topicId}</span> · {courseById(t.courseId)?.subject}</span>
                  <span className="shrink-0 text-destructive">{pct(t.accuracy)} · {t.learners} learners</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold">Classes</h2>
            {!o.classes.length && <p className="mt-2 text-sm text-muted-foreground">No classes yet. Teachers create classes from their workspace.</p>}
            <div className="mt-3 overflow-x-auto rounded-2xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary text-xs uppercase"><tr><th className="p-3">Class</th><th className="p-3">Teacher</th><th className="p-3">Learners</th><th className="p-3">Homework</th><th className="p-3">Handed in</th></tr></thead>
                <tbody>
                  {o.classes.map((c, i) => (
                    <tr key={`${c.name}-${i}`} className="border-t"><td className="p-3 font-bold">{c.name} <span className="font-normal text-muted-foreground">· {c.subject}</span></td><td className="p-3">@{c.teacher ?? "teacher"}</td><td className="p-3">{c.learners}</td><td className="p-3">{c.homework}</td><td className="p-3">{c.submissions}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <aside className="space-y-6">
          <PrincipalInvite />
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-xl font-bold">Staff</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {o.staff.map((s, i) => (
                <li key={`${s.username}-${i}`} className="flex justify-between gap-2"><span>@{s.username ?? "not set up yet"} {s.role === "principal" && <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold">Principal</span>}</span><span className="text-muted-foreground">{s.classes} classes · {s.learners} learners</span></li>
              ))}
            </ul>
          </section>
          {o.invites.length > 0 && (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="text-xl font-bold">Waiting to join</h2>
              <ul className="mt-3 space-y-1 text-sm">{o.invites.slice(0, 30).map((i) => <li key={i.email} className="flex justify-between gap-2"><span className="truncate">{i.email}</span><span className="text-muted-foreground">{i.role}</span></li>)}</ul>
            </section>
          )}
          <Link href="/teacher" className="block rounded-2xl bg-secondary p-5 font-bold">Your own classes →</Link>
        </aside>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">Licence renews {new Date(o.school.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. <Link href="/privacy#schools" className="underline">School privacy</Link></p>
    </main>
  );
}
