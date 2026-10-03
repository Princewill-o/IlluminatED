"use client";
import { useEffect, useState } from "react";

import Link from "next/link";

import { fieldCls, labelCls } from "@/components/kit";
import {
  INTERESTS,
  universityMatches,
  type JobAdvert,
} from "@/lib/career-guidance";
import { useEducationState } from "@/lib/education/use-state";
import type { OpportunityFeed } from "@/lib/opportunities";

type Jobs = { status: string; items: JobAdvert[]; checkedAt: string | null };
export function CareerBoard({
  initialInterest,
  initialRoute,
}: {
  initialInterest: string;
  initialRoute: string;
}) {
  const [interest, setInterest] = useState(initialInterest);
  const [region, setRegion] = useState("any");
  const [mode, setMode] = useState("either");
  const [route, setRoute] = useState(initialRoute);
  const [keywords, setKeywords] = useState(
    initialInterest === "other" ? "" : initialInterest,
  );
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState({ q: keywords, location: "" });
  const [type, setType] = useState("all");
  const [jobs, setJobs] = useState<Jobs | null>(null);
  const [apprentices, setApprentices] = useState<OpportunityFeed | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const saved = useEducationState("saved-opportunities");
  useEffect(() => {
    const interval = setInterval(
      () => setRefresh((n) => n + 1),
      15 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError(false);
    setJobs(null);
    setApprentices(null);
    (async () => {
      const results = await Promise.allSettled([
        fetch(`/api/jobs?${new URLSearchParams(query)}`, {
          signal: controller.signal,
        }).then(async (r) => {
          const data = await r.json();
          if (r.status === 400) throw new Error();
          return data as Jobs;
        }),
        fetch("/api/opportunities", { signal: controller.signal }).then((r) => {
          if (!r.ok) throw new Error();
          return r.json() as Promise<OpportunityFeed>;
        }),
      ]);
      if (controller.signal.aborted) return;
      if (results[0].status === "fulfilled") setJobs(results[0].value);
      else setError(true);
      if (results[1].status === "fulfilled") setApprentices(results[1].value);
      else setError(true);
      setBusy(false);
    })();
    return () => controller.abort();
  }, [query, refresh]);
  const matches = universityMatches(interest, region, mode);
  const listings = [
    ...(jobs?.items ?? []).map((j) => ({
      ...j,
      kind: "job",
      detail: "Check experience requirements and current availability on Reed.",
    })),
    ...(apprentices?.items ?? [])
      .filter((a) => a.kind === "apprenticeship")
      .filter(
        (a) =>
          `${a.title} ${a.provider} ${a.summary}`
            .toLowerCase()
            .includes(query.q.toLowerCase()) &&
          a.location.toLowerCase().includes(query.location.toLowerCase()),
      )
      .map((a) => ({
        id: a.id,
        title: a.title,
        employer: a.provider,
        location: a.location,
        url: a.url,
        summary: a.summary,
        kind: "apprenticeship",
        detail: `Apply by ${a.closes?.slice(0, 10) ?? "see advert"}`,
      })),
  ].filter((j) => type === "all" || j.kind === type);
  const saveButton = (id: string) => (
    <button
      type="button"
      className="text-primary mt-3 rounded border px-3 py-1 text-sm"
      disabled={saved.status === "loading"}
      aria-pressed={saved.state[id] === true}
      onClick={() => saved.setItem(id, saved.state[id] !== true)}
    >
      {saved.state[id] === true ? "Saved — remove" : "Save"}
    </button>
  );
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border p-5">
        <h2 className="text-2xl">Choose your direction</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Starting with your study profile. Change these exploration filters to
          compare another path.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Pathway
            <select
              className={fieldCls}
              value={route}
              onChange={(e) => setRoute(e.target.value)}
            >
              <option value="unsure">Still deciding</option>
              <option value="both">Compare both</option>
              <option value="university">University</option>
              <option value="apprenticeship">Apprenticeship and work</option>
            </select>
          </label>
          <label className={labelCls}>
            Subject interest
            <select
              className={fieldCls}
              value={interest}
              onChange={(e) => {
                setInterest(e.target.value);
                setKeywords(e.target.value === "other" ? "" : e.target.value);
              }}
            >
              {INTERESTS.map((i) => (
                <option key={i} value={i}>
                  {i === "other"
                    ? "Another subject / still exploring"
                    : i[0].toUpperCase() + i.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-muted-foreground mt-3 text-sm" role="status">
          {saved.message}
        </p>
        {saved.status === "offline" && (
          <button
            className="text-primary text-sm underline"
            onClick={saved.retry}
          >
            Retry saving
          </button>
        )}
      </section>
      <section aria-labelledby="jobs-title">
        <h2 id="jobs-title" className="text-2xl">
          Apprenticeships and job board
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Search UK jobs from Reed and a recent sample of up to 100 English
          apprenticeship adverts. These are not all UK vacancies. Job roles may
          require qualifications or experience; check each advert.
        </p>
        <form
          className="my-5 grid gap-3 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery({ q: keywords.trim(), location: location.trim() });
          }}
        >
          <label className={labelCls}>
            Role or keyword
            <input
              className={fieldCls}
              value={keywords}
              maxLength={100}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. trainee software"
            />
          </label>
          <label className={labelCls}>
            Town or postcode
            <input
              className={fieldCls}
              value={location}
              maxLength={100}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. London or SW1"
            />
          </label>
          <label className={labelCls}>
            Listing type
            <select
              className={fieldCls}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">All</option>
              <option value="job">Job roles</option>
              <option value="apprenticeship">Apprenticeships</option>
            </select>
          </label>
          <button
            className="bg-primary text-primary-foreground h-10 self-end rounded px-4"
            disabled={busy}
          >
            {busy ? "Checking…" : "Search"}
          </button>
        </form>
        <p className="text-muted-foreground mb-3 text-xs">
          Search terms and location are sent to Reed when connected.
          Apprenticeship location filtering matches the location text supplied
          by the feed, often a postcode; use the official search for radius
          searches.
        </p>
        <div role="status" className="space-y-2 text-sm">
          {error && (
            <p>
              One of the feeds could not load. Use the provider searches below
              or retry.
            </p>
          )}
          {jobs?.status === "not-configured" && (
            <p>
              Reed job adverts are not connected yet. Search Reed directly
              below.
            </p>
          )}
          {jobs?.status === "unavailable" && (
            <p>
              Reed is temporarily unavailable. Search the provider directly.
            </p>
          )}
          {apprentices?.sources
            .filter((s) => s.name === "Find an apprenticeship")
            .map((s) => (
              <p key={s.name}>
                Apprenticeships:{" "}
                {s.status === "not-configured"
                  ? "feed not connected yet"
                  : s.status === "cached"
                    ? "stored snapshot; confirm availability"
                    : s.status === "unavailable"
                      ? "temporarily unavailable"
                      : "connected"}
                .
              </p>
            ))}
          {!busy && !listings.length && (
            <p>
              No matching adverts from connected feeds. Try broader terms or the
              provider searches.
            </p>
          )}
        </div>
        <div className="text-primary my-4 flex flex-wrap gap-4 text-sm underline">
          <a
            href={`https://www.reed.co.uk/jobs?${new URLSearchParams({ keywords: query.q, location: query.location })}`}
          >
            Search Reed
          </a>
          <a href="https://www.findapprenticeship.service.gov.uk/apprenticeships">
            Search all English apprenticeships
          </a>
          <a
            href={`https://findajob.dwp.gov.uk/search?${new URLSearchParams({ q: query.q, loc: query.location })}`}
          >
            GOV.UK Find a job
          </a>
          <a href="https://nationalcareers.service.gov.uk/explore-careers">
            Explore what different job roles involve
          </a>
          <button onClick={() => setRefresh((n) => n + 1)} disabled={busy}>
            Refresh feeds
          </button>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {listings.map((j) => (
            <li key={j.id} className="rounded-xl border p-5">
              <p className="text-muted-foreground text-xs">
                {j.kind === "job" ? "Reed job" : "Apprenticeship"} ·{" "}
                {j.employer}
              </p>
              <h3 className="mt-2 font-semibold">
                <a className="text-primary underline" href={j.url}>
                  {j.title}
                </a>
              </h3>
              <p className="mt-2 text-sm">{j.location}</p>
              <p className="mt-2 text-sm">{j.summary}</p>
              <p className="text-muted-foreground mt-2 text-xs">{j.detail}</p>
              {saveButton(j.id)}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-4 text-xs">
          Feeds are cached for up to an hour; this page checks every 15 minutes.{" "}
          {jobs?.checkedAt &&
            `Reed checked ${new Date(jobs.checkedAt).toLocaleString("en-GB")}.`}
        </p>
      </section>
      {route !== "apprenticeship" && (
        <section aria-labelledby="uni-title">
          <h2 id="uni-title" className="text-2xl">
            University starting points for you
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            A small curated shortlist matched to your subject, preferred region
            and study style. This is not a ranking or an assessment of admission
            chances. Course sources checked 3 October 2026.
          </p>
          <div className="my-4 grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              Preferred region
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className={fieldCls}
              >
                {["any", "north", "midlands", "south", "distance"].map((r) => (
                  <option key={r} value={r}>
                    {r === "any"
                      ? "Any region"
                      : r === "distance"
                        ? "Distance learning"
                        : `${r[0].toUpperCase() + r.slice(1)} England`}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Study style
              <select
                className={fieldCls}
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="either">Either</option>
                <option value="campus">On campus</option>
                <option value="distance">Distance learning</option>
              </select>
            </label>
          </div>
          {!matches.length && (
            <p>
              No curated matches for these preferences yet. Broaden the filters
              or use UCAS and Discover Uni below for UK-wide options.
            </p>
          )}
          <ul className="grid gap-4 md:grid-cols-2">
            {matches.map((u) => (
              <li key={u.url} className="rounded-xl border p-5">
                <h3 className="font-semibold">{u.name}</h3>
                <a className="text-primary mt-2 block underline" href={u.url}>
                  {u.course}
                </a>
                <p className="mt-2 text-sm">
                  Suggested because you chose {interest};{" "}
                  {u.mode === "distance"
                    ? "distance learning"
                    : `${u.region} England, on campus`}{" "}
                  fits your filters.
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  Check the entry year, required subjects, grades, fees,
                  accreditation and application deadline on the course page.
                </p>
                {saveButton(`uni:${u.url}`)}
              </li>
            ))}
          </ul>
          <div className="text-primary mt-4 flex flex-wrap gap-4 underline">
            <a href="https://www.ucas.com/explore">
              Explore all courses on UCAS
            </a>
            <a href="https://discoveruni.gov.uk/">
              Compare official student outcomes on Discover Uni
            </a>
          </div>
        </section>
      )}
      <Link href="/next-steps" className="text-primary block underline">
        Year 12 work experience, events and your next-step plan
      </Link>
    </div>
  );
}
