import Link from "next/link";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { SignInForm } from "@/components/account/sign-in-form";
import { safeNext } from "@/lib/account/paths";
import { PRODUCTS, isLearningDestination } from "@/lib/learning/products";
import { socialConfigured } from "@/lib/social/config";
import { getViewer } from "@/lib/social/server";

export const metadata: Metadata = { title: "One account for all four products", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; mode?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const viewer = await getViewer();
  if (viewer) redirect(viewer.profile || !isLearningDestination(next) ? next : `/onboarding?next=${encodeURIComponent(next)}`);
  return <div className="mx-auto grid max-w-5xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2">
    <div><p className="text-sm font-semibold text-muted-foreground">ILLUMINATED LEARNING</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">One account.<br />Four ways to learn.</h1><p className="mt-5 leading-7 text-muted-foreground">Sign in to save practice, resume workplace projects and join your school class. Use the same account in every product.</p><p className="mt-3 text-sm text-muted-foreground">New here? Create a free account. Accounts are for ages 13 and over.</p>
      {sp.error && <p role="alert" className="mt-5 text-sm text-destructive">That sign-in link could not be used. Request a new link and open it in this browser.</p>}
      {!socialConfigured && <p className="mt-5 text-sm">Accounts are not connected in this preview.</p>}
      <div className="mt-7"><SignInForm next={next} disabled={!socialConfigured} initialMode={sp.mode === "sign-up" ? "sign-up" : "sign-in"} /></div>
    </div>
    <aside className="rounded-3xl border bg-muted/30 p-7"><h2 className="text-xl font-semibold">Your progress travels with you.</h2><ul className="mt-6 space-y-5">{PRODUCTS.map(p => <li key={p.id} className="flex gap-3"><span style={{ background: p.colour }} className="grid size-10 shrink-0 place-items-center rounded-xl font-bold text-white">{p.symbol}</span><span><Link href={p.path} className="font-semibold">{p.name}</Link><span className="mt-1 block text-sm leading-6 text-muted-foreground">{p.label}</span></span></li>)}</ul><p className="mt-7 border-t pt-5 text-sm leading-7 text-muted-foreground">Teachers manage classes and assignments through the <Link href="/school" className="font-semibold underline">school dashboard</Link>. Read our <Link href="/privacy" className="underline">privacy policy</Link> and <Link href="/terms" className="underline">terms</Link>.</p></aside>
  </div>;
}
