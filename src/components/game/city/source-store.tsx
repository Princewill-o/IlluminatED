"use client";
import { useEffect, useState } from "react";

import Link from "next/link";

import {
  providersForBoard,
  PROVIDERS_REVIEWED_AT,
} from "@/lib/education/providers";
import { LEARNING_SOURCES } from "@/lib/education/source-registry";
interface StoreData {
  notice: string;
  oakQuizEnabled: boolean;
  groundingStatus: string;
  sources: {
    id: string;
    freshness: string;
    check: {
      available: boolean;
      attemptedAt: string;
      lastReachableAt: string | null;
    } | null;
  }[];
  curriculum: {
    programmes: {
      slug: string;
      title?: string;
      subject: string;
      year: number;
      board: string;
      tier: string;
      sourceUrl: string;
      checkedAt: string;
      freshness: string;
      units: { title: string; lessons: { slug: string; title: string }[] }[];
    }[];
    syllabuses: {
      code: string;
      board: string;
      url: string;
      checkedAt: string;
      freshness: string;
    }[];
  } | null;
  questions: {
    key: string;
    prompt: string;
    options: string[];
    answer: number;
    explain: string;
  }[];
}
export function SourceStore({
  courses,
}: {
  courses: { id: string; title: string }[];
}) {
  const [course, setCourse] = useState(courses[0]?.id ?? "gcse-maths");
  const [year, setYear] = useState("11");
  const [board, setBoard] = useState("");
  const [data, setData] = useState<StoreData | null>(null);
  const [error, setError] = useState(false);
  const [choices, setChoices] = useState<Record<string, number>>({});
  useEffect(() => {
    const abort = new AbortController();
    setData(null);
    setError(false);
    setChoices({});
    fetch(
      `/api/education/store?course=${encodeURIComponent(course)}&year=${year}`,
      { signal: abort.signal },
    )
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => abort.abort();
  }, [course, year]);
  return (
    <>
      <div className="bg-card mb-6 grid gap-4 rounded-2xl border p-5 sm:grid-cols-2">
        <label className="text-sm font-bold">
          Qualification and subject
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="bg-background mt-2 block min-h-11 w-full rounded-xl border px-3"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          Resource year
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="bg-background mt-2 block min-h-11 w-full rounded-xl border px-3"
          >
            {[7, 8, 9, 10, 11, 12, 13].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!data && (
        <p role="status" className="mb-5">
          {error
            ? "The source store is temporarily unavailable. Official publisher links below still work."
            : "Loading source dates and learning resources…"}
        </p>
      )}
      {data && (
        <>
          <p className="text-muted-foreground mb-5 text-sm leading-6">
            {data.notice}
          </p>
          <section className="bg-card mb-7 rounded-2xl border p-5">
            <h2 className="text-xl font-black">
              Year {year} learning resources
            </h2>
            {!data.curriculum?.programmes.length && (
              <p className="text-muted-foreground mt-3 text-sm">
                No indexed lessons match this course and year. Use the course
                page and official specification; we do not substitute a
                different year’s lessons.
              </p>
            )}
            {data.curriculum?.programmes.map((p) => (
              <details key={p.slug} className="mt-4 rounded-xl border p-4">
                <summary className="cursor-pointer font-bold">
                  {p.subject} · Year {p.year} ·{" "}
                  {p.board || "Board not specified"} · {p.tier || "All tiers"}
                </summary>
                <p className="mt-2 text-xs">
                  Metadata checked {p.checkedAt} · {p.freshness}
                </p>
                <a
                  className="mt-2 inline-block text-sm underline"
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open publisher programme ↗
                </a>
                {p.units.slice(0, 8).map((u) => (
                  <div key={u.title} className="mt-4">
                    <p className="text-sm font-bold">{u.title}</p>
                    {u.lessons.slice(0, 3).map((l) => (
                      <Link
                        key={l.slug}
                        href={`/learn/${l.slug}`}
                        className="text-primary mt-1 block min-h-9 text-sm underline"
                      >
                        {l.title} →
                      </Link>
                    ))}
                  </div>
                ))}
              </details>
            ))}
            <p className="text-muted-foreground mt-4 text-xs">
              {data.oakQuizEnabled
                ? "Authorised Oak question API is configured."
                : "In-app Oak quizzes need an OAK_API_KEY. Publisher lesson links remain available."}
            </p>
            <Link
              href={`/courses/${course}`}
              className="text-primary mt-3 inline-block min-h-11 font-bold underline"
            >
              Course notes, specification and study sequence →
            </Link>
          </section>
        </>
      )}
      <section className="my-8" aria-labelledby="provider-coverage">
        <h2 id="provider-coverage" className="text-2xl font-black">
          UK board & provider coverage
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Reviewed {PROVIDERS_REVIEWED_AT}. No single provider here covers every
          UK board and qualification. These are verified services and source
          links; a link does not mean its questions have been imported or
          licensed for this platform.
        </p>
        {data && (
          <p role="status" className="mt-3 rounded-xl border p-4 text-sm">
            {data.groundingStatus}
          </p>
        )}
        <label className="mt-5 block max-w-md text-sm font-bold">
          Show providers for
          <select
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            className="bg-background mt-2 block min-h-11 w-full rounded-xl border px-3"
          >
            {[
              ["", "All listed boards"],
              ["aqa", "AQA"],
              ["pearson", "Pearson Edexcel / BTEC"],
              ["ocr", "Cambridge OCR"],
              ["wjec", "WJEC / Eduqas"],
              ["ccea", "CCEA"],
              ["qualifications-scotland", "Qualifications Scotland"],
              ["ncfe", "NCFE / CACHE"],
              ["cityguilds", "City & Guilds"],
              ["aat", "AAT"],
              ["cilex", "CILEX"],
            ].map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {providersForBoard(board || null).map((p) => (
            <article key={p.id} className="bg-card rounded-2xl border p-5">
              <p className="text-primary text-xs font-bold">
                {p.mode === "api"
                  ? "Documented curriculum API"
                  : "Publisher service · link only"}
              </p>
              <h3 className="mt-2 text-xl font-black">{p.name}</h3>
              <p className="mt-2 text-xs font-bold">
                {p.regions.join(" · ")} · {p.access}
              </p>
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                {p.coverage}
              </p>
              <p className="text-muted-foreground mt-3 text-xs leading-5">
                {p.reuse}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold">
                <a
                  className="inline-flex min-h-11 items-center underline"
                  href={p.resources}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Official materials ↗
                </a>
                <a
                  className="inline-flex min-h-11 items-center underline"
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Provider details ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
      <h2 className="mb-4 text-2xl font-black">
        Reference library & official papers
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {LEARNING_SOURCES.map((s) => {
          const status = data?.sources.find((x) => x.id === s.id);
          return (
            <article key={s.id} className="bg-card rounded-2xl border p-5">
              <p className="text-primary text-xs font-bold">{s.provider}</p>
              <h3 className="mt-2 text-lg font-black">{s.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {s.purpose}
              </p>
              <p className="mt-3 text-xs">
                {status?.check
                  ? `${status.check.available ? "Reachable" : "Link check failed — may still open in your browser"} · checked ${status.check.attemptedAt.slice(0, 10)} · ${status.freshness}`
                  : "Link not checked yet"}
              </p>
              <a
                className="mt-3 inline-block min-h-11 text-sm font-bold underline"
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open official source ↗
              </a>
            </article>
          );
        })}
      </div>
      {!!data?.questions.length && (
        <section className="mt-8">
          <h2 className="text-2xl font-black">
            Original question & answer practice
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            These questions follow the selected course. Year selection filters
            publisher lessons above; it does not certify these questions for a
            particular year or exam board. No Clout or scored study progress is
            awarded here.
          </p>
          <div className="mt-4 space-y-4">
            {data.questions.slice(0, 5).map((q) => (
              <fieldset key={q.key} className="rounded-2xl border p-5">
                <legend className="px-2 font-bold">{q.prompt}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((o, i) => (
                    <button
                      key={o}
                      className={`min-h-11 rounded-xl border p-3 text-left text-sm ${choices[q.key] === i ? "border-primary bg-primary/10" : ""}`}
                      onClick={() => setChoices((c) => ({ ...c, [q.key]: i }))}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                {choices[q.key] !== undefined && (
                  <p role="status" className="mt-4 text-sm leading-6">
                    <strong>
                      {choices[q.key] === q.answer
                        ? "Correct. "
                        : `Answer: ${q.options[q.answer]}. `}
                    </strong>
                    {q.explain}
                  </p>
                )}
              </fieldset>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
