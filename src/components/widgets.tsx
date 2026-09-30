"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Check, Download, Printer, Trash2, X } from "lucide-react";

import { Empty, fieldCls, labelCls, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { courseById } from "@/lib/data/courses";
import { QUESTION_BANK, topicById, topicNotesText } from "@/lib/data/topics";
import {
  clearAllStores,
  downloadText,
  type RecentItem,
  recordRecent,
  removeStore,
  STORAGE_KEYS,
  STORAGE_LABELS,
  storedKeys,
  useStored,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

export function RecordVisit(props: Omit<RecentItem, "at">) {
  useEffect(() => {
    recordRecent(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.href]);
  return null;
}

/** Only renders once the learner has opened something. */
export function RecentlyViewed() {
  const [recent, , ready] = useStored<RecentItem[]>(STORAGE_KEYS.recent, []);
  if (!ready || recent.length === 0) return null;
  return (
    <div className="mb-10">
      <h3 className="text-muted-foreground text-sm font-medium">
        Recently viewed
      </h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {recent.slice(0, 5).map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="bg-card hover:border-foreground/30 inline-block rounded-md border px-3 py-1.5 text-sm"
            >
              {r.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const todayIndex = () => {
  const d = new Date();
  return (
    Math.floor(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000,
    ) % QUESTION_BANK.length
  );
};

export function QuizOfTheDay() {
  const [picked, setPicked] = useState<number | null>(null);
  // Rendered on the server too, so the card is never empty; the effect catches a new day.
  const [dayIndex, setDayIndex] = useState<number>(todayIndex);
  useEffect(() => {
    setDayIndex(todayIndex());
  }, []);
  const q = QUESTION_BANK[dayIndex];
  return (
    <Panel>
      <p className="text-muted-foreground text-sm">
        Question of the day · {q.subject}
      </p>
      <p className="mt-2 text-lg leading-snug font-semibold">{q.q}</p>
      <div
        className="mt-4 grid gap-2 sm:grid-cols-2"
        role="group"
        aria-label="Answer options"
      >
        {q.options.map((o, i) => (
          <button
            key={i}
            type="button"
            disabled={picked !== null}
            onClick={() => setPicked(i)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-sm",
              picked === null && "hover:border-foreground/40",
              picked !== null &&
                i === q.answer &&
                "border-success bg-success-soft",
              picked === i &&
                i !== q.answer &&
                "border-destructive bg-danger-soft",
            )}
          >
            {o}
            {picked !== null && i === q.answer && (
              <Check
                className="text-success size-4 shrink-0"
                aria-label="Correct answer"
              />
            )}
            {picked === i && i !== q.answer && (
              <X
                className="text-destructive size-4 shrink-0"
                aria-label="Your answer"
              />
            )}
          </button>
        ))}
      </div>
      <p
        className="text-muted-foreground mt-4 min-h-10 text-sm"
        aria-live="polite"
      >
        {picked !== null
          ? q.explain
          : "Pick an answer to see the explanation. There's a new question each day."}
      </p>
      <Link
        href={`/quizzes?course=${q.courseId}`}
        className="text-primary text-sm font-medium underline underline-offset-4"
      >
        More {q.subject} questions
      </Link>
    </Panel>
  );
}

export function ExamCountdown({
  label = "your first exam",
}: {
  label?: string;
}) {
  const [date, setDate, ready] = useStored<string>(STORAGE_KEYS.examDate, "");
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);
  const days = useMemo(() => {
    if (!date || !today) return null;
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round(
      (new Date(date + "T00:00:00").getTime() - t.getTime()) / 86400000,
    );
  }, [date, today]);

  return (
    <Panel>
      <h3 className="font-semibold">Exam countdown</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Exam dates depend on your board and subject, so add the date of {label}{" "}
        from your school's timetable.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="exam-date" className={labelCls}>
            Exam date
          </label>
          <input
            id="exam-date"
            type="date"
            className={fieldCls}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {date && (
          <Button variant="ghost" size="sm" onClick={() => setDate("")}>
            Clear
          </Button>
        )}
      </div>
      {ready && days !== null && (
        <p
          className="mt-5 text-3xl font-semibold tracking-tight"
          aria-live="polite"
        >
          {days > 1
            ? `${days} days to go`
            : days === 1
              ? "Tomorrow"
              : days === 0
                ? "Today. Good luck!"
                : "That date has passed"}
        </p>
      )}
    </Panel>
  );
}

export function TopicTools({
  topicId,
  courseId,
}: {
  topicId: string;
  courseId: string;
}) {
  const t = topicById(topicId)!;
  const c = courseById(courseId)!;
  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          downloadText(`${t.id}-revision-notes.txt`, topicNotesText(t, c))
        }
      >
        <Download aria-hidden /> Download notes
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer aria-hidden /> Print
      </Button>
    </div>
  );
}

export function NotesDownloadButton({
  topicId,
  courseId,
  label,
}: {
  topicId: string;
  courseId: string;
  label?: string;
}) {
  const t = topicById(topicId)!;
  const c = courseById(courseId)!;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() =>
        downloadText(`${t.id}-revision-notes.txt`, topicNotesText(t, c))
      }
    >
      <Download aria-hidden /> {label ?? "Notes"}
    </Button>
  );
}

export function YearSelector() {
  const [year, setYear, ready] = useStored<"12" | "13" | "">(
    STORAGE_KEYS.alevelYear,
    "",
  );
  const advice = {
    "12": [
      "After each lesson, write three to five questions on it and answer them a few days later.",
      "Organise notes by specification point so gaps are easy to spot.",
      "Start practising longer answers and calculations without worrying about timing yet.",
    ],
    "13": [
      "Mix topics from both years. Most A level papers draw on the whole course.",
      "Sit full papers under timed conditions and mark them with the official mark scheme.",
      "Read examiner reports and keep a list of your own recurring mistakes.",
    ],
  } as const;
  return (
    <Panel>
      <fieldset>
        <legend className="font-semibold">Which year are you in?</legend>
        <div className="mt-3 inline-flex rounded-md border p-0.5">
          {(["12", "13"] as const).map((y) => (
            <label
              key={y}
              className="has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-ring cursor-pointer rounded px-4 py-1.5 text-sm font-medium has-[:focus-visible]:ring-2"
            >
              <input
                type="radio"
                name="year"
                className="sr-only"
                checked={year === y}
                onChange={() => setYear(y)}
              />
              Year {y}
            </label>
          ))}
        </div>
      </fieldset>
      <div aria-live="polite" className="mt-4">
        {ready && year ? (
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
            {advice[year].map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Choose your year for a few tips on what to focus on.
          </p>
        )}
      </div>
    </Panel>
  );
}

export function YourDataPanel() {
  const [keys, setKeys] = useState<string[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const refresh = () => setKeys(storedKeys());
  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener("illuminated-storage", on);
    return () => window.removeEventListener("illuminated-storage", on);
  }, []);
  if (keys === null) return null;
  return (
    <div className="space-y-6">
      {keys.length === 0 ? (
        <Empty title="Nothing saved yet">
          IlluminatED hasn't stored anything in this browser apart from your
          theme choice, if you've changed it.
        </Empty>
      ) : (
        <ul className="border-t">
          {keys.map((k) => (
            <li
              key={k}
              className="flex items-center justify-between gap-3 border-b py-3"
            >
              <span className="text-sm">{STORAGE_LABELS[k] ?? k}</span>
              <Button variant="ghost" size="sm" onClick={() => removeStore(k)}>
                <Trash2 aria-hidden /> Clear
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {!confirm ? (
          <Button
            variant="outline"
            onClick={() => setConfirm(true)}
            disabled={keys.length === 0}
          >
            Clear everything
          </Button>
        ) : (
          <>
            <span className="text-sm font-medium">
              This removes all your progress, plans and settings. Continue?
            </span>
            <Button
              variant="destructive"
              onClick={() => {
                clearAllStores();
                setConfirm(false);
              }}
            >
              Yes, clear it
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
