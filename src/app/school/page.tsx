import Link from "next/link";
import { redirect } from "next/navigation";

import { ClassJoin, CopyJoinLink } from "@/components/learning-school/forms";
import { CreateClass } from "@/components/school/school";
import { assignmentUrl, PRODUCT_NAMES, progressLabel, type LearningProduct } from "@/lib/learning-school/catalogue";
import { getSchoolAccessForVerifiedViewer } from "@/lib/school/access";
import { loadClasses } from "@/lib/school/server";
import { getSupabase, getViewer } from "@/lib/social/server";

export const metadata = { title: "School dashboard · IlluminatED Learning", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SchoolDashboard({ searchParams }: { searchParams: Promise<{ join?: string }> }) {
  const viewer = await getViewer();
  const { join } = await searchParams;
  if (!viewer) redirect(`/sign-in?next=${encodeURIComponent(`/school${join ? `?join=${encodeURIComponent(join)}` : ""}`)}`);
  const sb = await getSupabase();
  if (!sb) redirect("/sign-in?next=/school");
  const [access, admin, classes] = await Promise.all([getSchoolAccessForVerifiedViewer(), sb.rpc("platform_admin_status"), loadClasses(viewer.id)]);
  const teacher = admin.data === true || (access?.active && access.role === "teacher");
  if (!viewer.profile) redirect(teacher ? "/teacher" : `/onboarding?next=${encodeURIComponent(`/school${join ? `?join=${encodeURIComponent(join)}` : ""}`)}`);
  const classIds = (teacher ? classes.teaching : classes.joined).map((c) => c.id);
  const assignments = classIds.length ? await sb.from("learning_assignments").select("*").in("class_id", classIds).order("created_at", { ascending: false }) : { data: [], error: null };
  const progress = teacher ? { data: [] } : await sb.from("learning_assignment_progress").select("*").eq("user_id", viewer.id);
  const rows = (assignments.data ?? []) as { id: string; class_id: string; product: LearningProduct; resource_slug: string; title: string; due_at: string | null }[];
  const states = new Map((progress.data ?? []).map((row: Record<string, unknown>) => [String(row.assignment_id), row]));
  return <div className="mx-auto max-w-6xl px-5 py-12"><p className="text-sm font-semibold uppercase tracking-widest text-primary">IlluminatED Learning · Schools</p><h1 className="mt-3 text-4xl font-bold tracking-tight">{teacher ? "One class. Four products." : "Your class assignments"}</h1><p className="mt-4 max-w-2xl leading-7 text-muted-foreground">{teacher ? "Assign a workplace mission or independent subject practice from the same class. Review scores, written work and project certificates here." : "Open your teacher’s assignment, resume your work and read their feedback. Your account works across all four products."}</p>
    <div className="mt-7 flex flex-wrap gap-3"><Link href="/world/my-work" className="rounded-xl border px-4 py-2.5 font-semibold">My Work</Link>{teacher && <Link href="/teacher" className="rounded-xl border px-4 py-2.5 font-semibold">Existing homework tools</Link>}{admin.data === true && <Link href="/school/content" className="rounded-xl border px-4 py-2.5 font-semibold">Content review</Link>}</div>
    <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]"><div><h2 className="text-2xl font-bold">{teacher ? "Your classes" : "Your assignments"}</h2>{teacher ? <div className="mt-4 space-y-4">{classes.teaching.map((c) => <article key={c.id} className="rounded-2xl border bg-card p-6"><Link href={`/school/class/${c.id}`} className="text-xl font-bold underline-offset-4 hover:underline">{c.name}</Link><p className="mt-2 text-sm text-muted-foreground">{c.subject} · {rows.filter((a) => a.class_id === c.id).length} product assignments</p><div className="mt-4 flex flex-wrap items-center gap-3"><code className="rounded-lg bg-muted px-3 py-2 text-sm">{c.code}</code><CopyJoinLink code={c.code} /></div></article>)}{!classes.teaching.length && <p className="mt-4 rounded-2xl border p-6 text-muted-foreground">Create a class, then share its private join link through your school.</p>}</div> : <div className="mt-4 space-y-4">{rows.map((a) => { const p = states.get(a.id); return <article key={a.id} className="rounded-2xl border bg-card p-6"><p className="text-sm font-semibold text-primary">{PRODUCT_NAMES[a.product]}</p><h3 className="mt-2 text-xl font-bold">{a.title}</h3><p className="mt-2 text-sm">{progressLabel(p?.status as string)}{p?.max_score ? ` · ${p.score}/${p.max_score}` : ""}</p>{a.due_at && <p className="mt-1 text-sm text-muted-foreground">Due {new Date(a.due_at).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}</p>}{p?.feedback ? <p className="mt-3 rounded-xl bg-muted p-3 text-sm">Teacher feedback: {String(p.feedback)}</p> : null}<Link href={assignmentUrl(a.product, a.resource_slug, a.id)} className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground">{p ? "Open saved work" : "Start assignment"}</Link></article>; })}{!rows.length && <p className="mt-4 rounded-2xl border p-6 text-muted-foreground">No product assignments yet. Join your class or ask your teacher what to start.</p>}</div>}{assignments.error && <p role="alert" className="mt-4 text-sm">The assignments service is unavailable. Please try again shortly.</p>}</div><aside>{teacher ? <CreateClass /> : <ClassJoin code={/^[a-z0-9]{6}$/i.test(join ?? "") ? join : ""} />}<div className="mt-5 rounded-2xl bg-muted p-5"><h2 className="font-bold">Independent revision</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">You can learn and practise without waiting for an assignment.</p><div className="mt-4 flex flex-wrap gap-2">{(["maths", "science", "english"] as const).map((product) => <Link key={product} href={`/${product}`} className="rounded-xl border bg-background px-3 py-2 text-sm font-semibold">{PRODUCT_NAMES[product]}</Link>)}</div></div></aside></div>
  </div>;
}
