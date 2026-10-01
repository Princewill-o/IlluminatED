"use client";

import { useActionState, useState } from "react";

import Link from "next/link";

import { Eye, EyeOff } from "lucide-react";

import { Status, Submit } from "./forms-common";

import { fieldCls, labelCls } from "@/components/kit";
import { updatePassword } from "@/lib/account/actions";
import { cn } from "@/lib/utils";

/** Choose a new password: used after a reset link, or from settings. */
export function PasswordForm() {
  const [state, action] = useActionState(updatePassword, null);
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== password;

  if (state?.ok)
    return (
      <div className="border-l-primary border-l-2 py-1 pl-5" role="status">
        <p className="font-semibold">Password changed</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Use your new password next time you sign in.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link
            href="/dashboard"
            className="text-primary underline underline-offset-4"
          >
            Go to your dashboard
          </Link>
          <Link
            href="/dashboard/settings"
            className="text-primary underline underline-offset-4"
          >
            Back to your details
          </Link>
        </div>
      </div>
    );

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="password" className={labelCls}>
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(fieldCls, "h-11 pr-11 text-base sm:text-sm")}
            aria-describedby="password-help"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center"
            aria-label={show ? "Hide passwords" : "Show passwords"}
          >
            {show ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
        <p id="password-help" className="text-muted-foreground mt-1.5 text-xs">
          At least 8 characters. A few random words together works well.
        </p>
      </div>
      <div>
        <label htmlFor="confirm" className={labelCls}>
          Type it again
        </label>
        <input
          id="confirm"
          name="confirm"
          type={show ? "text" : "password"}
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={cn(fieldCls, "h-11 text-base sm:text-sm")}
          aria-invalid={mismatch || undefined}
          aria-describedby={mismatch ? "confirm-help" : undefined}
        />
        {mismatch && (
          <p id="confirm-help" className="text-destructive mt-1.5 text-xs">
            The passwords don't match yet.
          </p>
        )}
      </div>
      <Submit
        pendingLabel="Saving…"
        disabled={password.length < 8 || password !== confirm}
      >
        Save new password
      </Submit>
      <Status state={state} />
    </form>
  );
}
