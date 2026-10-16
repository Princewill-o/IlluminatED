"use client";

import { useActionState } from "react";

import { type OpenState, openThread } from "@/app/messages/actions";

export function OpenForm({ to, adult }: { to: string; adult: boolean }) {
  const [state, action, pending] = useActionState<OpenState, FormData>(openThread, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="to" value={to} />
      {adult ? (
        <p className="rounded-2xl bg-foreground/[0.05] p-4 text-sm leading-6">
          Your conversation will be <strong>end-to-end encrypted</strong>. Only you and they can read it, not even IlluminatED.
          You can still report a message (that one message is shared with our safety team).
        </p>
      ) : (
        <>
          <p className="rounded-2xl bg-foreground/[0.05] p-4 text-sm leading-6">
            Because you&apos;re under 18, a <strong>parent or carer must approve</strong> this conversation first. We&apos;ll email
            them. Messages are checked for safety, our moderators can see them, and nobody can share phone numbers, emails or
            social media.
          </p>
          <div>
            <label className="text-sm font-semibold" htmlFor="guardian">
              Parent or carer&apos;s email
            </label>
            <input id="guardian" name="guardian" type="email" required className="bg-background mt-1.5 w-full rounded-xl border px-4 py-3" />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="understand" required className="mt-1 size-4" /> I understand how safeguarded chat works and
            I&apos;ll never share my contact details.
          </label>
        </>
      )}
      {state?.error && <p className="text-destructive text-sm font-semibold" role="alert">{state.error}</p>}
      <button disabled={pending} className="h-12 w-full rounded-full bg-[#f2d9a6] font-black text-[#0d1726] disabled:opacity-60">
        {pending ? "Starting…" : adult ? "Start conversation" : "Ask my parent or carer"}
      </button>
    </form>
  );
}
