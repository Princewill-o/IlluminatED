"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { gameQuiz, recordWorldAnswers } from "@/app/games/world/actions";

/** A multiple-choice question, from the Supabase question bank or a local fallback. */
export type QuizQuestion = { prompt: string; options: readonly string[]; answer: number; explain?: string; subject?: string; topic?: string; key?: string };

let queue: { key: string; correct: boolean }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
/**
 * Call when the player picks an answer. Questions from their own topics are
 * saved to their learning progress (batched), so learning in the world shows
 * up on the dashboard, in estimated grades and in quests.
 */
export function recordPick(q: { key?: string; answer: number } | null | undefined, picked: number) {
  if (!q?.key) return;
  queue.push({ key: q.key, correct: picked === q.answer });
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    const batch = queue;
    queue = [];
    void recordWorldAnswers(batch).catch(() => {});
  }, queue.length >= 5 ? 0 : 1500);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("illumed:learned", { detail: { correct: picked === q.answer } }));
}

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
