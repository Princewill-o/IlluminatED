"use client";

import { useActionState, useState } from "react";

import type { SlimCourse, SlimTopic } from "@/components/account/details-form";
import { Status, Submit } from "@/components/account/forms-common";
import { fieldCls, labelCls } from "@/components/kit";
import { createTutorRequest } from "@/lib/tutor-actions";
import {
  HELP_TYPES,
  type Price,
  SPEEDS,
  formatPrice,
  hoursLabel,
} from "@/lib/tutoring";
import { cn } from "@/lib/utils";

const card =
  "has-[:checked]:border-primary has-[:checked]:bg-primary/5 hover:bg-muted/60 block cursor-pointer rounded-md border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring";

export function RequestForm({
  prices,
  mine,
  others,
  topics,
  under18,
  defaultCourse,
  defaultTopic,
}: {
  prices: Price[];
  mine: SlimCourse[];
  others: SlimCourse[];
  topics: SlimTopic[];
  under18: boolean;
  defaultCourse?: string;
  defaultTopic?: string;
}) {
  const [state, action] = useActionState(createTutorRequest, null);
  const [courseId, setCourseId] = useState(defaultCourse ?? mine[0]?.id ?? "");
  const [helpType, setHelpType] = useState("");
  const [speed, setSpeed] = useState("");
  const [details, setDetails] = useState("");
  const price = prices.find(
    (p) => p.helpType === helpType && p.speed === speed,
  );
  const courseTopics = topics.filter((t) => t.courseId === courseId);

  return (
    <form action={action} className="space-y-9">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="courseId" className={labelCls}>
            Subject
          </label>
          <select
            id="courseId"
            name="courseId"
            required
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className={cn(fieldCls, "h-11")}
          >
            <option value="" disabled>
              Choose a subject
            </option>
            {mine.length > 0 && (
              <optgroup label="Your subjects">
                {mine.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Other subjects">
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label htmlFor="topic" className={labelCls}>
            Topic{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <input
            id="topic"
            name="topic"
            list="topic-suggestions"
            maxLength={120}
            defaultValue={
              defaultTopic
                ? topics.find((t) => t.id === defaultTopic)?.title
                : ""
            }
            placeholder="e.g. Simultaneous equations"
            className={cn(fieldCls, "h-11")}
          />
          <datalist id="topic-suggestions">
            {courseTopics.map((t) => (
              <option key={t.id} value={t.title} />
            ))}
          </datalist>
        </div>
      </div>

      <fieldset>
        <legend className={cn(labelCls, "text-base")}>
          What kind of help?
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {HELP_TYPES.map((h) => (
            <label key={h.id} className={card}>
              <input
                type="radio"
                name="helpType"
                value={h.id}
                required
                checked={helpType === h.id}
                onChange={() => setHelpType(h.id)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold">{h.label}</span>
              <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                {h.description}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={cn(labelCls, "text-base")}>
          How quickly do you need a tutor?
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          {SPEEDS.map((s) => {
            const p = prices.find(
              (x) =>
                x.speed === s.id && x.helpType === (helpType || "homework"),
            );
            return (
              <label key={s.id} className={card}>
                <input
                  type="radio"
                  name="speed"
                  value={s.id}
                  required
                  checked={speed === s.id}
                  onChange={() => setSpeed(s.id)}
                  className="sr-only"
                />
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold">{s.label}</span>
                  {helpType && p && (
                    <span className="text-sm font-semibold tabular-nums">
                      {formatPrice(p.pricePence)}
                    </span>
                  )}
                </span>
                {p && (
                  <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                    Tutor within {hoursLabel(p.matchHours)}, replies within{" "}
                    {hoursLabel(p.replyHours)}. {s.summary}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="details" className={labelCls}>
          What do you need help with?
        </label>
        <textarea
          id="details"
          name="details"
          required
          minLength={20}
          maxLength={3000}
          rows={6}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe the question or task, what you've tried, and when it's due."
          className={cn(fieldCls, "h-auto py-2.5 leading-relaxed")}
        />
        <p className="text-muted-foreground mt-1.5 flex justify-between gap-4 text-xs">
          <span>
            Don't include your full name, school, email, phone number or social
            media.
          </span>
          <span className="tabular-nums">{details.length}/3000</span>
        </p>
      </div>

      <div>
        <label htmlFor="availability" className={labelCls}>
          When are you free?{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          id="availability"
          name="availability"
          maxLength={300}
          placeholder="e.g. Weekdays after 5pm, Saturday mornings"
          className={cn(fieldCls, "h-11")}
        />
      </div>

      {under18 && (
        <div>
          <label htmlFor="guardianEmail" className={labelCls}>
            Parent or guardian's email
          </label>
          <input
            id="guardianEmail"
            name="guardianEmail"
            type="email"
            required
            maxLength={200}
            autoComplete="off"
            className={cn(fieldCls, "h-11 max-w-md")}
            aria-describedby="guardian-help"
          />
          <p
            id="guardian-help"
            className="text-muted-foreground mt-1.5 text-xs leading-relaxed"
          >
            Because you're under 18, we'll contact them before a tutor starts.
            Only our team can see this, not tutors.
          </p>
        </div>
      )}

      {helpType === "coursework" && (
        <label className="flex max-w-2xl gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            name="integrity"
            required
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          I understand my tutor can guide me but won't write, rewrite or mark
          drafts of coursework that counts towards my grade.
        </label>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-6">
        <Submit pendingLabel="Sending…">Send request</Submit>
        <p className="text-sm" aria-live="polite">
          {price ? (
            <>
              <span className="font-semibold">
                {formatPrice(price.pricePence)}
              </span>{" "}
              <span className="text-muted-foreground">
                · nothing is charged now
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              Choose the kind of help and speed to see the price.
            </span>
          )}
        </p>
        <div className="w-full">
          <Status state={state} />
        </div>
      </div>
    </form>
  );
}
