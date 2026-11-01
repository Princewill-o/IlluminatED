"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { CarFront, Medal, School, ShieldCheck, Trophy, Users } from "lucide-react";

import { SchoolSearch } from "./school-search";

import { type League, type MySchool, mySchool, schoolLeague } from "@/app/games/schools/actions";
import { cn } from "@/lib/utils";

const SUBJECTS = ["All subjects", "Mathematics", "Biology", "Chemistry", "Physics", "Combined Science", "English Language", "History", "Geography", "Computer Science", "Business", "Psychology"];

/**
 * School vs School. Schools earn points through their students' Championship
 * scores and Maths Racing wins. Ranked on the average of each school's top 10
 * active students, with at least 5 needed, and only school names are shown.
 */
export function SchoolLeague() {
  const [subject, setSubject] = useState("All subjects");
  const [league, setLeague] = useState<League | null>(null);
  const [mine, setMine] = useState<MySchool | undefined>(undefined);
  useEffect(() => { void mySchool().then(setMine).catch(() => setMine(null)); }, []);
  useEffect(() => { setLeague(null); void schoolLeague(subject === "All subjects" ? null : subject).then(setLeague).catch(() => setLeague({ week: "", minimum: 5, table: [] })); }, [subject]);

  return (
    <div className="grid gap-6">
      <SchoolSearch />
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2b5fd9] to-[#7a5ce6] p-6 text-white md:p-8">
        <School className="absolute right-4 bottom-2 size-36 text-white/10" aria-hidden />
        <p className="text-xs font-black tracking-[0.3em] text-[#ffe066] uppercase">Weekly season</p>
        <h2 className="mt-2 text-3xl font-black md:text-4xl">School vs School</h2>
        <p className="mt-2 max-w-xl text-white/85">Every Championship point and Maths Racing win you earn this week counts for your school. Ranked fairly: the average of each school&apos;s top 10 students.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/games/championship" className="jelly flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-black text-[#13203a]"><Trophy className="size-4" aria-hidden /> Score in the Championship</Link>
          <Link href="/games/racing" className="jelly flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2.5 text-sm font-black"><CarFront className="size-4" aria-hidden /> Win races</Link>
        </div>
      </section>

      {mine === null && (
        <section className="rounded-[2rem] border-2 border-[#13203a]/10 bg-white p-5">
          <p className="font-black">Your school isn&apos;t on IlluminatED yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Schools join through their teachers, who add students with an invite. Ask your teacher to <Link href="/contact" className="font-bold underline">get in touch</Link>, and you can still race and enter the Championship on your own.</p>
        </section>
      )}
      {mine && (
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            ["Your school", mine.school, School],
            ["Rank this week", mine.score === null || mine.active < 5 ? "Not ranked yet" : `${mine.rank} of ${mine.schools}`, Medal],
            ["Active students", `${mine.active} / 5 needed`, Users],
          ].map(([label, value, Icon]) => {
            const I = Icon as typeof School;
            return <div key={label as string} className="rounded-3xl border-2 border-[#13203a]/10 bg-white p-4"><p className="flex items-center gap-1.5 text-xs font-black tracking-widest text-muted-foreground uppercase"><I className="size-3.5" aria-hidden />{label as string}</p><p className="mt-1 text-xl font-black">{value as string}</p></div>;
          })}
        </section>
      )}

      <section className="rounded-[2rem] border-2 border-[#13203a]/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-black">League table</h3>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject league" className="rounded-full bg-[#f1ede4] px-3 py-2 text-sm font-black">
            {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {!league ? <div className="mt-4 h-40 animate-pulse rounded-2xl bg-[#13203a]/5" /> : !league.table.length ? (
          <p className="mt-4 rounded-2xl bg-[#f7f1e6] p-4 text-sm text-muted-foreground">No school has {league.minimum} active students yet this week. The first school to get there tops the table!</p>
        ) : (
          <ol className="mt-4 grid gap-2">
            {league.table.map((r, i) => (
              <li key={r.school} className={cn("flex items-center gap-3 rounded-2xl bg-[#f7f1e6] p-3", r.mine && "ring-2 ring-[#2b5fd9]")}>
                <span className={cn("grid size-9 place-items-center rounded-full text-sm font-black", i < 3 ? "text-white" : "bg-white")} style={i < 3 ? { background: ["#e0a100", "#8a94a6", "#b26b3a"][i] } : undefined}>{i + 1}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-black">{r.school}{r.mine && <span className="ml-2 text-xs text-[#2b5fd9]">your school</span>}</span><span className="text-xs text-muted-foreground">{r.active} active · {r.wins} race wins</span></span>
                <span className="font-black tabular-nums">{r.score}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> Only students added by their school count, so memberships can&apos;t be faked. A school needs {league?.minimum ?? 5} active students to be ranked. Student names are never shown on school tables.</p>
      </section>
    </div>
  );
}
