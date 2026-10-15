import Link from "next/link";

import type { Metadata } from "next";

import { listOrgs, sectorLabel } from "@/lib/employers/server";

export const metadata: Metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const orgs = await listOrgs();
  return (
    <div className="mx-auto max-w-4xl px-4 pt-5 pb-10 md:pt-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Companies</h1>
      <p className="text-muted-foreground mt-2">
        Verified employers on IlluminatED. Read their advice, visit their office on Careers Campus and book office hours.
      </p>
      <Link href="/games/world?map=campus" className="mt-5 inline-block rounded-full bg-[#c6f36b] px-5 py-3 font-black text-[#0b0910]">
        🏢 Walk around Careers Campus
      </Link>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {orgs.length === 0 && (
          <li className="bg-card rounded-3xl border p-6 text-sm">
            No companies yet. Work somewhere great?{" "}
            <Link href="/employers" className="text-primary font-bold">
              Bring your company to IlluminatED
            </Link>
            .
          </li>
        )}
        {orgs.map((o) => (
          <li key={o.id}>
            <Link href={`/companies/${o.slug}`} className="bg-card flex items-center gap-4 rounded-3xl border p-4 transition active:scale-[0.98]">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-lg font-black text-[#0b0910]" style={{ background: o.accent }}>
                {o.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-extrabold">{o.name} <span className="text-ink-sky">✓</span></span>
                <span className="text-muted-foreground block text-sm">{sectorLabel(o.sector)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
