"use client";

import { useFormStatus } from "react-dom";

import type { FormState } from "@/lib/account/actions";
import { cn } from "@/lib/utils";

export function Submit({
  children,
  disabled,
  className,
  pendingLabel = "Saving…",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function Status({ state }: { state: FormState }) {
  if (!state?.error && !state?.message) return null;
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
