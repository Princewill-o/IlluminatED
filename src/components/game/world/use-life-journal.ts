"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  appendJournal,
  journalKey,
  readJournal,
  type LifeEntry,
} from "@/game/core/mobile-life";

/** A device-local diary of completed actions; never used as proof of rewards. */
export function useLifeJournal(userId: string) {
  const [entries, setEntries] = useState<LifeEntry[]>([]);
  const memory = useRef<LifeEntry[]>([]);
  useEffect(() => {
    try {
      memory.current = readJournal(localStorage.getItem(journalKey(userId)));
    } catch {
      memory.current = [];
    }
    setEntries(memory.current);
  }, [userId]);
  const record = useCallback(
    (text: string) => {
      const at = Date.now();
      let previous = memory.current;
      try {
        const stored = localStorage.getItem(journalKey(userId));
        if (stored !== null) previous = readJournal(stored);
      } catch {
        /* Keep this visit's diary. */
      }
      const next = appendJournal(previous, text, at);
      memory.current = next;
      try {
        localStorage.setItem(journalKey(userId), JSON.stringify(next));
      } catch {
        /* Storage is optional. */
      }
      setEntries(next);
    },
    [userId],
  );
  return { entries, record };
}
