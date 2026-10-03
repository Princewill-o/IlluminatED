import Link from "next/link";

import { Pager, ThreadList } from "@/components/social/thread-list";
import { getBlockList, withoutBlocked } from "@/lib/social/blocks";
import { CATEGORIES, socialConfigured } from "@/lib/social/config";
import {
  categoryCounts,
  listThreads,
  listUniversities,
  PAGE_SIZE,
} from "@/lib/social/data";

export default async function SocialHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; deleted?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ threads: all, total, error }, counts, unis, blocks] =
    await Promise.all([
      listThreads({ q, page }),
      categoryCounts(),
      listUniversities(),
      getBlockList(),
    ]);
  const threads = withoutBlocked(all, blocks);

  return (
    <div className="container py-10 lg:py-14">
      {sp.deleted && (
        <p
          role="status"
          className="border-primary mb-8 border-l-2 pl-4 text-sm"
        >
          Your account and posts have been deleted.
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-4xl tracking-tight md:text-5xl">
            Ask people who've been there.
          </h1>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
            Sixth form, universities, applying, apprenticeships and student
            life. Real questions from students, answered by students.
          </p>
        </div>
        <Link
          href="/social/new"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-semibold"
        >
          Start a thread
        </Link>
      </div>

      <section aria-label="Everything in one account" className="mt-9 overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-violet-100 p-6 text-slate-950 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Everything in one account</p>
        <h2 className="mt-2 text-2xl font-bold">Learn, ask, and find your next step.</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "💬", title: "Ask the community", body: "Share questions and read student experiences in moderated threads." },
            { icon: "📚", title: "Revise together", body: "Use the same account for quizzes, study resources and your dashboard." },
            { icon: "🧭", title: "Plan ahead", body: "Explore sixth form, university and apprenticeship conversations." },
            { icon: "🎮", title: "Games coming soon", body: "More playful ways to practise are on the way." },
          ].map((feature) => <article key={feature.title} className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
            <span className="text-3xl" aria-hidden>{feature.icon}</span>
            <h3 className="mt-3 font-bold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-5 text-slate-600">{feature.body}</p>
          </article>)}
        </div>
        <p className="mt-5 text-xs text-slate-600">Profiles use usernames. Your email, school and study details stay private.</p>
        <Link href="/social/friends" className="mt-4 inline-block text-sm font-semibold text-blue-700 underline underline-offset-4">Your friends and requests</Link>
      </section>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="latest">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="latest" className="text-xl font-semibold">
              {q ? `Threads matching “${q}”` : "Latest"}
            </h2>
            <form role="search" className="flex gap-2">
              <label htmlFor="sq" className="sr-only">
                Search thread titles
              </label>
              <input
                id="sq"
                name="q"
                defaultValue={q}
                placeholder="Search threads"
                className="bg-card border-input focus-visible:ring-ring h-9 w-52 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </form>
          </div>
          {error ? (
            <p role="alert" className="text-destructive py-8 text-sm">
              We couldn't load threads right now. Please refresh in a moment.
            </p>
          ) : (
            <ThreadList threads={threads} example={!socialConfigured} />
          )}
          <Pager
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            base={q ? `/social?q=${encodeURIComponent(q)}` : "/social"}
          />
        </section>

        <aside className="space-y-10">
          <section aria-labelledby="cats">
            <h2
              id="cats"
              className="text-muted-foreground mb-2 text-sm font-medium"
            >
              Categories
            </h2>
            <ul className="border-t">
              {CATEGORIES.map((c) => (
                <li key={c.slug} className="border-b">
                  <Link
                    href={`/social/c/${c.slug}`}
                    className="hover:text-primary flex items-baseline justify-between gap-3 py-2.5"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {counts[c.slug] ?? 0}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="unis">
            <h2
              id="unis"
              className="text-muted-foreground mb-2 text-sm font-medium"
            >
              Most discussed universities
            </h2>
            {unis.length ? (
              <ul className="space-y-1.5 text-sm">
                {unis.slice(0, 6).map((u) => (
                  <li key={u.university}>
                    <Link
                      href={`/social/c/universities?u=${encodeURIComponent(u.university)}`}
                      className="hover:text-primary"
                    >
                      {u.university}
                    </Link>
                    <span className="text-muted-foreground"> · {u.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                No universities discussed yet.
              </p>
            )}
            <Link
              href="/social/universities"
              className="text-primary mt-3 inline-block text-sm font-medium"
            >
              All universities
            </Link>
          </section>
          <section className="text-muted-foreground text-sm leading-relaxed">
            <h2 className="text-foreground mb-2 font-semibold">Keep it safe</h2>
            <p>
              Never share your full name, school, phone number or social media.
              Report anything that worries you.
            </p>
            <Link
              href="/social/guidelines"
              className="text-primary mt-2 inline-block font-medium"
            >
              Community guidelines
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
