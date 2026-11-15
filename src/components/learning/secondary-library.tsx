"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import styles from "./subjects.module.css";

import type { SubjectProduct } from "@/lib/learning/packs";
import {
  secondaryPage,
  secondaryRequests,
  secondarySelection,
  SECONDARY_STRANDS,
  SECONDARY_YEARS,
  type SecondaryYear,
} from "@/lib/learning/secondary-curriculum";
import {
  gradeSecondaryPractice,
  secondaryPractice,
} from "@/lib/learning/secondary-practice";


type Page = ReturnType<typeof secondaryPage>;
type Load = { key: string; page?: Page; error?: string };
const input =
  "min-h-11 rounded-xl border border-current/30 bg-white px-3 text-[#1d1a4a] dark:bg-[#211c4d] dark:text-white";

export function SecondaryLibrary({ product }: { product: SubjectProduct }) {
  const [year, setYear] = useState<SecondaryYear>(7);
  const [strand, setStrand] = useState("all");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [number, setNumber] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Load | null>(null);
  const selection = useMemo(
    () => secondarySelection(product, { year, strand, query, page: number }),
    [product, year, strand, query, number],
  );
  const request = useMemo(() => secondaryRequests(selection)[0], [selection]);
  const key = `${request.url}:${attempt}`;
  const current = loaded?.key === key ? loaded : null;
  const warmup = secondaryPractice(product, year, strand);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), 12000);
    void (async () => {
      try {
        const response = await fetch(request.url, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("The lesson library is temporarily unavailable.");
        const result = secondaryPage(await response.json(), selection, request);
        if (!controller.signal.aborted) setLoaded({ key, page: result });
      } catch {
        if (
          !controller.signal.aborted ||
          controller.signal.reason === "timeout"
        )
          setLoaded({
            key,
            error:
              "The lesson library could not load. Retry or start the warm-up below.",
          });
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [key, request, selection]);

  const resetSearch = () => {
    setDraft("");
    setQuery("");
    setNumber(1);
  };

  return (
    <section id="years-7-to-11" className={styles.section}>
      <p className={styles.eyebrow}>Secondary support</p>
      <h2>Choose your year</h2>
      <p>
        Use a short warm-up to practise a skill, or find a lesson in the Oak
        National Academy library.
      </p>
      <div
        className="mt-4 flex flex-wrap gap-2"
        role="group"
        aria-label="School year"
      >
        {SECONDARY_YEARS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={year === item}
            className={year === item ? styles.button : styles.secondary}
            onClick={() => {
              setYear(item);
              resetSearch();
            }}
          >
            Year {item}
          </button>
        ))}
      </div>
      <p className="mt-3 font-semibold">
        Year {year} · {year <= 9 ? "Key Stage 3" : "Key Stage 4 / GCSE"}
      </p>
      {SECONDARY_STRANDS[product].length > 1 && (
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Subject area"
        >
          {SECONDARY_STRANDS[product].map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={strand === item.id}
              className={strand === item.id ? styles.button : styles.secondary}
              onClick={() => {
                setStrand(item.id);
                resetSearch();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <Warmup key={warmup.id} practice={warmup} />
      <div className="mt-9">
        <h3 className="text-2xl font-black">Year {year} lesson library</h3>
        {product === "english" && strand !== "all" && (
          <p className="text-sm">
            Showing topic matches from the shared English library.
          </p>
        )}
        {product === "science" && year >= 10 && (
          <p className="text-sm">
            Showing {request.label}. Check the lesson against your school’s
            course.
          </p>
        )}
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(draft.trim());
            setNumber(1);
          }}
        >
          <input
            className={`${input} min-w-40 flex-1`}
            aria-label="Search lesson titles"
            placeholder="Search lesson titles"
            value={draft}
            maxLength={100}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className={styles.button}>
            Search
          </button>
          {query && (
            <button
              type="button"
              className={styles.secondary}
              onClick={resetSearch}
            >
              Clear search
            </button>
          )}
        </form>
        {!current && (
          <p className="mt-4" role="status">
            Loading Year {year} lessons…
          </p>
        )}
        {current?.error && (
          <div className="mt-4">
            <p role="alert">{current.error}</p>
            <button
              className={styles.secondary}
              type="button"
              onClick={() => setAttempt((old) => old + 1)}
            >
              Retry lessons
            </button>
          </div>
        )}
        {current?.page && (
          <>
            <p className="mt-4 text-sm" role="status">
              {current.page.total
                ? `${current.page.total} lesson listings · Page ${number}`
                : "No lesson titles matched. Try a different search or topic."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {current.page.lessons.map((lesson) => (
                <article
                  className="flex flex-col rounded-2xl border border-current/25 p-4"
                  key={lesson.slug}
                >
                  <p className="text-xs font-semibold">
                    {lesson.unit_title} · Year {year}
                  </p>
                  <h4 className="mt-2 flex-1 text-lg font-bold">
                    {lesson.title}
                  </h4>
                  <Link
                    className="mt-3 flex min-h-11 items-center font-bold underline underline-offset-4"
                    href={`/curriculum/${lesson.slug}`}
                    prefetch={false}
                  >
                    {lesson.restricted
                      ? "View lesson listing"
                      : "Open lesson and recall practice"}{" "}
                    →
                  </Link>
                </article>
              ))}
            </div>
            {current.page.total > 0 && current.page.lessons.length === 0 && (
              <p>No usable lessons on this page. Try clearing the search.</p>
            )}
            <nav aria-label="Lesson pages" className="mt-5 flex gap-2">
              {number > 1 && (
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setNumber((old) => old - 1)}
                >
                  ← Previous page
                </button>
              )}
              {current.page.hasNext && (
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setNumber((old) => old + 1)}
                >
                  Next page →
                </button>
              )}
            </nav>
          </>
        )}
        <p className="mt-4 text-xs">
          Lesson data from Oak National Academy. Each lesson includes its
          source, licence and access details.
        </p>
      </div>
    </section>
  );
}

function Warmup({
  practice,
}: {
  practice: ReturnType<typeof secondaryPractice>;
}) {
  const [answers, setAnswers] = useState(() =>
    practice.questions.map(() => -1),
  );
  const [result, setResult] = useState<ReturnType<
    typeof gradeSecondaryPractice
  > | null>(null);
  return (
    <div className="mt-5 rounded-2xl border border-current/25 bg-white/65 p-4 sm:p-6 dark:bg-white/5">
      <p className={styles.eyebrow}>Original IllumED warm-up</p>
      <h3 className="text-xl font-black">{practice.title}</h3>
      {practice.extract && (
        <blockquote className={styles.quote}>{practice.extract}</blockquote>
      )}
      <details className="my-3">
        <summary className="min-h-10 cursor-pointer font-bold">
          Show a worked example
        </summary>
        <ol className="list-decimal space-y-2 pl-6">
          {practice.worked.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-2 font-semibold">{practice.worked.answer}</p>
      </details>
      <details className="my-3">
        <summary className="min-h-10 cursor-pointer font-bold">
          Get a hint
        </summary>
        <p>{practice.hint}</p>
        <p>
          <strong>Common mistake:</strong> {practice.misconception}
        </p>
      </details>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setResult(gradeSecondaryPractice(practice, answers));
        }}
      >
        {practice.questions.map((question, index) => (
          <fieldset
            key={question.prompt}
            className="rounded-xl border border-current/20 px-4 pb-3"
          >
            <legend className="px-1 font-bold">{question.prompt}</legend>
            {question.options.map((option, i) => (
              <label key={option} className="flex min-h-10 items-center gap-2">
                <input
                  type="radio"
                  name={`warm-up-${index}`}
                  required
                  checked={answers[index] === i}
                  onChange={() => {
                    setResult(null);
                    setAnswers((old) =>
                      old.map((value, j) => (j === index ? i : value)),
                    );
                  }}
                />
                {option}
              </label>
            ))}
            {result && (
              <p className={styles.feedback}>
                <strong>
                  {result.checks[index].correct ? "Correct. " : "Try again. "}
                </strong>
                {result.checks[index].explanation}
              </p>
            )}
          </fieldset>
        ))}
        <button type="submit" className={`${styles.button} justify-self-start`}>
          Check warm-up
        </button>
        {result && (
          <p role="status">
            {result.score} of {practice.questions.length} correct.
          </p>
        )}
      </form>
      {practice.writing && (
        <details className="mt-5">
          <summary className="min-h-10 cursor-pointer font-bold">
            Write and compare an interpretation
          </summary>
          <label className="block font-semibold" htmlFor="warm-up-writing">
            Explain a choice the writer made. Then consider another credible
            reading.
          </label>
          <textarea
            id="warm-up-writing"
            className={`${input} mt-2 w-full py-2`}
            rows={4}
            maxLength={2000}
          />
          <p className="mt-3 font-bold">Check your draft</p>
          <ul>
            {practice.writing.checks.map((check) => (
              <li key={check}>
                <label className="flex min-h-9 items-center gap-2">
                  <input type="checkbox" />
                  {check}
                </label>
              </li>
            ))}
          </ul>
          <details className="mt-3">
            <summary className="min-h-10 cursor-pointer font-bold">
              Compare with one model answer
            </summary>
            <p>{practice.writing.model}</p>
          </details>
        </details>
      )}
    </div>
  );
}
