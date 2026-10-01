"use client";

import { useActionState } from "react";

import { DBS_OPTIONS, LEVEL_OPTIONS } from "./options";

import { Status, Submit } from "@/components/account/forms-common";
import { fieldCls, labelCls } from "@/components/kit";
import { applyToTutor } from "@/lib/tutor-actions";
import { cn } from "@/lib/utils";

const area = cn(fieldCls, "h-auto py-2.5 leading-relaxed");

export function ApplyForm() {
  const [state, action] = useActionState(applyToTutor, null);
  if (state?.ok) return <Status state={state} />;
  return (
    <form action={action} className="max-w-2xl space-y-6">
      <div>
        <label htmlFor="fullName" className={labelCls}>
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          className={cn(fieldCls, "h-11 max-w-md")}
        />
        <p className="text-muted-foreground mt-1.5 text-xs">
          As it appears on your ID and DBS certificate. Learners only see your
          username.
        </p>
      </div>

      <div>
        <label htmlFor="subjects" className={labelCls}>
          Subjects
        </label>
        <input
          id="subjects"
          name="subjects"
          required
          minLength={2}
          maxLength={500}
          placeholder="e.g. Maths, Physics, Further Maths"
          className={cn(fieldCls, "h-11")}
        />
      </div>

      <fieldset>
        <legend className={labelCls}>Levels</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {LEVEL_OPTIONS.map((l) => (
            <label key={l.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="levels"
                value={l.id}
                className="size-4 accent-[var(--primary)]"
              />
              {l.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="experience" className={labelCls}>
          Teaching or tutoring experience
        </label>
        <textarea
          id="experience"
          name="experience"
          required
          minLength={20}
          maxLength={3000}
          rows={5}
          className={area}
        />
      </div>

      <div>
        <label htmlFor="qualifications" className={labelCls}>
          Qualifications
        </label>
        <textarea
          id="qualifications"
          name="qualifications"
          required
          minLength={2}
          maxLength={2000}
          rows={3}
          placeholder="e.g. BSc Mathematics (2:1), PGCE, QTS"
          className={area}
        />
      </div>

      <div>
        <label htmlFor="dbs" className={labelCls}>
          DBS certificate
        </label>
        <select
          id="dbs"
          name="dbs"
          required
          defaultValue=""
          className={cn(fieldCls, "h-11 max-w-md")}
        >
          <option value="" disabled>
            Choose
          </option>
          {DBS_OPTIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
          You need an enhanced DBS check before you can tutor anyone under 18.
          If you don't have one yet, you can still apply and we'll explain the
          next steps.
        </p>
      </div>

      <div>
        <label htmlFor="statement" className={labelCls}>
          Why would you like to tutor with IlluminatED?
        </label>
        <textarea
          id="statement"
          name="statement"
          required
          minLength={20}
          maxLength={3000}
          rows={5}
          className={area}
        />
      </div>

      <label className="flex gap-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          name="adult"
          required
          className="mt-0.5 size-4 accent-[var(--primary)]"
        />
        I confirm I'm 18 or over.
      </label>

      <div className="flex flex-wrap items-center gap-4 border-t pt-6">
        <Submit pendingLabel="Sending…">Send application</Submit>
        <Status state={state} />
      </div>
    </form>
  );
}
