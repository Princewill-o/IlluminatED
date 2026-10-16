"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Check, Copy } from "lucide-react";

import { type ActiveJob, Ladder, WorkplaceDoor } from "./work";

import { quitJob } from "@/app/games/careers/actions";
import { CompanyLogo } from "@/components/game/company-logo";
import { WORKPLACES, type Workplace } from "@/game/core/careers";
import type { Avatar } from "@/game/core/cosmetics";

export function JobCentre({ job, avatar }: { job: ActiveJob | null; avatar: Avatar }) {
  const [open, setOpen] = useState<Workplace | null>(null);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {WORKPLACES.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setOpen(w)}
            className="rounded-3xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:bg-hover"
          >
            <div className="flex items-center gap-3">
              {w.companyId ? (
                <CompanyLogo id={w.companyId} size={36} />
              ) : (
                <span className="grid size-9 place-items-center rounded-xl font-black text-[#0b0910]" style={{ background: w.accent }}>
                  {w.name[0]}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-black">{w.name}</p>
                <p className="text-xs text-muted-foreground">{w.sector}</p>
              </div>
            </div>
            <p className="mt-3 text-sm">
              {w.roles[0].title} → {w.roles[2].title}
            </p>
            <p className="mt-1 text-sm font-black text-ink-sun">
              {w.roles[0].pay}–{w.roles[2].pay} Clout / shift
            </p>
            {job?.workplace === w.id && <p className="mt-2 text-xs font-black text-ink-lilac uppercase">Your employer</p>}
          </button>
        ))}
      </div>
      {open && <WorkplaceDoor workplace={open} job={job} avatar={avatar} onClose={() => setOpen(null)} />}
    </>
  );
}

export function MyJob({ job, avatar }: { job: ActiveJob; avatar: Avatar }) {
  const w = WORKPLACES.find((x) => x.id === job.workplace)!;
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <Ladder workplace={w} job={job} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-[#c6f36b] px-5 py-3 font-black text-[#0b0910]">
          Go to work
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Leave ${w.name}? Your experience stays on your record.`)) return;
            start(async () => {
              await quitJob();
              router.refresh();
            });
          }}
          className="rounded-full bg-secondary px-5 py-3 font-bold"
        >
          Hand in notice
        </button>
      </div>
      {open && <WorkplaceDoor workplace={w} job={job} avatar={avatar} onClose={() => setOpen(false)} />}
    </div>
  );
}

export function CvBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="rounded-2xl border border-border bg-card p-4 pr-14 text-sm leading-6 whitespace-pre-wrap">{text}</pre>
      <button
        type="button"
        aria-label="Copy CV text"
        onClick={() => {
          void navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-secondary"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
