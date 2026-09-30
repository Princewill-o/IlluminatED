"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { useFormStatus } from "react-dom";

import {
  createReply,
  createThread,
  deleteAccount,
  type FormState,
  reportContent,
} from "@/app/social/actions";
import { CATEGORIES, REPORT_REASONS } from "@/lib/social/config";
import { cn } from "@/lib/utils";

const field =
  "bg-card border-input focus-visible:ring-ring w-full rounded-md border px-3 text-base outline-none focus-visible:ring-2 disabled:opacity-60 sm:text-sm";
const label = "mb-1.5 block text-sm font-medium";

function Submit({
  children,
  disabled,
  className,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

function Status({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={cn(
        "text-sm",
        state.error ? "text-destructive" : "text-success",
      )}
    >
      {state.error ?? state.message}
    </p>
  );
}

export function NewThreadForm({
  defaultCategory,
  defaultUniversity,
  disabled,
}: {
  defaultCategory?: string;
  defaultUniversity?: string;
  disabled?: boolean;
}) {
  const [state, action] = useActionState(createThread, null);
  const [category, setCategory] = useState(defaultCategory ?? "");
  const [body, setBody] = useState("");
  return (
    <form action={action} className="space-y-5">
      <fieldset disabled={disabled} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className={label}>
              Category
            </label>
            <select
              id="category"
              name="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={cn(field, "h-11")}
            >
              <option value="" disabled>
                Choose a category
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="university" className={label}>
              University{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <input
              id="university"
              name="university"
              defaultValue={defaultUniversity}
              maxLength={80}
              placeholder="e.g. University of Leeds"
              className={cn(field, "h-11")}
            />
            <p className="text-muted-foreground mt-1.5 text-xs">
              Use the full official name so it groups with other threads.
            </p>
          </div>
        </div>
        <div>
          <label htmlFor="title" className={label}>
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            minLength={5}
            maxLength={120}
            className={cn(field, "h-11")}
          />
        </div>
        <div>
          <label htmlFor="body" className={label}>
            Your post
          </label>
          <textarea
            id="body"
            name="body"
            required
            minLength={10}
            maxLength={5000}
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={cn(field, "py-2.5 leading-relaxed")}
          />
          <p className="text-muted-foreground mt-1.5 flex justify-between text-xs">
            <span>
              Don't share your full name, school, email, phone number or social
              media handles.
            </span>
            <span className="tabular-nums">{body.length}/5000</span>
          </p>
        </div>
        <Submit>Post thread</Submit>
      </fieldset>
      <Status state={state} />
    </form>
  );
}

export function ReplyForm({ threadId }: { threadId: number }) {
  const [state, action] = useActionState(createReply, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="threadId" value={threadId} />
      <label htmlFor="reply" className={label}>
        Your reply
      </label>
      <textarea
        id="reply"
        name="body"
        required
        maxLength={5000}
        rows={5}
        className={cn(field, "py-2.5 leading-relaxed")}
      />
      <div className="flex flex-wrap items-center gap-4">
        <Submit>Post reply</Submit>
        <Status state={state} />
      </div>
    </form>
  );
}

export function ReportButton({
  kind,
  id,
  canReport,
}: {
  kind: "thread" | "post";
  id: number;
  canReport: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(reportContent, null);
  if (state?.ok)
    return (
      <span className="text-muted-foreground text-xs">{state.message}</span>
    );
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground text-xs"
      >
        Report
      </button>
      {open &&
        (canReport ? (
          <form
            action={action}
            className="bg-card mt-3 max-w-md space-y-3 rounded-lg border p-4"
          >
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={id} />
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">
                What's wrong?
              </legend>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    required
                    className="accent-[var(--primary)]"
                  />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <textarea
              name="note"
              maxLength={300}
              rows={2}
              placeholder="Anything else moderators should know (optional)"
              className={cn(field, "py-2")}
            />
            <p className="text-muted-foreground text-xs">
              If someone is in danger right now, call 999. For support, see{" "}
              <a
                href="/social/guidelines#help"
                className="text-primary underline"
              >
                who to talk to
              </a>
              .
            </p>
            <div className="flex items-center gap-3">
              <Submit>Send report</Submit>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground text-sm"
              >
                Cancel
              </button>
            </div>
            <Status state={state} />
          </form>
        ) : (
          <p className="text-muted-foreground mt-2 text-xs">
            <a href="/sign-in" className="text-primary underline">
              Sign in
            </a>{" "}
            to report this.
          </p>
        ))}
    </div>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, null);
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="confirm" className={label}>
        Type DELETE to confirm
      </label>
      <input
        id="confirm"
        name="confirm"
        autoComplete="off"
        className={cn(field, "h-10 max-w-xs")}
      />
      <div>
        <button
          type="submit"
          className="border-destructive text-destructive rounded-md border px-4 py-2 text-sm font-semibold"
        >
          Delete my account and posts
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}
