"use client";

import { useMemo, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Check, Copy, X } from "lucide-react";

import { createClass, deleteClass, deleteHomework, joinClass, leaveClass, removeStudent, setHomework, submitHomework } from "@/app/homework/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { earnSeasonXp } from "@/components/game/season/pass-store";
import { doActivity } from "@/components/game/world/use-needs";
import { cn } from "@/lib/utils";

const input = "mt-1 block w-full rounded-xl border border-input bg-background px-3 py-2.5";
const btn = "rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground disabled:opacity-50";

function useAction() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const run = <T,>(fn: () => Promise<{ ok: true; data?: T } | { ok: false; error: string }>, done?: (d: T | undefined) => string | void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      const text = done?.(r.data);
      setMsg(text ? { ok: true, text } : null);
      router.refresh();
    });
  return { pending, msg, run };
}

function Note({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p role="status" className={cn("mt-2 text-sm font-bold", msg.ok ? "text-success" : "text-destructive")}>
      {msg.text}
    </p>
  );
}

export function JoinClass() {
  const [code, setCode] = useState("");
  const { pending, msg, run } = useAction();
  return (
    <form
      className="rounded-3xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => joinClass(code), () => {
          setCode("");
          return "You're in. Your teacher's homework will show up as tasks in the game.";
        });
      }}
    >
      <p className="font-bold">Join a class</p>
      <p className="mt-1 text-sm text-muted-foreground">Your teacher gives you a 6-character code. They'll see your username and your homework scores, nothing else.</p>
      <div className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="e.g. 4F7K2Q"
          aria-label="Class code"
          className={cn(input, "mt-0 font-mono text-lg tracking-widest uppercase")}
        />
        <button type="submit" disabled={pending || code.length !== 6} className={btn}>
          Join
        </button>
      </div>
      <Note msg={msg} />
    </form>
  );
}

export function CreateClass() {
  const [f, setF] = useState({ name: "", subject: "", school: "" });
  const { pending, msg, run } = useAction();
  return (
    <form
      className="rounded-3xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createClass(f), (code) => {
          setF({ name: "", subject: "", school: "" });
          return `Class made. Share code ${code} with your students.`;
        });
      }}
    >
      <p className="font-bold">Create a class</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <label className="text-sm font-bold">
          Class name
          <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="12C Chemistry" className={input} />
        </label>
        <label className="text-sm font-bold">
          Subject
          <input required value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Chemistry" className={input} />
        </label>
        <label className="text-sm font-bold">
          School <span className="font-normal text-muted-foreground">(optional)</span>
          <input value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} className={input} />
        </label>
      </div>
      <button type="submit" disabled={pending} className={cn(btn, "mt-3")}>
        Create class
      </button>
      <Note msg={msg} />
    </form>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2 font-mono text-2xl font-black tracking-[0.3em]"
      aria-label={`Copy class code ${code}`}
    >
      {code} {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
    </button>
  );
}

