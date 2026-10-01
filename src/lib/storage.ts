"use client";

import { useCallback, useEffect, useState } from "react";

/** Everything IlluminatED saves lives under this prefix, in this browser only. */
export const PREFIX = "illuminated:";

export const STORAGE_KEYS = {
  recent: "recent",
  quiz: "quiz-progress",
  flashcards: "flashcards",
  planner: "planner",
  examDate: "exam-date",
  alevelYear: "alevel-year",
  cache: "api-cache",
  imported: "progress-imported",
} as const;

export const STORAGE_LABELS: Record<string, string> = {
  [STORAGE_KEYS.recent]: "Recently viewed courses and topics",
  [STORAGE_KEYS.quiz]: "Quiz answers (right/wrong counts per question)",
  [STORAGE_KEYS.flashcards]: "Flashcard 'know it / review it' marks",
  [STORAGE_KEYS.planner]: "Revision planner sessions",
  [STORAGE_KEYS.examDate]: "Exam countdown date",
  [STORAGE_KEYS.alevelYear]: "A level year choice",
  [STORAGE_KEYS.imported]:
    "Which accounts this device's quiz history has already been added to",
  [STORAGE_KEYS.cache]:
    "Short-lived copies of search results (qualifications, statistics, books, guidance, apprenticeships)",
};

const EVENT = "illuminated-storage";

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode, quota) — the app keeps working in memory */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

export function removeStore(key: string) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

export function clearAllStores() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith(PREFIX) || k === "theme")) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: "*" }));
}

export function storedKeys(): string[] {
  try {
    const out: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * React state mirrored to localStorage. Reads after mount so server and first
 * client render match; `ready` tells you when saved data has loaded.
 */
export function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setValue(readStore(key, fallback));
    setReady(true);
    const onChange = (e: Event) => {
      const k = (e as CustomEvent).detail;
      if (k === key || k === "*") setValue(readStore(key, fallback));
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        writeStore(key, v);
        return v;
      });
    },
    [key],
  );

  return [value, update, ready] as const;
}

export interface RecentItem {
  href: string;
  title: string;
  kind: "course" | "topic";
  at: number;
}

export function recordRecent(item: Omit<RecentItem, "at">) {
  const list = readStore<RecentItem[]>(STORAGE_KEYS.recent, []).filter(
    (r) => r.href !== item.href,
  );
  writeStore(
    STORAGE_KEYS.recent,
    [{ ...item, at: Date.now() }, ...list].slice(0, 6),
  );
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
