"use client";

import { useActionState, useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { Status, Submit } from "./forms-common";

import { fieldCls, labelCls } from "@/components/kit";
import {
  sendSignInLink,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/account/actions";
import { cn } from "@/lib/utils";

type Mode = "sign-in" | "sign-up" | "link";

function CheckEmail({ message, next }: { message?: string; next: string }) {
  return (
    <div className="border-l-primary border-l-2 py-1 pl-5" role="status">
      <p className="font-semibold">Check your email</p>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        {message}
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
}

function PasswordField({ newPassword }: { newPassword: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor="password" className={labelCls}>
        Password
      </label>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          required
          minLength={newPassword ? 8 : undefined}
          maxLength={72}
          autoComplete={newPassword ? "new-password" : "current-password"}
          className={cn(fieldCls, "h-11 pr-11 text-base sm:text-sm")}
          aria-describedby={newPassword ? "password-help" : undefined}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
      {newPassword && (
        <p id="password-help" className="text-muted-foreground mt-1.5 text-xs">
          At least 8 characters.
        </p>
      )}
    </div>
  );
}

function EmailField() {
  return (
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
        className={cn(fieldCls, "h-11 text-base sm:text-sm")}
      />
    </div>
  );
}

function PasswordForm({
  mode,
  next,
}: {
  mode: "sign-in" | "sign-up";
  next: string;
}) {
  const [state, action] = useActionState(
    mode === "sign-in" ? signInWithPassword : signUpWithPassword,
    null,
  );
  if (state?.ok) return <CheckEmail message={state.message} next={next} />;
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <EmailField />
      <PasswordField newPassword={mode === "sign-up"} />
      <Submit
        pendingLabel={mode === "sign-in" ? "Signing in…" : "Creating account…"}
      >
        {mode === "sign-in" ? "Sign in" : "Create account"}
      </Submit>
      <Status state={state} />
    </form>
  );
}

function LinkForm({ next }: { next: string }) {
  const [state, action] = useActionState(sendSignInLink, null);
  if (state?.ok) return <CheckEmail message={state.message} next={next} />;
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <EmailField />
      <p className="text-muted-foreground -mt-2 text-xs">
        We'll email you a one-time link instead of using a password.
      </p>
      <Submit pendingLabel="Sending…">Email me a sign-in link</Submit>
      <Status state={state} />
    </form>
  );
}

export function SignInForm({
  next,
  disabled,
  initialMode = "sign-in",
}: {
  next: string;
  disabled?: boolean;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  return (
    <fieldset disabled={disabled} className="min-w-0">
      {mode !== "link" && (
        <div
          role="tablist"
          aria-label="Sign in or create an account"
          className="bg-muted mb-6 grid grid-cols-2 gap-1 rounded-lg p-1"
        >
          {(
            [
              ["sign-in", "Sign in"],
              ["sign-up", "Create account"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={cn(
                "h-9 rounded-md text-sm font-medium transition-colors",
                mode === id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === "link" ? (
        <LinkForm next={next} />
      ) : (
        <PasswordForm key={mode} mode={mode} next={next} />
      )}

      <p className="text-muted-foreground mt-6 border-t pt-5 text-sm">
        {mode === "link" ? (
          <button
            type="button"
            onClick={() => setMode("sign-in")}
            className="text-primary underline underline-offset-4"
          >
            Use a password instead
          </button>
        ) : (
          <>
            Forgot your password, or prefer no password?{" "}
            <button
              type="button"
              onClick={() => setMode("link")}
              className="text-primary underline underline-offset-4"
            >
              Email me a sign-in link
            </button>
          </>
        )}
      </p>
    </fieldset>
  );
}
