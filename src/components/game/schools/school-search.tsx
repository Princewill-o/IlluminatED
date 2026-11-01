"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { searchEventSchools } from "@/app/games/events/actions";

export function SchoolSearch() {
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<{ name: string }[]>([]);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let active = true;
    setSchools([]); setStatus("");
    const timer = setTimeout(() => {
      if (query.trim().length < 2) return;
      setStatus("Searching…");
      void searchEventSchools(query).then(rows => { if (active) { setSchools(rows); setStatus(rows.length ? "" : "No participating school found. Ask your teacher to register your school."); } }).catch(() => { if (active) setStatus("Search is unavailable. Try again shortly."); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  return <section className="rounded-3xl border bg-card p-5 text-card-foreground"><h3 className="text-xl font-black">Find your school</h3><label className="mt-3 block text-sm font-bold">Participating school name<input value={query} maxLength={80} onChange={e => setQuery(e.target.value)} className="mt-1 block w-full rounded-xl border bg-background p-3" placeholder="Type at least two letters" /></label><p role="status" className="mt-2 text-sm">{status}</p><ul className="mt-3 grid gap-2">{schools.map(s => <li key={s.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary p-3"><strong>{s.name}</strong><Link href="/contact?subject=school-membership" className="text-sm font-bold underline">Request a teacher invite</Link></li>)}</ul><p className="mt-3 text-sm text-muted-foreground">Search is public. Membership and school scoring are confirmed by your teacher, so searching or selecting a school never changes your verified school.</p></section>;
}
