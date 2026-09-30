"use client";

import { useMemo, useState } from "react";

import { CalendarPlus, Download, Printer, Trash2 } from "lucide-react";

import { Empty, fieldCls, labelCls, Tag } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { COURSES } from "@/lib/data/courses";
import { downloadText, STORAGE_KEYS, useStored } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  date: string; // yyyy-mm-dd
  time: string; // hh:mm or ""
  minutes: number;
  subject: string;
  focus: string;
  method: string;
  done: boolean;
}

const METHODS = [
  "Retrieval quiz",
  "Flashcards",
  "Past paper / timed questions",
  "Make notes or a mind map",
  "Coursework / assignment",
  "Read and summarise",
];

const today = () => new Date().toISOString().slice(0, 10);

const fmtDay = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export function Planner() {
  const [sessions, setSessions, ready] = useStored<Session[]>(
    STORAGE_KEYS.planner,
    [],
  );
  const [form, setForm] = useState({
    date: today(),
    time: "",
    minutes: 25,
    subject: COURSES[0].title,
    focus: "",
    method: METHODS[0],
  });
  const [showPast, setShowPast] = useState(false);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const s: Session = {
      ...form,
      id: crypto.randomUUID?.() ?? String(Date.now()),
      focus: form.focus.slice(0, 120),
      minutes: Math.min(240, Math.max(5, form.minutes)),
      done: false,
    };
    setSessions((prev) => [...prev, s].slice(-200));
    setForm((f) => ({ ...f, focus: "" }));
  };

  const grouped = useMemo(() => {
    const t = today();
    const list = [...sessions]
      .filter((s) => showPast || s.date >= t)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const map = new Map<string, Session[]>();
    list.forEach((s) => map.set(s.date, [...(map.get(s.date) ?? []), s]));
    return [...map.entries()];
  }, [sessions, showPast]);

  const totalUpcoming = sessions
    .filter((s) => s.date >= today() && !s.done)
    .reduce((n, s) => n + s.minutes, 0);

  const exportText = () => {
    const lines = [
      "IlluminatED revision plan",
      `Exported ${new Date().toLocaleDateString("en-GB")}`,
      "",
    ];
    grouped.forEach(([d, list]) => {
      lines.push(fmtDay(d));
      list.forEach((s) =>
        lines.push(
          `  [${s.done ? "x" : " "}] ${s.time || "Any time"} · ${s.minutes} min · ${s.subject}${s.focus ? `: ${s.focus}` : ""} (${s.method})`,
        ),
      );
      lines.push("");
    });
    downloadText("revision-plan.txt", lines.join("\n"));
  };

  const exportIcs = () => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    const esc = (s: string) =>
      s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, " ");
    const events = sessions
      .filter((s) => s.date >= today())
      .map((s) => {
        const start = new Date(`${s.date}T${s.time || "16:00"}:00`);
        const end = new Date(start.getTime() + s.minutes * 60000);
        return [
          "BEGIN:VEVENT",
          `UID:${s.id}@illuminated`,
          `DTSTAMP:${stamp(new Date())}`,
          `DTSTART:${stamp(start)}`,
          `DTEND:${stamp(end)}`,
          `SUMMARY:${esc(`Revise ${s.subject}${s.focus ? `: ${s.focus}` : ""}`)}`,
          `DESCRIPTION:${esc(s.method)}`,
          "END:VEVENT",
        ].join("\r\n");
      });
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//IlluminatED//Revision planner//EN",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "revision-plan.ics",
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form
        onSubmit={add}
        className="bg-card no-print h-fit space-y-3 rounded-xl border p-5"
        aria-label="Add a revision session"
      >
        <h3 className="text-lg font-semibold">Add a session</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pl-date" className={labelCls}>
              Date
            </label>
            <input
              id="pl-date"
              type="date"
              required
              className={fieldCls}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="pl-time" className={labelCls}>
              Time{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <input
              id="pl-time"
              type="time"
              className={fieldCls}
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label htmlFor="pl-subject" className={labelCls}>
            Subject
          </label>
          <select
            id="pl-subject"
            className={fieldCls}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          >
            {COURSES.map((c) => (
              <option key={c.id}>{c.title}</option>
            ))}
            <option>Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="pl-focus" className={labelCls}>
            Focus{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <input
            id="pl-focus"
            className={fieldCls}
            maxLength={120}
            value={form.focus}
            onChange={(e) => setForm({ ...form, focus: e.target.value })}
            placeholder="e.g. Atomic structure, Paper 1 Q5"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pl-min" className={labelCls}>
              Minutes
            </label>
            <input
              id="pl-min"
              type="number"
              min={5}
              max={240}
              step={5}
              className={fieldCls}
              value={form.minutes}
              onChange={(e) =>
                setForm({ ...form, minutes: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label htmlFor="pl-method" className={labelCls}>
              Method
            </label>
            <select
              id="pl-method"
              className={fieldCls}
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit" className="w-full">
          <CalendarPlus aria-hidden /> Add to plan
        </Button>
        <p className="text-muted-foreground text-xs">
          Tip: short, spaced sessions (20–30 minutes) mixing retrieval and
          practice questions usually beat long rereading sessions.
        </p>
      </form>

      <section aria-labelledby="plan-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="plan-title" className="text-lg font-semibold">
              Your plan
            </h3>
            <p className="text-muted-foreground text-sm">
              {Math.round(totalUpcoming / 6) / 10} hours planned from today ·
              saved on this device only
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showPast}
                onChange={(e) => setShowPast(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />{" "}
              Show past
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              disabled={!sessions.length}
            >
              <Printer aria-hidden /> Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportText}
              disabled={!sessions.length}
            >
              <Download aria-hidden /> Text
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportIcs}
              disabled={!sessions.length}
            >
              <Download aria-hidden /> Calendar (.ics)
            </Button>
          </div>
        </div>
        {!ready ? null : grouped.length === 0 ? (
          <Empty title="No sessions planned yet">
            Add your first session. Nothing leaves your device.
          </Empty>
        ) : (
          <ol className="space-y-4">
            {grouped.map(([d, list]) => (
              <li key={d}>
                <h4 className="mb-2 text-sm font-semibold">
                  {d === today() ? `Today · ${fmtDay(d)}` : fmtDay(d)}
                </h4>
                <ul className="space-y-2">
                  {list.map((s) => (
                    <li
                      key={s.id}
                      className={cn(
                        "bg-card flex items-start gap-3 rounded-lg border p-3",
                        s.done && "opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={s.done}
                        onChange={() =>
                          setSessions((prev) =>
                            prev.map((x) =>
                              x.id === s.id ? { ...x, done: !x.done } : x,
                            ),
                          )
                        }
                        className="mt-1 size-4 accent-[var(--primary)]"
                        aria-label={`Mark ${s.subject} session as ${s.done ? "not done" : "done"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "font-medium",
                            s.done && "line-through",
                          )}
                        >
                          {s.subject}
                          {s.focus && `: ${s.focus}`}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Tag>{s.time || "Any time"}</Tag>
                          <Tag>{s.minutes} min</Tag>
                          <Tag>{s.method}</Tag>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="no-print"
                        onClick={() =>
                          setSessions((prev) =>
                            prev.filter((x) => x.id !== s.id),
                          )
                        }
                        aria-label={`Delete ${s.subject} session`}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
