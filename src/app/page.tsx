import Image from "next/image";
import Link from "next/link";

import { ArrowRight, Award, BookOpen, Building2, Check, Clock3, Users } from "lucide-react";
import type { Metadata } from "next";

import { SUBJECT_PACKS } from "@/lib/learning/packs";
import { PRODUCTS } from "@/lib/learning/products";

/** What a visitor will find inside each product, taken from the real content. */
const INSIDE: Record<string, string[]> = {
  world: ["Mission 01: Tech Repair Trainee", "My Work portfolio", "Careers city"],
  ...Object.fromEntries(["maths", "science", "english"].map((id) => [id, [...SUBJECT_PACKS.filter((p) => p.product === id).map((p) => p.title), ...(id === "maths" ? ["Solo Maths Race"] : [])]])),
};

export const metadata: Metadata = {
  title: { absolute: "IlluminatED Learning | Four products. One place to grow." },
  description: "Discover IllumWorld virtual work experience, IllumMaths, IllumScience and IllumEnglish. One pupil account and one school dashboard.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <div className="bg-background text-foreground">
    <section className="relative overflow-hidden border-b border-border bg-muted/40">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-36 size-[32rem] rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold tracking-wide text-muted-foreground">ILLUMINATED LEARNING</p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">Choose your next<br /><span className="text-violet-700 dark:text-violet-300">step forward.</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">Explore a workplace in IllumWorld, or build your confidence in maths, science and English. Each has a home of its own.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#products" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-foreground px-6 font-semibold text-background">Find your product <ArrowRight className="size-4" aria-hidden /></Link>
            <Link href="/world/pilot" className="inline-flex min-h-12 items-center rounded-xl border border-border bg-background px-6 font-semibold">Plan a school lesson</Link>
            <Link href="/school" className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 font-semibold underline underline-offset-4"><Users className="size-4" aria-hidden />Join your class</Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">One account · Independent revision · One school dashboard</p>
        </div>
        <Link href="/world" className="group overflow-hidden rounded-3xl border border-border bg-background shadow-sm">
          <div className="relative aspect-[16/10] overflow-hidden"><Image src="/landing/world-street.webp" alt="The playable London street in IllumWorld" fill sizes="(min-width:1024px) 45vw, 95vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" priority /><span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-900">Meet IllumWorld</span></div>
          <div className="p-6"><p className="text-sm font-semibold text-violet-700 dark:text-violet-300">THE FLAGSHIP EXPERIENCE</p><h2 className="mt-2 text-2xl font-semibold">A city with a purpose.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Start as a Tech Repair Trainee. Inspect three devices, weigh the evidence and explain your recommendation.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold">Explore virtual work experience <ArrowRight className="size-4" aria-hidden /></span></div>
        </Link>
      </div>
    </section>

    <section id="products" className="mx-auto max-w-7xl scroll-mt-8 px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="products-title">
      <p className="text-sm font-semibold text-muted-foreground">FOUR PRODUCTS. CLEAR STARTING POINTS.</p>
      <h2 id="products-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">What would you like to do?</h2>
      <div className="mt-9 grid gap-5 md:grid-cols-2">
        {PRODUCTS.map(p => <Link key={p.id} href={p.path} className="group flex flex-col rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none sm:p-8">
          <div className="flex items-start justify-between gap-4"><span style={{ background: p.colour }} className="grid size-14 place-items-center rounded-2xl text-2xl font-bold text-white">{p.symbol}</span><span className="rounded-full border px-3 py-1.5 text-xs font-semibold">{p.id === "world" ? "Year 10 · Work experience" : "GCSE · Independent revision"}</span></div>
          <p className="mt-6 text-sm text-muted-foreground">{p.label}</p><h3 className="mt-1 text-3xl font-semibold tracking-tight">{p.name}</h3><p className="mt-3 max-w-lg text-base leading-7 text-muted-foreground">{p.description}</p>
          <ul className="mt-5 flex flex-1 flex-wrap content-start gap-2" aria-label={`Inside ${p.name}`}>{INSIDE[p.id]?.map(item => <li key={item} className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium">{item}</li>)}</ul>
          <span className="mt-7 inline-flex items-center gap-2 font-semibold">Open {p.name} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden /></span>
        </Link>)}
      </div>
    </section>

    <section className="border-y border-border bg-muted/35" aria-labelledby="lesson-title"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div><span className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300"><Building2 className="size-4" aria-hidden /> FOR SCHOOLS</span><h2 id="lesson-title" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">One complete work<br />experience lesson.</h2><p className="mt-5 max-w-lg leading-7 text-muted-foreground">Give Year 10 a decision worth defending. In 35–40 minutes, pupils produce a repair recommendation and a customer condition report you can assess.</p><Link href="/world/pilot" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-700 px-5 font-semibold text-white dark:bg-violet-300 dark:text-violet-950">View the pilot lesson <ArrowRight className="size-4" aria-hidden /></Link></div>
      <div className="rounded-3xl border border-border bg-background p-6 sm:p-8"><h3 className="text-lg font-semibold">Tech Repair Trainee</h3><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" aria-hidden /> Year 10 · 35–40 minutes</p><ol className="mt-6 space-y-5">{["Inspect three fictional phones and calculate expected profit.","Use evidence to recommend repair, sell as-is or decline.","Write a clear report for a customer.","Submit, respond to teacher feedback and download approved work."].map((s,i)=><li key={s} className="flex gap-3 text-sm leading-6"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted font-semibold">{i+1}</span>{s}</li>)}</ol><p className="mt-6 border-t pt-5 text-sm leading-6 text-muted-foreground">Maths, science and English help opens alongside the mission. Pupils can also practise those subjects separately.</p></div>
    </div></section>

    <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr]" aria-labelledby="record-title">
      <div><span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300"><Award className="size-4" aria-hidden /> PORTFOLIO AND CERTIFICATE</span><h2 id="record-title" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Work worth keeping.</h2><p className="mt-5 max-w-lg leading-7 text-muted-foreground">Every project is saved in My Work with its calculations, decisions, report and teacher feedback. Once their teacher approves an assigned project, pupils download a certificate naming the skills they showed.</p><ul className="mt-6 space-y-3">{["Downloadable project record (PDF)","Certificate unlocked only by teacher approval","Honest about scope: a project record, not an accredited qualification"].map(t=><li key={t} className="flex gap-3 text-sm leading-6"><Check className="mt-1 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />{t}</li>)}</ul><div className="mt-7 flex flex-wrap gap-4"><Link href="/world/my-work" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Open My Work</Link><a href="/world/pilot/sample" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Download the sample certificate (PDF)</a></div></div>
      <figure className="overflow-hidden rounded-3xl border border-border bg-muted/40 p-3 sm:p-5"><Image src="/landing/certificate-sample.webp" alt="Sample IllumWorld certificate of project completion in navy and gold, marked SAMPLE - NOT AWARDED" width={1287} height={910} sizes="(min-width:1024px) 50vw, 95vw" className="w-full rounded-xl shadow-sm" /><figcaption className="mt-3 text-center text-xs text-muted-foreground">Sample only. Real certificates show the pupil, approving teacher, class and date.</figcaption></figure>
    </section>

    <section className="mx-auto grid max-w-7xl gap-10 border-t border-border px-4 py-16 sm:px-6 lg:grid-cols-2" aria-labelledby="shared-title">
      <div><h2 id="shared-title" className="text-3xl font-semibold tracking-tight">Different products.<br />One learning journey.</h2><ul className="mt-6 space-y-4">{["Switch products with the same pupil account.","Resume saved practice and workplace projects.","Teachers assign and review from one class dashboard."].map(t=><li key={t} className="flex gap-3 text-sm leading-6"><Check className="mt-1 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />{t}</li>)}</ul><Link href="/school" className="mt-6 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Open the school dashboard</Link></div>
      <div className="rounded-3xl border border-border p-7"><BookOpen className="size-7 text-muted-foreground" aria-hidden /><h3 className="mt-4 text-xl font-semibold">Your existing resources are still here.</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">Browse IllumED Slides for primary and secondary school, plus the wider revision library and sixth-form resources. Existing lesson links continue to work.</p><div className="mt-5 flex flex-wrap gap-4"><Link href="/curriculum" className="min-h-11 py-2 font-semibold underline underline-offset-4">Lesson slides</Link><Link href="/learn" className="min-h-11 py-2 font-semibold underline underline-offset-4">Wider revision library</Link></div></div>
    </section>
  </div>;
}