export function LeaveClass({ classId, name }: { classId: string; name: string }) {
  const { pending, run } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Leave ${name}? Your homework answers for this class are deleted.`)) run(() => leaveClass(classId));
      }}
      className="text-sm font-bold text-muted-foreground underline"
    >
      Leave
    </button>
  );
}

/** Doing a piece of homework: answer, hand in, see what you got and why. */
export function HomeworkRunner({
  id,
  questions,
  previous,
}: {
  id: string;
  questions: { key: string; q: string; options: string[]; topic?: string }[];
  previous: { correct: number; total: number } | null;
}) {
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<{ correct: number; total: number; answers: number[]; explains: string[]; reward: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const left = answers.filter((a) => a < 0).length;

  return (
    <div className="space-y-4">
      {previous && !result && (
        <p className="rounded-2xl bg-secondary px-4 py-3 text-sm font-bold">
          You've handed this in ({previous.correct}/{previous.total}). You can try again to improve; your best score counts.
        </p>
      )}
      {questions.map((q, i) => {
        const key = result?.answers[i];
        return (
          <fieldset key={q.key} className="rounded-3xl border bg-card p-5">
            <legend className="sr-only">Question {i + 1}</legend>
            <p className="text-xs font-black tracking-widest text-muted-foreground uppercase">
              Question {i + 1}
              {q.topic ? ` · ${q.topic}` : ""}
            </p>
            <p className="mt-2 text-lg font-bold">{q.q}</p>
            <div className="mt-3 grid gap-2">
              {q.options.map((o, k) => (
                <label
                  key={k}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3",
                    result
                      ? k === key
                        ? "border-success bg-success-soft font-bold"
                        : k === answers[i]
                          ? "border-destructive bg-danger-soft"
                          : ""
                      : answers[i] === k
                        ? "border-primary bg-secondary font-bold"
                        : "hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name={q.key}
                    disabled={Boolean(result)}
                    checked={answers[i] === k}
                    onChange={() => setAnswers(answers.map((a, j) => (j === i ? k : a)))}
                    className="size-4 accent-[#1f4fbf]"
                  />
                  {o}
                </label>
              ))}
            </div>
            {result && <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.explains[i]}</p>}
          </fieldset>
        );
      })}
      {result ? (
        <div className="rounded-3xl bg-primary p-6 text-center text-primary-foreground">
          <p className="text-4xl font-black">
            {result.correct}/{result.total}
          </p>
          <p className="mt-1">{result.reward ? `+${result.reward} Clout for your first go` : "Saved. Your best score counts."}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/games/world" className="rounded-full bg-white px-5 py-2.5 font-bold text-[#13203a]">
              Back to London
            </Link>
            <button type="button" onClick={() => (setResult(null), setAnswers(questions.map(() => -1)))} className="rounded-full border border-white/60 px-5 py-2.5 font-bold">
              Try again
            </button>
          </div>
        </div>
      ) : (
        <div className="sticky bottom-20 flex items-center gap-3 rounded-3xl border bg-card p-4 shadow-lg md:bottom-4">
          <p className="flex-1 text-sm font-bold">{left ? `${left} question${left === 1 ? "" : "s"} left` : "All answered"}</p>
          <button
            type="button"
            disabled={pending || left > 0}
            onClick={() =>
              start(async () => {
                const r = await submitHomework(id, answers);
                if (!r.ok) return setError(r.error);
                setError(null);
                setResult(r.data);
                doActivity("homework");
                earnSeasonXp("homework");
                notifyPlayerChanged();
                router.refresh();
              })
            }
            className={btn}
          >
            {pending ? "Marking…" : "Hand in"}
          </button>
        </div>
      )}
      {error && <p className="text-sm font-bold text-destructive">{error}</p>}
    </div>
  );
}

export interface TopicOption {
  id: string;
  title: string;
  course: string;
  questions: number;
}

export function SetHomework({ classId, topics }: { classId: string; topics: TopicOption[] }) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [due, setDue] = useState(() => {
    const d = new Date(Date.now() + 7 * 86_400_000);
    d.setHours(17, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [course, setCourse] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [count, setCount] = useState(8);
  const { pending, msg, run } = useAction();
  const courses = useMemo(() => [...new Set(topics.map((t) => t.course))].sort(), [topics]);
  const shown = topics.filter((t) => !course || t.course === course);
  const available = topics.filter((t) => chosen.includes(t.id)).reduce((a, t) => a + t.questions, 0);

  return (
    <form
      className="rounded-3xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => setHomework({ classId, title, instructions, due: new Date(due).toISOString(), topics: chosen, count: Math.min(count, available) }), () => {
          setTitle("");
          setInstructions("");
          setChosen([]);
          return "Homework set. It's now a task in every student's game.";
        });
      }}
    >
      <p className="text-lg font-bold">Set homework</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">
          Title
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Redox: OIL RIG" className={input} />
        </label>
        <label className="text-sm font-bold">
          Due
          <input required type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={input} />
        </label>
      </div>
      <label className="mt-3 block text-sm font-bold">
        Instructions <span className="font-normal text-muted-foreground">(optional)</span>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={500} rows={2} className={input} />
      </label>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm font-bold">
          Course
          <select value={course} onChange={(e) => setCourse(e.target.value)} className={input}>
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          Questions
          <input type="number" min={1} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} className={cn(input, "w-24")} />
        </label>
      </div>
      <p className="mt-3 text-sm font-bold">Topics ({chosen.length} chosen · {available} questions available)</p>
      <div className="mt-2 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
        {shown.map((t) => {
          const on = chosen.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setChosen(on ? chosen.filter((c) => c !== t.id) : [...chosen, t.id])}
              className={cn("rounded-full border px-3 py-1.5 text-left text-sm", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {t.title} <span className="opacity-70">· {t.course}</span>
            </button>
          );
        })}
      </div>
      <button type="submit" disabled={pending || !chosen.length || !title} className={cn(btn, "mt-4")}>
        Set homework
      </button>
      <Note msg={msg} />
    </form>
  );
}

export function TeacherControls({ classId, kind, id, label }: { classId: string; kind: "student" | "homework" | "class"; id: string; label: string }) {
  const { pending, run } = useAction();
  const router = useRouter();
  const confirmText = {
    student: `Remove ${label} from this class? Their answers for this class are deleted.`,
    homework: `Delete "${label}"? Everyone's answers to it are deleted.`,
    class: `Delete ${label}? All its homework and every student's answers are deleted. This can't be undone.`,
  }[kind];
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={kind === "class" ? "Delete class" : `Remove ${label}`}
      onClick={() => {
        if (!window.confirm(confirmText)) return;
        if (kind === "student") run(() => removeStudent(classId, id));
        else if (kind === "homework") run(() => deleteHomework(classId, id));
        else
          run(
            () => deleteClass(classId),
            () => {
              router.push("/homework");
            },
          );
      }}
      className={cn(kind === "class" ? "rounded-full border border-destructive px-4 py-2 text-sm font-bold text-destructive" : "grid size-8 place-items-center rounded-full hover:bg-muted")}
    >
      {kind === "class" ? "Delete class" : <X className="size-4" />}
    </button>
  );
}
