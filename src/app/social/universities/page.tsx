import Link from "next/link";

import type { Metadata } from "next";

import { UniversityFilter } from "@/components/social/university-filter";
import { listUniversities } from "@/lib/social/data";

export const metadata: Metadata = {
  title: "Universities",
  description: "Find what students are saying about each university.",
};

export default async function UniversitiesPage() {
  const unis = await listUniversities();
  return (
    <div className="container py-10 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b pb-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl tracking-tight">Universities</h1>
          <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
            Every university people are talking about. Choose one to read what
            students think, or ask your own question.
          </p>
        </div>
        <Link
          href="/social/new?category=universities"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-semibold"
        >
          Ask about a university
        </Link>
      </div>
      <div className="mt-8">
        <UniversityFilter unis={unis} />
      </div>
      <p className="text-muted-foreground mt-10 max-w-2xl text-sm leading-relaxed">
        Posts here are personal views from members. For official course data,
        including student satisfaction and graduate outcomes, see{" "}
        <a
          href="https://discoveruni.gov.uk/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4"
        >
          Discover Uni
        </a>
        .
      </p>
    </div>
  );
}
