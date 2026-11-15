import Link from "next/link";

import { ArrowRight, Award, Clock3 } from "lucide-react";

import {
  ROLE_CONTRACTS,
  contractMinutes,
} from "@/lib/illum-world/role-contracts";

export const metadata = { title: "Role contracts | IllumWorld" };

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ q?: string; sector?: string; page?: string }> }) {
  const query = await searchParams;
  const search = (query.q ?? "").trim().slice(0, 100);
  const sector = query.sector ?? "";
  const matches = ROLE_CONTRACTS.filter(course =>
    (!sector || course.workplace === sector) &&
    `${course.title} ${course.workplace}`.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(matches.length / 18));
  const page = Math.min(pages, Math.max(1, Number.parseInt(query.page ?? "1") || 1));
  const pageHref = (number: number) => "/world/contracts?" + new URLSearchParams({ q: search, sector, page: String(number) });

  return (
    <main className="mx-auto max-w-6xl px-5 py-14 text-[#1d1a4a] sm:px-8 dark:text-white">
      <Link
        href="/world"
        className="font-semibold underline underline-offset-4"
      >
        ← IllumWorld
      </Link>
      <header className="mt-6 mb-9 max-w-3xl">
        <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
          Choose an in-game contract
        </h1>
        <p className="mt-5 text-lg">
          Try a workplace simulation at Microsoft, JPMorgan Chase, Amazon Web
          Services and more inside IllumWorld. Each contract has three
          self-paced shifts, with a brief, worked example and knowledge check
          in each shift.
        </p>
      </header>
      <form className="mb-6 flex flex-wrap items-end gap-3">
        <label className="font-bold">Search roles<input name="q" defaultValue={search} className="mt-1 block min-h-11 rounded-lg border bg-white p-2 text-[#1d1a4a]" /></label>
        <label className="font-bold">Workplace or sector<select name="sector" defaultValue={sector} className="mt-1 block min-h-11 rounded-lg border bg-white p-2 text-[#1d1a4a]"><option value="">All sectors</option>{[...new Set(ROLE_CONTRACTS.map(item => item.workplace))].map(name => <option key={name}>{name}</option>)}</select></label>
        <button className="min-h-11 rounded-lg bg-[#5141b5] px-5 font-bold text-white">Find scenarios</button>
      </form>
      <p className="mb-5">{matches.length} introductory scenarios · Page {page} of {pages}</p>
      <p className="mb-6 text-sm">Sector studios use a shared evidence-review lesson format with different role briefs and case figures. Employer courses contain their own scenarios.</p>
      <div className="grid gap-5 md:grid-cols-3">
        {matches.slice((page - 1) * 18, page * 18).map((course) => (
          <article
            key={course.id}
            className="flex flex-col rounded-3xl border-2 border-[#1d1a4a] bg-white p-6 shadow-[4px_4px_0_#1d1a4a] dark:border-violet-300 dark:bg-[#201b49]"
          >
            <p className="font-black text-[#5141b5] dark:text-violet-200">
              {course.workplace}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-bold">
              <Clock3 className="size-4" aria-hidden /> Three shifts ·{" "}
              {contractMinutes(course)} min suggested
            </p>
            <h2 className="mt-4 text-2xl font-black">{course.title}</h2>
            <p className="mt-3 mb-6 flex-1 leading-relaxed">{course.summary}</p>
            <Link
              href={`/world/contracts/${course.id}`}
              className="flex min-h-11 items-center gap-2 font-bold text-[#5141b5] underline underline-offset-4 dark:text-violet-200"
            >
              Read the contract <ArrowRight className="size-4" aria-hidden />
            </Link>
          </article>
        ))}
      </div>
      <nav aria-label="Scenario pages" className="my-6 flex gap-6">
        {page > 1 && <Link href={pageHref(page - 1)} className="min-h-11 font-bold underline">Previous page</Link>}
        {page < pages && <Link href={pageHref(page + 1)} className="min-h-11 font-bold underline">Next page</Link>}
      </nav>
      <section
        id="certificates"
        className="mt-10 rounded-3xl border-2 border-[#1d1a4a] bg-[#fff3c4] p-6 text-[#1d1a4a]"
      >
        <h2 className="flex items-center gap-2 text-2xl font-black">
          <Award aria-hidden /> Completion certificate
        </h2>
        <p className="mt-2 max-w-3xl">
          Pass all three shift checks to download an IlluminatED certificate for
          the in-game activity. Your progress is saved on this device. The
          certificate records game-course completion and has no external
          accreditation.
        </p>
        <a
          href="/api/world/contracts/data-analyst/certificate"
          className="mt-4 inline-flex min-h-11 items-center font-bold underline underline-offset-4"
        >
          View the marked sample PDF
        </a>
      </section>
    </main>
  );
}
