"use client";

import { useEffect, useState } from "react";

import type { TrainingContextData } from "@/lib/illum-world/training-context";

export function TrainingContext({ roleId }: { roleId: string }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: TrainingContextData }>();
  const key = `${roleId}:${attempt}`;
  const current = result?.key === key ? result : null;

  useEffect(() => {
    if (!open || current) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/world/contracts/${encodeURIComponent(roleId)}/context`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Career reference request failed.");
        const data = await response.json() as TrainingContextData;
        if (!controller.signal.aborted) setResult({ key, data });
      } catch {
        if (!controller.signal.aborted) setResult({ key });
      }
    }
    void load();
    return () => controller.abort();
  }, [current, key, open, roleId]);

  const data = current?.data;
  return (
    <details
      className="my-5 rounded-xl border border-current/20 p-4 text-sm"
      onToggle={event => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer py-2 font-bold">Career skills and job examples</summary>
      {open && !current && <p role="status" className="mt-2">Loading career references…</p>}
      {open && current && !data && (
        <p role="status" className="mt-2">
          Career references could not load.{" "}
          <button type="button" className="min-h-11 font-bold underline" onClick={() => setAttempt(i => i + 1)}>
            Try again
          </button>
        </p>
      )}
      {data?.occupation && (
        <div className="mt-3">
          <p className="font-bold">Related occupation in ESCO · {data.occupation.title}</p>
          {data.occupation.skills.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {data.occupation.skills.map(skill => <li key={skill} className="rounded-lg border border-current/20 px-2 py-1">{skill}</li>)}
            </ul>
          )}
          <a
            className="inline-flex min-h-11 items-center underline underline-offset-4"
            href="https://esco.ec.europa.eu/en/use-esco/use-esco-services-api/esco-web-service-api"
            target="_blank"
            rel="noreferrer"
          >ESCO occupational classification ↗</a>
        </div>
      )}
      {data && (
        <div className="mt-3">
          <p className="font-bold">Related real vacancies at {data.board}</p>
          <p className="mt-1">Optional career examples from the public Greenhouse job board. These links open the employer’s recruitment site.</p>
          {data.vacancies.length === 0
            ? <p className="mt-2">No current examples are available.</p>
            : (
              <ul className="mt-2 space-y-2">
                {data.vacancies.map(job => (
                  <li key={job.id}>
                    <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">{job.title} ↗</a>
                    {job.location && <span className="block">{job.location}</span>}
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
    </details>
  );
}
