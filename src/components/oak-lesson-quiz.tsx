"use client";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { oakAnswerCorrect, type OakQuiz } from "@/lib/oak-quiz";
export function OakLessonQuiz({ slug }: { slug: string }) {
  const [quiz, setQuiz] = useState<OakQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, number[]>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/education/lessons/${encodeURIComponent(slug)}`,
      );
      if (!r.ok)
        throw new Error(
          "Oak's quiz couldn't be loaded. Use the lesson link above, or try again.",
        );
      setQuiz((await r.json()) as OakQuiz);
      setSelected({});
      setMarked({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quiz unavailable");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <Button onClick={load} disabled={loading}>
        {loading
          ? "Loading quiz…"
          : quiz
            ? "Restart quiz"
            : "Load Oak lesson quiz"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {error}
        </p>
      )}
      {quiz && (
        <>
          <p className="text-muted-foreground mt-4 text-sm">
            {quiz.questions.length} text multiple-choice questions. Select all
            correct answers. Practice results stay on this page and don&apos;t
            count towards your IlluminatED dashboard.
          </p>
          {quiz.questions.map((q) => (
            <fieldset key={q.id} className="mt-5 rounded-xl border p-5">
              <legend className="px-2 font-medium">{q.prompt}</legend>
              <div className="space-y-3">
                {q.answers.map((a, i) => (
                  <label className="flex items-start gap-3 text-sm" key={i}>
                    <input
                      type="checkbox"
                      checked={selected[q.id]?.includes(i) ?? false}
                      disabled={marked[q.id]}
                      className="mt-1"
                      onChange={(e) =>
                        setSelected((prev) => ({
                          ...prev,
                          [q.id]: e.target.checked
                            ? [...(prev[q.id] ?? []), i]
                            : (prev[q.id] ?? []).filter((x) => x !== i),
                        }))
                      }
                    />
                    {a.text}
                  </label>
                ))}
              </div>
              <Button
                className="mt-4"
                size="sm"
                disabled={marked[q.id] || !selected[q.id]?.length}
                onClick={() => setMarked((prev) => ({ ...prev, [q.id]: true }))}
              >
                Check answer
              </Button>
              {marked[q.id] && (
                <p role="status" className="mt-3 text-sm">
                  {oakAnswerCorrect(q, selected[q.id] ?? [])
                    ? "Correct."
                    : `Review this one. Correct answers: ${q.answers
                        .filter((a) => a.correct)
                        .map((a) => a.text)
                        .join("; ")}`}
                </p>
              )}
            </fieldset>
          ))}
          {quiz.skipped > 0 && (
            <p className="text-muted-foreground mt-5 text-sm">
              {quiz.skipped} questions use formats this player doesn&apos;t
              support. Open the full quiz on Oak for those.
            </p>
          )}
        </>
      )}
    </div>
  );
}
