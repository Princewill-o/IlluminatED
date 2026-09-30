"use client";

import { useActionState } from "react";

import { Status, Submit } from "./forms-common";

import { fieldCls, labelCls } from "@/components/kit";
import { sendSignInLink } from "@/lib/account/actions";

export function SignInForm({
  next,
  disabled,
}: {
  next: string;
  disabled?: boolean;
}) {
  const [state, action] = useActionState(sendSignInLink, null);
  if (state?.ok)
    return (
      <div className="border-l-primary border-l-2 py-1 pl-5" role="status">
        <p className="font-semibold">Check your email</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {state.message}
        </p>
        <p className="text-muted-foreground mt-3 text-sm">
          Nothing arrived after a few minutes? Check your spam folder, then{" "}
          <a
            href={`/sign-in?next=${encodeURIComponent(next)}`}
            className="text-primary underline underline-offset-4"
          >
            try again
          </a>
          .
        </p>
      </div>
    );
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className={labelCls}>
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={200}
          className={fieldCls}
          disabled={disabled}
          aria-describedby="email-help"
        />
        <p id="email-help" className="text-muted-foreground mt-1.5 text-xs">
          We'll email you a one-time link, so there's no password to remember.
          New here? The same link creates your account.
        </p>
      </div>
      <Submit disabled={disabled} pendingLabel="Sending…">
        Email me a sign-in link
      </Submit>
      <Status state={state} />
    </form>
  );
}
