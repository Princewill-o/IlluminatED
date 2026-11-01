"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { gameQuiz } from "@/app/games/world/actions";

/** A multiple-choice question, from the Supabase question bank or a local fallback. */
export type QuizQuestion = { prompt: string; options: readonly string[]; answer: number; explain?: string; subject?: string; topic?: string };

/**
 * A small pool of real question-bank questions (from your subjects when
 * possible). `next()` hands out the next one; when the bank can't be reached
 * (offline, signed out) it uses the local fallback so the game never stalls.
 */
export function useBankQuestions(count: number, fallback: () => QuizQuestion) {
  const pool = useRef<QuizQuestion[]>([]);
  const [ready, setReady] = useState(false);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  const refill = useCallback(async () => {
    try {
      const fresh = await gameQuiz(count);
      pool.current.push(...fresh);
    } catch { /* offline: fall back below */ }
    setReady(true);
  }, [count]);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 3500); // never wait long
    void refill();
    return () => window.clearTimeout(timer);
  }, [refill]);
  const next = useCallback((): QuizQuestion => {
    const q = pool.current.shift();
    if (pool.current.length < 2) void refill();
    return q ?? fallbackRef.current();
  }, [refill]);
  return { ready, next };
}
