import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { Pager, ThreadList } from "@/components/social/thread-list";
import {
  type CategorySlug,
  categoryBySlug,
  socialConfigured,
} from "@/lib/social/config";
import { listThreads, PAGE_SIZE } from "@/lib/social/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const c = categoryBySlug((await params).slug);
  return c ? { title: c.name, description: c.description } : {};
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ u?: string; page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const c = categoryBySlug(slug);
  if (!c) notFound();
  const university = slug === "universities" ? (sp.u ?? "").slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { threads, total, error } = await listThreads({
    category: c.slug as CategorySlug,
    university: university || undefined,
    page,
  });
  const newHref = `/social/new?category=${c.slug}${university ? `&university=${encodeURIComponent(university)}` : ""}`;

  return (
    <div className="container py-10 lg:py-14">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground mb-5 text-sm"
      >
        <Link href="/social" className="hover:text-foreground">
          Forum
        </Link>{" "}
        /{" "}
        {university ? (
          <Link href={`/social/c/${c.slug}`} className="hover:text-foreground">
            {c.name}
          </Link>
        ) : (
          <span className="text-foreground">{c.name}</span>
        )}
        {university && (
          <>
            {" "}
            / <span className="text-foreground">{university}</span>
          </>
        )}
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b pb-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl tracking-tight">{university || c.name}</h1>
          <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
            {university
              ? `What students are saying about ${university}.`
              : c.description}
          </p>
        </div>
        <Link
          href={newHref}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-semibold"
        >
          Start a thread
        </Link>
      </div>
      {slug === "universities" && (
        <form className="mt-8 flex max-w-md gap-2" role="search">
          <label htmlFor="u" className="sr-only">
            Filter by university
          </label>
          <input
            id="u"
            name="u"
            defaultValue={university}
            placeholder="Filter by university, e.g. University of Leeds"
            className="bg-card border-input focus-visible:ring-ring h-10 flex-1 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          />
          <button className="border-input rounded-md border px-3 text-sm font-medium">
            Filter
          </button>
        </form>
      )}
      <div className="mt-8">
        {error ? (
          <p role="alert" className="text-destructive py-8 text-sm">
            We couldn't load threads right now. Please refresh in a moment.
          </p>
        ) : (
          <ThreadList
            threads={threads}
            showCategory={false}
            example={!socialConfigured}
          />
        )}
        <Pager
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          base={`/social/c/${c.slug}${university ? `?u=${encodeURIComponent(university)}` : ""}`}
        />
      </div>
    </div>
  );
}
