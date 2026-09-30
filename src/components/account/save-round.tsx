"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { browserSupabase } from "@/lib/supabase-browser";

export interface RoundAnswer {
  key: string;
  topicId: string;
  courseId: string;
  correct: boolean;
}

/** Saves a finished quiz round to the learner's account, if they're signed in. */
export function SaveRound({
  mode,
  answers,
}: {
  mode: string;
  answers: RoundAnswer[];
}) {
  const [state, setState] = useState<
    "idle" | "saving" | "saved" | "signed-out" | "failed" | "off"
  >("idle");
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const sb = browserSupabase();
    if (!sb || !answers.length) {
      setState(sb ? "idle" : "off");
      return;
    }
    (async () => {
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        setState("signed-out");
        return;
      }
      setState("saving");
      const { error } = await sb.rpc("record_quiz_round", {
        round_mode: mode,
        answers: answers.map((a) => ({
          key: a.key,
          topicId: a.topicId,
          courseId: a.courseId,
          seen: 1,
          correct: a.correct ? 1 : 0,
        })),
      });
      setState(error ? "failed" : "saved");
    })();
  }, [mode, answers]);

  if (state === "off" || state === "idle") return null;
  return (
    <p className="text-muted-foreground text-sm" role="status">
      {state === "saving" && "Saving to your dashboard…"}
      {state === "saved" && (
        <>
          Saved to your{" "}
          <Link
            href="/dashboard"
            className="text-primary underline underline-offset-4"
          >
            dashboard
          </Link>
          .
        </>
      )}
      {state === "failed" &&
        "We couldn't save this round to your account. It's still saved on this device."}
      {state === "signed-out" && (
        <>
          <Link
            href="/sign-in?next=/dashboard"
            className="text-primary underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          to keep your scores across devices and get revision suggestions.
        </>
      )}
    </p>
  );
}
