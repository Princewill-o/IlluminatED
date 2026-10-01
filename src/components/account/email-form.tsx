"use client";

import { useActionState } from "react";

import { Status, Submit } from "./forms-common";

import { fieldCls, labelCls } from "@/components/kit";
import { changeEmail } from "@/lib/account/actions";
import { cn } from "@/lib/utils";

/** Change the email on the account. Nothing changes until the confirmation link is opened. */
export function EmailForm() {
  const [state, action] = useActionState(changeEmail, null);
  if (state?.ok)
    return (
      <div className="border-l-primary border-l-2 py-1 pl-5" role="status">
        <p className="font-semibold">Check your email</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {state.message}
        </p>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="new-email" className={labelCls}>
          New email address
        </label>
        <input
          id="new-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={200}
          className={cn(fieldCls, "h-11 max-w-sm text-base sm:text-sm")}
          aria-describedby="new-email-help"
        />
        <p id="new-email-help" className="text-muted-foreground mt-1.5 text-xs">
          We'll send a confirmation link. Your email only changes once you open
          it.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Submit pendingLabel="Sending…">Change email</Submit>
        <Status state={state} />
      </div>
    </form>
  );
}
