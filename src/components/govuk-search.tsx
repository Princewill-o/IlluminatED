"use client";

import { useRef, useState } from "react";

import { Search } from "lucide-react";

import { ErrorState, FetchMeta, Loading } from "@/components/api-status";
import { Empty, ExternalLink, fieldCls, labelCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { fetchJson, fmtDate, isObj } from "@/lib/api-client";
import { OGL_URL } from "@/lib/apprenticeships";

interface Result {
  title: string;
  description: string;
  url: string;
  updated: string | null;
  format: string;
}
interface Data {
  results: Result[];
  total: number;
}
const isData = (j: unknown): j is Data =>
  isObj(j) && Array.isArray(j.results) && typeof j.total === "number";

const PRESETS = [
  "GCSE results",
  "T Levels",
  "Student finance",
  "Apprenticeships",
  "Exam access arrangements",
  "Resits",
];

/** Search GOV.UK guidance from DfE, Ofqual, Student Loans Company and Skills England. */
export function GovUkSearch() {
  const [term, setTerm] = useState("");
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: unknown }
    | {
        status: "done";
        data: Data;
        fetchedAt: number;
        stale: boolean;
        fromCache: boolean;
      }
  >({ status: "idle" });
  const ctrl = useRef<AbortController | null>(null);

  const run = async (value = term) => {
    const t = value.trim();
    if (t.length < 2) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState({ status: "loading" });
    const qs = new URLSearchParams({ q: t }).toString();
    try {
      const res = await fetchJson<Data>({
        proxy: `/api/govuk/search?${qs}`,
        cacheKey: `govuk:${t.toLowerCase()}`,
        ttlMs: 1000 * 60 * 60 * 6,
        signal: c.signal,
        validate: isData,
      });
      setState({
        status: "done",
        data: res.data,
        fetchedAt: res.fetchedAt,
        stale: res.stale,
        fromCache: res.fromCache,
      });
    } catch (error) {
      if (!c.signal.aborted) setState({ status: "error", error });
    }
  };

  return (
    <div className="space-y-4">
      <form
        role="search"
        aria-label="Search official guidance on GOV.UK"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="space-y-2"
      >
        <label htmlFor="govuk-q" className={labelCls}>
          Search GOV.UK guidance
        </label>
        <div className="flex gap-2">
          <input
            id="govuk-q"
            className={fieldCls}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="e.g. results day, school leaving age, EPQ"
            autoComplete="off"
          />
          <Button type="submit">
            <Search aria-hidden /> Search
          </Button>
        </div>
      </form>
      <div className="flex flex-wrap gap-2" aria-label="Popular searches">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setTerm(p);
              run(p);
            }}
            className="hover:bg-muted rounded-full border px-3 py-1 text-sm transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {state.status === "loading" && <Loading label="Searching GOV.UK…" />}
        {state.status === "error" && (
          <ErrorState error={state.error} onRetry={() => run()} />
        )}
        {state.status === "done" && (
          <div className="space-y-3">
            {state.data.results.length === 0 ? (
              <Empty title="No guidance found">
                Try fewer or simpler words.
              </Empty>
            ) : (
              <ul className="border-t">
                {state.data.results.map((r) => (
                  <li key={r.url} className="border-b py-4">
                    <ExternalLink href={r.url}>{r.title}</ExternalLink>
                    {r.description && (
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {r.description}
                      </p>
                    )}
                    <p className="text-muted-foreground mt-1 text-xs capitalize">
                      {[r.format, r.updated && `updated ${fmtDate(r.updated)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <FetchMeta
              fetchedAt={state.fetchedAt}
              stale={state.stale}
              fromCache={state.fromCache}
              source="GOV.UK search API"
              sourceUrl="https://docs.publishing.service.gov.uk/repos/search-api/public-api.html"
            />
            <p className="text-muted-foreground text-xs">
              Contains public sector information licensed under the{" "}
              <ExternalLink href={OGL_URL} className="text-xs">
                Open Government Licence v3.0
              </ExternalLink>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
