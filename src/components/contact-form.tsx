"use client";

import { useActionState, useState } from "react";

import { Submit } from "@/components/account/forms-common";
import { CrisisHelp } from "@/components/crisis-help";
import { fieldCls, labelCls } from "@/components/kit";
import { type ContactState, sendContactMessage } from "@/lib/contact-actions";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/site";
import { cn } from "@/lib/utils";

export function ContactForm({
  initialTopic,
  defaultEmail,
  disabled = false,
}: {
  initialTopic?: ContactTopic;
  defaultEmail?: string | null;
  disabled?: boolean;
}) {
  const [state, action] = useActionState<ContactState, FormData>(
    sendContactMessage,
    null,
  );
  const [topic, setTopic] = useState<string>(initialTopic ?? "");
  const [length, setLength] = useState(0);

  if (state?.ok)
    return (
      <div className="space-y-6">
        <div
          role="status"
          className="bg-success-soft rounded-xl p-5 text-sm leading-relaxed"
        >
          <p className="font-semibold">Thanks, your message has been sent.</p>
          <p className="mt-1">
            We'll reply to the email address you gave us, usually within 3
            working days.
            {state.topic === "safeguarding" &&
              " Safeguarding messages go to the top of our list and are read first."}
          </p>
        </div>
        {state.topic === "safeguarding" && <CrisisHelp compact />}
      </div>
    );

  return (
    <form
      action={action}
      className="bg-card relative space-y-4 overflow-hidden rounded-xl border p-5 md:p-6"
      aria-label="Contact us"
    >
      {/* Honeypot: hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0">
        <label htmlFor="ct-website">Leave this empty</label>
        <input
          id="ct-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="ct-topic" className={labelCls}>
          What's it about?
        </label>
        <select
          id="ct-topic"
          name="topic"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={fieldCls}
        >
          <option value="" disabled>
            Choose a topic
          </option>
          {CONTACT_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {topic === "safeguarding" && (
        <p className="bg-danger-soft rounded-md px-3 py-2 text-sm leading-relaxed">
          If someone is in danger right now, call <strong>999</strong>. You can
          also call Childline free on <strong>0800 1111</strong>, any time.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ct-name" className={labelCls}>
            Name or username{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <input
            id="ct-name"
            name="name"
            maxLength={80}
            autoComplete="nickname"
            className={fieldCls}
          />
        </div>
        <div>
          <label htmlFor="ct-email" className={labelCls}>
            Email for our reply
          </label>
          <input
            id="ct-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            defaultValue={defaultEmail ?? ""}
            className={fieldCls}
          />
        </div>
      </div>
      <div>
        <label htmlFor="ct-message" className={labelCls}>
          Your message
        </label>
        <textarea
          id="ct-message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={7}
          onChange={(e) => setLength(e.target.value.length)}
          aria-describedby="ct-message-hint"
          className={cn(fieldCls, "h-auto py-2.5 leading-relaxed")}
        />
        <p
          id="ct-message-hint"
          className="text-muted-foreground mt-1.5 flex justify-between gap-4 text-xs"
        >
          <span>
            If you're reporting a post or a person, include a link or their
            username.
          </span>
          <span className="tabular-nums">{length} / 4,000</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Submit disabled={disabled} pendingLabel="Sending…">
          Send message
        </Submit>
        {state?.error && (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
