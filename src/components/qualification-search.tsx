"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { ErrorState, FetchMeta, Loading } from "@/components/api-status";
import { Empty, ExternalLink, fieldCls, labelCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/api-client";
import {
  AVAILABILITY,
  OFQUAL_DOCS,
  type QualPage,
  QUAL_LEVELS,
  QUAL_TYPES,
  searchQualifications,
} from "@/lib/ofqual";
import { cn } from "@/lib/utils";

interface Filters {
  title: string;
  qualificationTypes: string;
  qualificationLevels: string;
  awardingOrganisations: string;
  availability: string;
}

const EMPTY: Filters = {
  title: "",
  qualificationTypes: "",
  qualificationLevels: "",
  awardingOrganisations: "",
  availability: "Available to learners",
};

export function QualificationSearch({
  initial,
  compact = false,
  pageSize = 10,
  autoRun = false,
}: {
  initial?: Partial<Filters>;
  compact?: boolean;
  pageSize?: number;
  autoRun?: boolean;
}) {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY, ...initial });
  const [page, setPage] = useState(1);
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; error: unknown }
    | {
        status: "done";
        data: QualPage;
        fetchedAt: number;
        stale: boolean;
        fromCache: boolean;
      }
  >({ status: "idle" });
  const ctrl = useRef<AbortController | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (f: Filters, p: number) => {
      if (f.title.trim().length < 2) {
        setState({ status: "idle" });
        return;
      }
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setState({ status: "loading" });
      try {
        const res = await searchQualifications(
          { ...f, page: p, limit: pageSize },
          c.signal,
        );
        if (!c.signal.aborted)
          setState({
            status: "done",
            data: res.page,
            fetchedAt: res.fetchedAt,
            stale: res.stale,
            fromCache: res.fromCache,
          });
      } catch (error) {
        if (!c.signal.aborted) setState({ status: "error", error });
      }
    },
    [pageSize],
  );

  // Debounced search as the learner types or changes filters.
  useEffect(() => {
    if (
      !autoRun &&
      state.status === "idle" &&
      filters.title === (initial?.title ?? "")
    )
      return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => run(filters, page), 450);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  useEffect(() => () => ctrl.current?.abort(), []);

  const set = (k: keyof Filters, v: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: v }));
  };

  const totalPages =
    state.status === "done"
      ? Math.max(1, Math.ceil(state.data.count / pageSize))
      : 1;

  return (
    <div className="space-y-4">
      <form
        className={cn(
          "grid gap-3",
          compact ? "sm:grid-cols-[1fr_auto]" : "md:grid-cols-6",
        )}
        onSubmit={(e) => {
          e.preventDefault();
          run(filters, page);
        }}
        role="search"
        aria-label="Search the Ofqual register"
      >
        <div className={cn(!compact && "md:col-span-2")}>
          <label htmlFor={`q-title${compact ? "-c" : ""}`} className={labelCls}>
            Qualification title contains
          </label>
          <input
            id={`q-title${compact ? "-c" : ""}`}
            className={fieldCls}
            value={filters.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Biology, Health, Digital"
            autoComplete="off"
          />
        </div>
        {!compact && (
          <>
            <div>
              <label htmlFor="q-type" className={labelCls}>
                Type
              </label>
              <select
                id="q-type"
                className={fieldCls}
                value={filters.qualificationTypes}
                onChange={(e) => set("qualificationTypes", e.target.value)}
              >
                <option value="">Any type</option>
                {QUAL_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="q-level" className={labelCls}>
                Level
              </label>
              <select
                id="q-level"
                className={fieldCls}
                value={filters.qualificationLevels}
                onChange={(e) => set("qualificationLevels", e.target.value)}
              >
                <option value="">Any level</option>
                {QUAL_LEVELS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="q-ao" className={labelCls}>
                Awarding organisation
              </label>
              <input
                id="q-ao"
                className={fieldCls}
                value={filters.awardingOrganisations}
                onChange={(e) => set("awardingOrganisations", e.target.value)}
                placeholder="e.g. AQA Education"
              />
            </div>
            <div>
              <label htmlFor="q-status" className={labelCls}>
                Status
              </label>
              <select
                id="q-status"
                className={fieldCls}
                value={filters.availability}
                onChange={(e) => set("availability", e.target.value)}
              >
                <option value="">Any status</option>
                {AVAILABILITY.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className={cn("flex items-end", !compact && "md:col-span-6")}>
          <Button type="submit" className="w-full sm:w-auto">
            <Search aria-hidden /> Search register
          </Button>
        </div>
      </form>

      <div aria-live="polite">
        {state.status === "idle" && (
          <p className="text-muted-foreground text-sm">
            Type at least two characters of a qualification title to search.
          </p>
        )}
        {state.status === "loading" && (
          <Loading label="Searching the Ofqual register…" />
        )}
        {state.status === "error" && (
          <ErrorState error={state.error} onRetry={() => run(filters, page)} />
        )}
        {state.status === "done" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {state.data.count.toLocaleString("en-GB")}{" "}
                {state.data.count === 1 ? "qualification" : "qualifications"}{" "}
                found
              </p>
              <FetchMeta
                fetchedAt={state.fetchedAt}
                stale={state.stale}
                fromCache={state.fromCache}
                source="Ofqual Register of Regulated Qualifications"
                sourceUrl={OFQUAL_DOCS}
              />
            </div>
            {state.data.results.length === 0 ? (
              <Empty title="No matching qualifications">
                Try a shorter title (for example "Chemistry" rather than "GCSE
                Chemistry"), remove a filter, or include qualifications that are
                no longer awarded.
              </Empty>
            ) : (
              <ul className="border-t">
                {state.data.results.map((q) => (
                  <li key={q.number + q.title} className="border-b py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="font-semibold">{q.title}</p>
                      <p
                        className={
                          q.status === "Available to learners"
                            ? "text-success text-sm font-medium"
                            : "text-muted-foreground text-sm font-medium"
                        }
                      >
                        {q.status || "Status not stated"}
                      </p>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {[
                        q.number && `No. ${q.number}`,
                        q.organisation,
                        [q.type, q.level].filter(Boolean).join(", "),
                        [
                          q.offeredInEngland && "England",
                          q.offeredInNI && "Northern Ireland",
                        ]
                          .filter(Boolean)
                          .join(" and "),
                        q.lastUpdated && `updated ${fmtDate(q.lastUpdated)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-2 text-sm">
                      {q.specUrl ? (
                        <ExternalLink href={q.specUrl}>
                          Specification
                        </ExternalLink>
                      ) : (
                        <span className="text-muted-foreground">
                          No specification link in the register. Check the
                          awarding organisation's website.
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {state.data.count > pageSize && (
              <nav
                className="flex items-center justify-between gap-2"
                aria-label="Results pages"
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft aria-hidden /> Previous
                </Button>
                <span className="text-muted-foreground text-sm">
                  Page {page} of {totalPages.toLocaleString("en-GB")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight aria-hidden />
                </Button>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
