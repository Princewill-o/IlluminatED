"use client";

import { Loader2, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError, ERROR_COPY, fmtDate } from "@/lib/api-client";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="text-muted-foreground flex items-center gap-2 py-6 text-sm"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const kind = error instanceof ApiError ? error.kind : "unavailable";
  if (kind === "aborted") return null;
  const copy = ERROR_COPY[kind];
  return (
    <div
      role="alert"
      className="bg-danger-soft flex flex-wrap items-start gap-3 rounded-lg p-4 text-sm"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{copy.title}</p>
        <p className="text-muted-foreground mt-0.5">{copy.body}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

export function FetchMeta({
  fetchedAt,
  stale,
  fromCache,
  source,
  sourceUrl,
}: {
  fetchedAt: number;
  stale?: boolean;
  fromCache?: boolean;
  source: string;
  sourceUrl: string;
}) {
  const time = new Date(fetchedAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <p
      className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
      aria-live="polite"
    >
      <span>
        Source:{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          {source}
        </a>
      </span>
      <span>
        Fetched {fmtDate(fetchedAt)} at {time}
        {fromCache && !stale && " (saved copy)"}
      </span>
      {stale && (
        <span className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 font-medium">
          Showing a saved copy because the live service didn't respond
        </span>
      )}
    </p>
  );
}
