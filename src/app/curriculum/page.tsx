import Link from "next/link";

import type { Metadata } from "next";

import { COURSES } from "@/lib/data/courses";
import { oakFilters, OAK_ATTRIBUTION, OAK_LICENCE, SCHOOL_STAGES } from "@/lib/education/school-stages";
import { oakLibrary, oakSummary } from "@/lib/server/oak-library";

export const metadata: Metadata = { title: "IllumED Slides · Primary to sixth form", description: "Lesson slides and question-and-answer practice for Years 1–11, alongside IlluminatED sixth-form courses. Primary and secondary lessons are free to read without an account." };
export const dynamic = "force-dynamic";
const field = "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-foreground";

export default async function CurriculumPage({ searchParams }: { searchParams: Promise<Record<string,string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = new URLSearchParams(Object.entries(raw).filter((entry): entry is [string,string] => typeof entry[1] === "string"));
  const filters = oakFilters(params);
  const [result, subjects] = await Promise.all([oakLibrary(filters),oakSummary()]);
  const pageHref = (page: number) => { const next = new URLSearchParams(params); next.set("page", String(page)); return `/curriculum?${next}`; };
  return <div className="container max-w-6xl py-10 sm:py-16">
    <p className="font-bold text-primary">IllumED Slides · Your learning library</p>
    <h1 className="mt-2 text-3xl font-black sm:text-5xl">Primary to sixth form</h1>
    <p className="mt-4 max-w-3xl text-muted-foreground">Find your year, subject and next lesson. Learn with IllumED Slides, reveal model answers and download lessons for offline reading. Primary and secondary material covers Key Stages 1–4; A-level, BTEC and T Level routes support sixth-form learning.</p>
    <p className="mt-3 rounded-xl bg-muted p-4 text-sm">Primary and secondary lessons are open without an account. Younger pupils can learn with a parent, carer or teacher without sharing personal details. Account-based social features and prize competitions keep their existing age requirements.</p>
    <nav aria-label="School stage" className="my-7 grid gap-3 sm:grid-cols-3">{SCHOOL_STAGES.map(stage=><Link key={stage.id} href={`/curriculum?stage=${stage.id}`} aria-current={filters.stage===stage.id?"page":undefined} className={`rounded-2xl border p-5 focus-visible:outline-2 focus-visible:outline-ring ${filters.stage===stage.id?"border-primary bg-primary text-primary-foreground":"bg-card text-card-foreground hover:border-primary"}`}><strong className="block text-xl">{stage.title}</strong><span>{stage.years}</span></Link>)}</nav>
    {filters.stage === "sixth-form" ? <section aria-labelledby="sixth-title"><h2 id="sixth-title" className="text-2xl font-bold">Sixth-form courses</h2><p className="mt-2 text-muted-foreground">Oak’s supplied data does not include KS5. These are the platform’s existing courses; sign in to save progress and practise.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{COURSES.filter(course=>["alevel","btec","tlevel"].includes(course.route)).map(course=><Link key={course.id} href={`/courses/${course.id}`} className="rounded-2xl border bg-card p-5 font-bold text-card-foreground hover:border-primary">{course.title}<span className="mt-2 block text-sm font-normal text-muted-foreground">{course.years}</span></Link>)}</div></section> : <>
    <form action="/curriculum" className="mb-7 grid items-end gap-3 rounded-2xl border bg-card p-5 text-card-foreground sm:grid-cols-2 lg:grid-cols-5">
      {filters.stage!=="all" && <input type="hidden" name="stage" value={filters.stage} />}
      <label className="text-sm font-semibold">Find a lesson<input name="q" maxLength={100} defaultValue={filters.q} placeholder="e.g. fractions" className={`${field} mt-2`} /></label>
      <label className="text-sm font-semibold">Key stage<select name="keyStage" defaultValue={filters.keyStage} className={`${field} mt-2`}><option value="">All key stages</option>{[1,2,3,4].map(n=><option key={n} value={`ks${n}`}>Key Stage {n}</option>)}</select></label>
      <label className="text-sm font-semibold">Year<select name="year" defaultValue={filters.year??""} className={`${field} mt-2`}><option value="">All years</option>{Array.from({length:11},(_,i)=><option key={i+1} value={i+1}>Year {i+1}</option>)}</select></label>
      <label className="text-sm font-semibold">Subject<select name="subject" defaultValue={filters.subject} className={`${field} mt-2`}><option value="">All subjects</option>{subjects.map(subject=><option key={subject.subject} value={subject.subject}>{subject.title}</option>)}</select></label>
      <button className="min-h-11 rounded-xl bg-primary px-5 font-bold text-primary-foreground">Find lessons</button>
    </form>
    {!result.available ? <p role="status" className="rounded-xl bg-muted p-5">The library is temporarily unavailable. Please try again shortly.</p> : <>
      <p role="status" className="mb-4 text-sm text-muted-foreground">{result.total.toLocaleString("en-GB")} lessons found · page {filters.page} · restricted resources are labelled</p>
      {!result.lessons.length && <p className="rounded-xl border p-5">No lessons match these filters. Try another year, subject or search term.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{result.lessons.map(lesson=><Link key={lesson.slug} href={`/curriculum/${lesson.slug}`} className="rounded-2xl border bg-card p-5 text-card-foreground transition hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"><p className="text-sm font-semibold text-primary">{lesson.key_stage.toUpperCase()} · {lesson.subject_title}{lesson.years.length ? ` · Year ${lesson.years.join(", ")}` : ""}</p><h2 className="mt-3 text-lg font-bold">{lesson.title}</h2><p className="mt-2 text-sm text-muted-foreground">{lesson.unit_title}</p><span className="mt-4 inline-block text-sm font-bold">{lesson.restricted?"View access information →":"Open slides & questions →"}</span></Link>)}</div>
      <nav aria-label="Lesson pages" className="mt-7 flex items-center gap-5">{filters.page>1&&<Link href={pageHref(filters.page-1)} className="rounded-full border px-5 py-3 font-bold">← Previous</Link>}{filters.page*24<result.total&&<Link href={pageHref(filters.page+1)} className="rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground">Next →</Link>}</nav>
    </>}
    </>}
    <p className="mt-10 border-t pt-5 text-sm text-muted-foreground">{OAK_ATTRIBUTION}. <a href={OAK_LICENCE} className="underline">Read the licence</a>. Lesson content is attributed individually; restricted material is not reproduced. <Link href="/api/education/oak" className="underline">Browse the JSON API</Link>.</p>
  </div>;
}
