"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { Status, Submit } from "./forms-common";

import { fieldCls, labelCls } from "@/components/kit";
import { saveDetails } from "@/lib/account/actions";
import {
  AGE_BANDS,
  type LearnerDetails,
  STAGES,
  YEAR_GROUPS,
} from "@/lib/account/details";
import { cn } from "@/lib/utils";

export interface SlimCourse {
  id: string;
  title: string;
  route: string;
  boards: { id: string; short: string }[];
}
export interface SlimTopic {
  id: string;
  title: string;
  courseId: string;
}

const STEPS = ["About you", "Your subjects", "What you need help with"];

const radioCard =
  "has-[:checked]:border-primary has-[:checked]:bg-primary/5 hover:bg-muted/60 flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring";

export function DetailsForm({
  mode,
  needsProfile,
  initial,
  next,
  courses,
  topics,
}: {
  mode: "onboarding" | "edit";
  needsProfile: boolean;
  initial: LearnerDetails | null;
  next: string;
  courses: SlimCourse[];
  topics: SlimTopic[];
}) {
  const [state, action] = useActionState(saveDetails, null);
  const stepped = mode === "onboarding";
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const [username, setUsername] = useState("");
  const [ageBand, setAgeBand] = useState<string>(initial?.ageBand ?? "");
  const [stage, setStage] = useState<string>(initial?.stage ?? "");
  const [yearGroup, setYearGroup] = useState<string>(initial?.yearGroup ?? "");
  const [subjects, setSubjects] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initial?.subjects ?? []).map((s) => [s.courseId, s.board]),
    ),
  );
  const [helpTopics, setHelpTopics] = useState<Set<string>>(
    () => new Set(initial?.helpTopics ?? []),
  );
  const [showAll, setShowAll] = useState(false);

  // The server tells us which step had the problem.
  useEffect(() => {
    if (state?.step !== undefined) setStep(state.step);
  }, [state]);

  const shownCourses = useMemo(() => {
    const own = courses.filter((c) => c.route === stage);
    if (showAll || !own.length) return courses;
    // Keep anything already picked visible even if it's from another route.
    return courses.filter((c) => c.route === stage || c.id in subjects);
  }, [courses, stage, showAll, subjects]);

  const chosenTopics = topics.filter((t) => t.courseId in subjects);

  const validate = (s: number): string | null => {
    if (s === 0) {
      if (needsProfile && !/^[A-Za-z0-9_]{3,20}$/.test(username))
        return "Choose a username: 3 to 20 letters, numbers or underscores.";
      if (!ageBand) return "Tell us your age range.";
      if (!stage) return "Choose what you're studying.";
      if (!yearGroup) return "Choose your year group.";
    }
    if (s === 1 && !Object.keys(subjects).length)
      return "Choose at least one subject.";
    return null;
  };

  const go = (to: number) => {
    if (to > step) {
      const err = validate(step);
      if (err) {
        setStepError(err);
        return;
      }
    }
    setStepError(null);
    setStep(to);
    top.current?.scrollIntoView({ block: "start" });
    top.current?.focus();
  };

  const toggleSubject = (c: SlimCourse) =>
    setSubjects((prev) => {
      const nextSubjects = { ...prev };
      if (c.id in nextSubjects) delete nextSubjects[c.id];
      else
        nextSubjects[c.id] = c.boards.length === 1 ? c.boards[0].id : "unsure";
      return nextSubjects;
    });

  const visible = (s: number) => !stepped || step === s;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const err = validate(0) ?? validate(1);
        if (err) {
          e.preventDefault();
          setStepError(err);
        } else setStepError(null);
      }}
      noValidate
    >
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />

      {stepped && (
        <div
          ref={top}
          tabIndex={-1}
          className="scroll-mt-24 outline-none"
          aria-live="polite"
        >
          <p className="text-muted-foreground text-sm">
            Step {step + 1} of {STEPS.length}
          </p>
          <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="Progress">
            {STEPS.map((label, i) => (
              <li key={label}>
                <span
                  className={cn(
                    "block h-1 rounded-full",
                    i <= step ? "bg-primary" : "bg-border",
                  )}
                />
                <span
                  className={cn(
                    "mt-2 hidden text-xs sm:block",
                    i === step ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Step 1: about you */}
      <fieldset hidden={!visible(0)} className="mt-8 space-y-7">
        <legend className="sr-only">About you</legend>
        {needsProfile && (
          <div>
            <label htmlFor="username" className={labelCls}>
              Username
            </label>
            <input
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              autoComplete="off"
              className={cn(fieldCls, "h-11 max-w-sm text-base sm:text-sm")}
              aria-describedby="username-help"
            />
            <p
              id="username-help"
              className="text-muted-foreground mt-1.5 text-xs"
            >
              Shown on IlluminatEDSocial. Don't use your real name. You can't
              change it later.
            </p>
          </div>
        )}
        <fieldset>
          <legend className={labelCls}>How old are you?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {AGE_BANDS.map((a) => (
              <label key={a.id} className={radioCard}>
                <input
                  type="radio"
                  name="ageBand"
                  value={a.id}
                  checked={ageBand === a.id}
                  onChange={() => setAgeBand(a.id)}
                  className="accent-[var(--primary)]"
                />
                {a.label}
              </label>
            ))}
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs">
            If you're under 18, we'll ask for a parent or guardian's email
            before a tutor can take your request.
          </p>
        </fieldset>
        <fieldset>
          <legend className={labelCls}>What are you studying?</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STAGES.map((s) => (
              <label key={s.id} className={radioCard}>
                <input
                  type="radio"
                  name="stage"
                  value={s.id}
                  checked={stage === s.id}
                  onChange={() => setStage(s.id)}
                  className="accent-[var(--primary)]"
                />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="yearGroup" className={labelCls}>
            Year group
          </label>
          <select
            id="yearGroup"
            name="yearGroup"
            value={yearGroup}
            onChange={(e) => setYearGroup(e.target.value)}
            className={cn(fieldCls, "h-11 max-w-sm")}
          >
            <option value="" disabled>
              Choose
            </option>
            {YEAR_GROUPS.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Step 2: subjects */}
      <fieldset hidden={!visible(1)} className="mt-8 space-y-6">
        <legend className={cn(labelCls, "text-base")}>
          Which subjects are you taking?
        </legend>
        <p className="text-muted-foreground mt-1 mb-2 text-sm">
          Pick every subject you'd like help with. Add your exam board if you
          know it, so we can link the right past papers.
        </p>
        <ul className="divide-y border-y">
          {shownCourses.map((c) => {
            const on = c.id in subjects;
            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="subject"
                    value={c.id}
                    checked={on}
                    onChange={() => toggleSubject(c)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <span className={on ? "font-medium" : undefined}>
                    {c.title}
                  </span>
                </label>
                {on && c.boards.length > 1 && (
                  <select
                    name={`board:${c.id}`}
                    value={subjects[c.id]}
                    onChange={(e) =>
                      setSubjects((p) => ({ ...p, [c.id]: e.target.value }))
                    }
                    aria-label={`Exam board for ${c.title}`}
                    className={cn(fieldCls, "h-9 w-auto")}
                  >
                    <option value="unsure">Board: not sure</option>
                    {c.boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.short}
                      </option>
                    ))}
                  </select>
                )}
                {on && c.boards.length === 1 && (
                  <>
                    <input
                      type="hidden"
                      name={`board:${c.id}`}
                      value={c.boards[0].id}
                    />
                    <span className="text-muted-foreground text-xs">
                      {c.boards[0].short}
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {!showAll && stage && stage !== "other" && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-primary text-sm underline underline-offset-4"
          >
            Show subjects from other qualifications
          </button>
        )}
        <div>
          <label htmlFor="examDate" className={labelCls}>
            Date of your first exam or deadline{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <input
            id="examDate"
            name="examDate"
            type="date"
            defaultValue={initial?.examDate ?? ""}
            className={cn(fieldCls, "h-11 max-w-xs")}
          />
        </div>
      </fieldset>

      {/* Step 3: help */}
      <fieldset hidden={!visible(2)} className="mt-8 space-y-6">
        <legend className={cn(labelCls, "text-base")}>
          What do you want help with?
        </legend>
        {chosenTopics.length > 0 ? (
          <div>
            <p className="text-muted-foreground mt-1 mb-2 text-sm">
              Tick the topics you find hardest. They'll go to the top of your
              dashboard.
            </p>
            <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
              {chosenTopics.map((t) => (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-start gap-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      name="helpTopic"
                      value={t.id}
                      checked={helpTopics.has(t.id)}
                      onChange={() =>
                        setHelpTopics((s) => {
                          const n = new Set(s);
                          if (n.has(t.id)) n.delete(t.id);
                          else n.add(t.id);
                          return n;
                        })
                      }
                      className="mt-0.5 size-4 accent-[var(--primary)]"
                    />
                    <span>
                      {t.title}
                      <span className="text-muted-foreground block text-xs">
                        {courses.find((c) => c.id === t.courseId)?.title}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground mt-1 mb-2 text-sm">
            We don't have topic pages for your subjects yet. Tell us below what
            you're finding hard.
          </p>
        )}
        <div>
          <label htmlFor="helpNote" className={labelCls}>
            Anything else you're finding hard?{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <textarea
            id="helpNote"
            name="helpNote"
            rows={3}
            maxLength={500}
            defaultValue={initial?.helpNote ?? ""}
            placeholder="For example: essay structure in English, or organic mechanisms in Chemistry"
            className={cn(fieldCls, "h-auto py-2.5 leading-relaxed")}
          />
        </div>
        {needsProfile && (
          <div className="space-y-3 border-t pt-6">
            <label className="flex gap-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                name="age"
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              I'm 13 or older.
            </label>
            <label className="flex gap-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                name="rules"
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>
                I've read the{" "}
                <a
                  href="/social/guidelines"
                  target="_blank"
                  className="text-primary underline underline-offset-4"
                >
                  community guidelines
                </a>{" "}
                and will follow them.
              </span>
            </label>
          </div>
        )}
      </fieldset>

      <div className="mt-10 flex flex-wrap items-center gap-4 border-t pt-6">
        {stepped && step > 0 && (
          <button
            type="button"
            onClick={() => go(step - 1)}
            className="hover:bg-muted h-11 rounded-md border px-5 text-sm font-medium"
          >
            Back
          </button>
        )}
        {stepped && step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => go(step + 1)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-md px-5 text-sm font-semibold"
          >
            Continue
          </button>
        ) : (
          <Submit>
            {stepped ? "Finish and go to dashboard" : "Save changes"}
          </Submit>
        )}
        {stepError ? (
          <p role="alert" className="text-destructive text-sm">
            {stepError}
          </p>
        ) : (
          <Status state={state} />
        )}
      </div>
    </form>
  );
}
