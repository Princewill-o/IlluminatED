import Link from "next/link";
import { redirect } from "next/navigation";

import { ArrowRight, ClipboardCheck, FolderOpen } from "lucide-react";
import type { Metadata } from "next";

import { findSubjectPack } from "@/lib/learning/packs";
import { PRODUCTS } from "@/lib/learning/products";
import { getSupabase, getViewer } from "@/lib/social/server";

export const metadata: Metadata = { title: "My learning | IlluminatED Learning", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LearningDashboard() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/dashboard");
  if (!viewer.profile) redirect("/onboarding?next=/dashboard");
  const sb = await getSupabase();
  const recent = await sb!.from("learning_subject_attempts").select("id,product,topic_slug,mode,score,max_score,submitted_at,assignment_id").eq("user_id", viewer.id).order("started_at", { ascending: false }).limit(8);
  const attempts = (recent.data ?? []) as {id:string;product:string;topic_slug:string;mode:string;score:number|null;max_score:number;submitted_at:string|null;assignment_id:string|null}[];
  return <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <p className="text-sm font-semibold text-muted-foreground">YOUR LEARNING</p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight">{viewer.profile?.username ? `Welcome back, ${viewer.profile.username}.` : "What will you work on today?"}</h1>
    <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">Choose a product to continue. Your saved results and drafts stay with your account as you switch.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2">{PRODUCTS.map(p => <Link key={p.id} href={p.path} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 hover:bg-muted/50"><span style={{ background: p.colour }} className="grid size-12 shrink-0 place-items-center rounded-xl text-xl font-bold text-white">{p.symbol}</span><span className="flex-1"><span className="block text-xl font-semibold">{p.name}</span><span className="mt-1 block text-sm text-muted-foreground">{p.label}</span></span><ArrowRight className="size-4 shrink-0" aria-hidden /></Link>)}</div>
    <section className="mt-10" aria-labelledby="recent-work-title"><h2 id="recent-work-title" className="text-2xl font-semibold">Recent subject work</h2>{recent.error ? <p className="mt-3 text-sm text-muted-foreground">Your saved results could not load. Open a subject to retry.</p> : attempts.length ? <ul className="mt-4 divide-y rounded-2xl border px-5">{attempts.map(a => {
      const pack = findSubjectPack(a.product,a.topic_slug);
      if (!pack) return null;
      return <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{pack.title}</p><p className="mt-1 text-sm text-muted-foreground">{PRODUCTS.find(p=>p.id===a.product)?.name} · {a.mode === "race" ? "Maths Race" : "Practice"}{a.submitted_at ? ` · ${a.score}/${a.max_score}` : " · Saved draft"}{a.assignment_id ? " · Class assignment" : ""}</p></div><Link href={`/${a.product}/${a.topic_slug}${a.assignment_id ? `?assignment=${a.assignment_id}` : ""}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">{a.submitted_at ? "Practise again" : "Continue topic"}</Link></li>;
    })}</ul> : <p className="mt-3 text-sm text-muted-foreground">Your saved topic results and unfinished practice will appear here after your first session.</p>}</section>
    <div className="mt-10 grid gap-5 sm:grid-cols-2"><Link href="/school" className="rounded-2xl border p-6"><ClipboardCheck className="size-6" aria-hidden /><h2 className="mt-4 text-xl font-semibold">Class assignments</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Join your class, see what your teacher has set and resume your work.</p></Link><Link href="/world/my-work" className="rounded-2xl border p-6"><FolderOpen className="size-6" aria-hidden /><h2 className="mt-4 text-xl font-semibold">My Work</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Find workplace projects, teacher feedback and approved certificates.</p></Link></div>
    <details className="mt-10 rounded-2xl border p-5"><summary className="cursor-pointer font-semibold">Existing learning resources and account settings</summary><div className="mt-4 flex flex-wrap gap-5 text-sm"><Link href="/progress" className="underline">Previous revision progress</Link><Link href="/learn" className="underline">Wider revision library</Link><Link href="/curriculum" className="underline">IllumED Slides</Link><Link href="/dashboard/settings" className="underline">Account settings</Link></div></details>
  </div>;
}
