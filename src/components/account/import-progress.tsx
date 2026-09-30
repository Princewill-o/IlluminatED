"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { STORAGE_KEYS, useStored } from "@/lib/storage";
import { browserSupabase } from "@/lib/supabase-browser";

type Progress = Record<string, { seen: number; correct: number; last: number }>;

/** Offers to add quiz history saved in this browser (from before signing in) to the account. */
export function ImportProgress({
  userId,
  topicCourses,
}: {
  userId: string;
  /** topic id → course id, for the topics that exist */
  topicCourses: Record<string, string>;
}) {
  const [progress, , ready] = useStored<Progress>(STORAGE_KEYS.quiz, {});
  const [imported, setImported] = useStored<string[]>(
    STORAGE_KEYS.imported,
    [],
  );
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");
  const router = useRouter();

  const answers = Object.entries(progress)
    .map(([key, p]) => ({ key, topicId: key.split(":")[0], p }))
    .filter(({ topicId, p }) => topicCourses[topicId] && p?.seen > 0)
    .slice(0, 500)
    .map(({ key, topicId, p }) => ({
      key,
      topicId,
      courseId: topicCourses[topicId],
      seen: Math.min(p.seen, 100),
      correct: Math.min(p.correct, p.seen, 100),
    }));

  if (!ready || !answers.length || imported.includes(userId)) return null;

  const run = async () => {
    const sb = browserSupabase();
    if (!sb) return;
    setState("working");
    const { error } = await sb.rpc("record_quiz_round", {
      round_mode: "import",
      answers,
    });
    if (error) {
      setState("failed");
      return;
    }
    setImported([...imported, userId]);
    router.refresh();
  };

  return (
    <div className="border-l-primary flex flex-wrap items-center gap-x-6 gap-y-3 border-l-2 py-1 pl-5">
      <p className="max-w-xl text-sm leading-relaxed">
        This browser has {answers.length} quiz question
        {answers.length === 1 ? "" : "s"} you answered before signing in. Add
        them to your account so they count on your dashboard?
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={state === "working"}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {state === "working" ? "Adding…" : "Add to my account"}
        </button>
        <button
          type="button"
          onClick={() => setImported([...imported, userId])}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          No thanks
        </button>
      </div>
      {state === "failed" && (
        <p role="alert" className="text-destructive w-full text-sm">
          That didn't work. Please try again.
        </p>
      )}
    </div>
  );
}
