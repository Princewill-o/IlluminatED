"use client";
import { useMemo, useState } from "react";

import { SKILLS, WORKPLACES, buildShift, type Task } from "@/game/core/careers";
import { LEARNING_SOURCES } from "@/lib/education/source-registry";
export function WorkReference() {
  const [workplace, setWorkplace] = useState(WORKPLACES[0].id);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const selected = WORKPLACES.find((w) => w.id === workplace)!;
  const tasks = useMemo(
    () => buildShift(selected.roles[0], 20261018),
    [selected],
  );
  return (
    <>
      <label className="block max-w-md text-sm font-bold">
        Choose a simulated workplace
        <select
          value={workplace}
          onChange={(e) => {
            setWorkplace(e.target.value);
            setAnswers({});
          }}
          className="bg-background mt-2 block min-h-11 w-full rounded-xl border px-4"
        >
          {WORKPLACES.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} · {w.sector}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-6 space-y-5">
        {tasks.map((task: Task, i) => (
          <article
            key={`${workplace}-${i}`}
            className="bg-card rounded-2xl border p-5"
          >
            <p className="text-primary text-xs font-bold">
              {SKILLS[task.skill]} · original simulated practice
            </p>
            <h2 className="mt-2 text-xl font-black">{task.title}</h2>
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">
              {task.prompt}
            </p>
            {task.doc && (
              <pre className="bg-secondary mt-3 overflow-x-auto rounded-xl p-4 text-xs whitespace-pre-wrap">
                {task.doc.text ??
                  task.doc.rows?.map((row) => row.join(" | ")).join("\n")}
              </pre>
            )}
            {task.options && (
              <ol className="mt-3 list-inside list-decimal space-y-1 text-sm">
                {task.options.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ol>
            )}
            <button
              type="button"
              className="mt-4 min-h-11 rounded-xl border px-4 text-sm font-bold"
              aria-expanded={Boolean(answers[i])}
              onClick={() => setAnswers((a) => ({ ...a, [i]: !a[i] }))}
            >
              {answers[i] ? "Hide answer" : "Show answer & explanation"}
            </button>
            {answers[i] && (
              <p className="bg-secondary mt-3 rounded-xl p-4 text-sm leading-6">
                <strong>
                  Answer:{" "}
                  {task.options
                    ? task.options[task.answer]
                    : `${task.numeric?.prefix ?? ""}${task.answer}${task.numeric?.unit ?? ""}`}
                  .
                </strong>{" "}
                {task.explain}
              </p>
            )}
            <div className="mt-4 border-t pt-3 text-sm">
              <p className="text-muted-foreground text-xs">
                Reference context for this skill; these publishers have not
                approved this scenario.
              </p>
              {LEARNING_SOURCES.filter((s) =>
                s.skills.includes(task.skill),
              ).map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary mt-2 block min-h-9 font-bold underline"
                >
                  {s.provider}: {s.title} ↗
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
