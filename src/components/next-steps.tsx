"use client";
import { useEffect, useState } from "react";

import Link from "next/link";

import { ExternalLink, fieldCls, labelCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { useEducationState } from "@/lib/education/use-state";
import {
  OPPORTUNITY_DIRECTORIES,
  type OpportunityFeed,
  type OpportunityKind,
} from "@/lib/opportunities";

type Preference = "university" | "apprenticeship" | "both" | "unsure";
const OPTIONS: { id: Preference; label: string }[] = [
  { id: "university", label: "University" },
  { id: "apprenticeship", label: "An apprenticeship" },
  { id: "both", label: "Explore both" },
  { id: "unsure", label: "I'm not sure yet" },
];
const labels: Record<OpportunityKind, string> = {
  "university-event": "University events",
  apprenticeship: "Apprenticeships",
  "work-experience": "Work experience",
};
const dateLabel = (value: string) =>
  new Date(
    value.includes("T") ? value : value.slice(0, 10) + "T12:00:00Z",
  ).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  });
export function NextSteps({
  userId,
  initialYear = "year-12",
  compact = false,
}: {
  userId?: string;
  initialYear?: string;
  compact?: boolean;
}) {
  const career = useEducationState("career", {
    route: "unsure",
    year: initialYear,
  });
  const preference = career.state.route as Preference;
  const setPreference = (value: Preference) => career.setItem("route", value);
  const year = career.state.year as string;
  const setYear = (value: string) => career.setItem("year", value);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<OpportunityKind | "all">("all");
  const opportunities = useEducationState("saved-opportunities");
  const saved = Object.keys(opportunities.state).filter(
    (id) => opportunities.state[id] === true,
  );
  const [savedOnly, setSavedOnly] = useState(false);
  const [feed, setFeed] = useState<OpportunityFeed | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    setBusy(true);
    setError(false);
    fetch("/api/opportunities", { signal: ctrl.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Unavailable");
        const data = (await r.json()) as OpportunityFeed;
        if (!Array.isArray(data.items) || !Array.isArray(data.sources))
          throw new Error("Invalid feed");
        setFeed(data);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setBusy(false);
      });
    return () => ctrl.abort();
  }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(
      () => {
        if (document.visibilityState === "visible") setRefresh((n) => n + 1);
      },
      15 * 60 * 1000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const university = preference !== "apprenticeship";
  const apprenticeships = preference !== "university";
  const items = (feed?.items ?? []).filter(
    (i) =>
      (kind === "all" || i.kind === kind) &&
      (!savedOnly || saved.includes(i.id)) &&
      `${i.title} ${i.provider} ${i.location} ${i.summary}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const toggle = (id: string) => opportunities.setItem(id, !saved.includes(id));
  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-xl font-semibold">
          What would you like to do after your course?
        </legend>
        <p className="text-muted-foreground mt-2 text-sm">
          You can change your mind. {career.message}
        </p>
        {career.status === "offline" && (
          <button
            onClick={career.retry}
            className="text-primary text-sm underline"
          >
            Retry account sync
          </button>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {OPTIONS.map((o) => (
            <label
              className={`cursor-pointer rounded-xl border p-4 text-sm ${preference === o.id ? "border-primary bg-primary/5" : "bg-card"}`}
              key={o.id}
            >
              <input
                type="radio"
                name={`next-route-${userId ?? "guest"}`}
                value={o.id}
                checked={preference === o.id}
                onChange={() => setPreference(o.id)}
                disabled={career.status === "loading"}
                className="mr-2"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      {compact ? (
        <Link
          className="text-primary inline-block font-medium underline"
          href="/next-steps"
        >
          Find work experience, events and your next steps →
        </Link>
      ) : (
        <>
          <div>
            <label className={labelCls} htmlFor="next-year">
              Your year
            </label>
            <select
              id="next-year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={career.status === "loading"}
              className={`${fieldCls} max-w-xs`}
            >
              <option value="year-11">Year 11</option>
              <option value="year-12">Year 12</option>
              <option value="year-13">Year 13</option>
              <option value="other">Another year / adult learner</option>
            </select>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {university && (
              <div className="bg-card rounded-xl border p-5">
                <h3 className="text-lg font-semibold">Explore university</h3>
                <ol className="text-muted-foreground mt-3 list-decimal space-y-2 pl-5 text-sm">
                  <li>
                    Compare courses and entry requirements, including any
                    required subjects.
                  </li>
                  <li>
                    Attend an open day or subject taster and prepare questions.
                  </li>
                  <li>
                    Keep notes on what you learn from projects, reading and work
                    experience.
                  </li>
                  <li>
                    Check the UCAS deadlines for your entry year and course.
                  </li>
                </ol>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <ExternalLink href="https://digital.ucas.com/search">
                    Find university courses
                  </ExternalLink>
                  <ExternalLink href="https://www.ucas.com/applying/applying-university/dates-and-deadlines-for-uni-applications">
                    Application dates and deadlines
                  </ExternalLink>
                </div>
              </div>
            )}
            {apprenticeships && (
              <div className="bg-card rounded-xl border p-5">
                <h3 className="text-lg font-semibold">
                  Explore apprenticeships
                </h3>
                <ol className="text-muted-foreground mt-3 list-decimal space-y-2 pl-5 text-sm">
                  <li>
                    Choose job areas you want to explore; compare training
                    levels.
                  </li>
                  <li>
                    Check individual employers&apos; qualifications, location,
                    pay and start dates.
                  </li>
                  <li>
                    Build a CV with examples of teamwork, problem-solving and
                    practical skills.
                  </li>
                  <li>
                    Apply before each vacancy closes; there isn&apos;t one
                    shared deadline.
                  </li>
                </ol>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <Link
                    className="text-primary underline"
                    href="/careers#explore"
                  >
                    Explore training standards
                  </Link>
                  <ExternalLink href="https://www.findapprenticeship.service.gov.uk/">
                    Find current vacancies
                  </ExternalLink>
                </div>
              </div>
            )}
          </div>
          <div className="bg-secondary/50 rounded-xl border p-5">
            <h3 className="text-lg font-semibold">
              {year === "year-12"
                ? "Your Year 12 work-experience plan"
                : "Build experience before applying"}
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
              <li>Pick two or three sectors you&apos;d like to try.</li>
              <li>
                Ask your school&apos;s careers lead about placement dates,
                approved employers and local contacts.
              </li>
              <li>
                Browse virtual programmes and employer placements below. Check
                age limits, travel, costs and application deadlines.
              </li>
              <li>
                Prepare a short CV and a message explaining your interests,
                available dates and what you hope to learn.
              </li>
              <li>
                Afterwards, record your tasks, feedback and new skills for
                future applications.
              </li>
            </ol>
            <p className="text-muted-foreground mt-4 text-sm">
              Virtual experiences can help you explore a career; check with your
              school or course provider whether they meet any placement
              requirement. For under-18 placements, involve your school and
              parent or guardian.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold">
              Upcoming events and apprenticeship adverts
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Connected feeds refresh hourly when visited; this page checks for
              updates every 15 minutes while open. Events are from the listed
              providers, rather than every UK organiser. Always confirm
              availability and eligibility on the source page.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-[2fr_1fr_auto]">
              <div>
                <label htmlFor="opp-search" className={labelCls}>
                  Keyword, employer or location
                </label>
                <input
                  id="opp-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={fieldCls}
                  placeholder="e.g. computing, online, London"
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="opp-kind">
                  Opportunity type
                </label>
                <select
                  id="opp-kind"
                  className={fieldCls}
                  value={kind}
                  onChange={(e) =>
                    setKind(e.target.value as OpportunityKind | "all")
                  }
                >
                  <option value="all">All types</option>
                  {Object.entries(labels).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                className="self-end"
                disabled={busy}
                onClick={() => setRefresh((n) => n + 1)}
              >
                {busy ? "Checking…" : "Check for updates"}
              </Button>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={savedOnly}
                onChange={(e) => setSavedOnly(e.target.checked)}
              />
              Show saved opportunities
            </label>
            <p className="text-muted-foreground mt-2 text-sm" role="status">
              {opportunities.message}
            </p>
            {opportunities.status === "offline" && (
              <button
                onClick={opportunities.retry}
                className="text-primary text-sm underline"
              >
                Retry account sync
              </button>
            )}
            <div aria-live="polite" className="mt-4">
              {error && (
                <p className="text-destructive text-sm">
                  Updates couldn&apos;t be loaded. Try again or use the provider
                  directories below.
                </p>
              )}
              {feed && !items.length && (
                <p className="text-muted-foreground text-sm">
                  No matching upcoming listings from the connected feeds. Try
                  another filter or browse the provider directories below.
                </p>
              )}
              {items.length > 0 && (
                <ul className="grid gap-4 md:grid-cols-2">
                  {items.map((i) => (
                    <li className="bg-card rounded-xl border p-5" key={i.id}>
                      <span className="text-muted-foreground text-xs">
                        {labels[i.kind]} · {i.provider}
                      </span>
                      <h4 className="mt-2 font-semibold">
                        <ExternalLink href={i.url}>{i.title}</ExternalLink>
                      </h4>
                      <p className="mt-2 text-sm">
                        {i.location}
                        {i.date && ` · ${dateLabel(i.date)}`}
                        {i.closes && ` · Apply by ${dateLabel(i.closes)}`}
                      </p>
                      <p className="text-muted-foreground mt-2 text-sm">
                        {i.summary}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-muted-foreground text-xs">
                          Source checked {dateLabel(i.checkedAt)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-pressed={saved.includes(i.id)}
                          onClick={() => toggle(i.id)}
                          disabled={opportunities.status === "loading"}
                        >
                          {saved.includes(i.id) ? "Saved" : "Save"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {feed && (
              <ul className="text-muted-foreground mt-5 space-y-1 text-xs">
                {feed.sources.map((s) => (
                  <li key={s.name}>
                    {s.name}:{" "}
                    {s.status === "live"
                      ? `source checked ${s.checkedAt ? dateLabel(s.checkedAt) : "recently"}`
                      : s.status === "cached"
                        ? `stored listing; live source unavailable (checked ${s.checkedAt ? dateLabel(s.checkedAt) : "previously"})`
                        : s.status === "not-configured"
                          ? "adverts aren't connected yet; use the official vacancy search below"
                          : "source temporarily unavailable"}
                    .
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-xl font-semibold">
              Work experience and more opportunities
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              These links open providers&apos; own updating directories. They
              are discovery sources, not individual placements or confirmed
              offers.
            </p>
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {OPPORTUNITY_DIRECTORIES.filter(
                (d) =>
                  d.kind === "work-experience" ||
                  (d.kind === "university-event" && university) ||
                  (d.kind === "apprenticeship" && apprenticeships),
              ).map((d) => (
                <li className="rounded-xl border p-5" key={d.id}>
                  <span className="text-muted-foreground text-xs">
                    {d.provider}
                  </span>
                  <h4 className="mt-1 font-semibold">
                    <ExternalLink href={d.url}>{d.title}</ExternalLink>
                  </h4>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {d.summary}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
