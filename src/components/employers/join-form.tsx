"use client";

import { useActionState } from "react";

import Link from "next/link";

import { type EmployerState, requestEmployerCode, verifyEmployerCode } from "@/app/employers/actions";

const field = "mt-1.5 w-full rounded-xl border bg-background px-4 py-3";

export function JoinForm({
  needsProfile,
  sectors,
}: {
  needsProfile: boolean;
  sectors: { id: string; label: string }[];
}) {
  const [details, request, requesting] = useActionState<EmployerState, FormData>(requestEmployerCode, null);
  const [code, verify, verifying] = useActionState<EmployerState, FormData>(verifyEmployerCode, null);
  const step = code?.step ?? details?.step ?? "details";
  const email = code?.email ?? details?.email ?? "";

  if (step === "code")
    return (
      <form action={verify} className="bg-card rounded-3xl border p-6">
        <h2 className="text-xl font-bold">Check your inbox</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          We sent a 6-digit code to <strong>{email}</strong>. It expires in 15 minutes.
        </p>
        <input type="hidden" name="email" value={email} />
        <label className="mt-5 block text-sm font-semibold" htmlFor="code">
          Code
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          className={`${field} text-center text-2xl font-bold tracking-[0.5em]`}
        />
        {code?.error && <p className="text-destructive mt-3 text-sm font-semibold" role="alert">{code.error}</p>}
        <button disabled={verifying} className="bg-primary text-primary-foreground mt-5 h-12 w-full rounded-full font-semibold disabled:opacity-60">
          {verifying ? "Checking…" : "Verify and open my office"}
        </button>
      </form>
    );

  return (
    <form action={request} className="bg-card space-y-4 rounded-3xl border p-6">
      {needsProfile && (
        <div>
          <label className="text-sm font-semibold" htmlFor="username">
            Choose a username
          </label>
          <input id="username" name="username" required pattern="[A-Za-z0-9_]{3,20}" className={field} placeholder="e.g. sam_at_acme" />
          <p className="text-muted-foreground mt-1 text-xs">Shown on your badge and in messages. Don&apos;t use your full name if you&apos;d rather not.</p>
        </div>
      )}
      <div>
        <label className="text-sm font-semibold" htmlFor="company">
          Company name
        </label>
        <input id="company" name="company" required minLength={2} maxLength={60} className={field} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold" htmlFor="sector">
            Sector
          </label>
          <select id="sector" name="sector" required className={field} defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="title">
            Your job title
          </label>
          <input id="title" name="title" maxLength={80} className={field} placeholder="e.g. Graduate Recruiter" />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="website">
          Company website <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input id="website" name="website" className={field} placeholder="https://" />
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="email">
          Your work email
        </label>
        <input id="email" name="email" type="email" required className={field} placeholder="you@company.co.uk" />
        <p className="text-muted-foreground mt-1 text-xs">
          Must be your company address. Everyone who verifies with the same domain joins the same office.
        </p>
      </div>
      {needsProfile && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="adult" required className="mt-1 size-4" /> I&apos;m 18 or over and I work at this company.
        </label>
      )}
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="terms" required className="mt-1 size-4" />
        <span>
          I agree to the <Link href="/terms" className="underline">Terms</Link>, <Link href="/privacy" className="underline">Privacy policy</Link> and{" "}
          <Link href="/safeguarding" className="underline">safeguarding rules</Link>, including never asking learners for contact
          details or to move off IlluminatED.
        </span>
      </label>
      {details?.error && <p className="text-destructive text-sm font-semibold" role="alert">{details.error}</p>}
      <button disabled={requesting} className="bg-primary text-primary-foreground h-12 w-full rounded-full font-semibold disabled:opacity-60">
        {requesting ? "Sending code…" : "Email me a code"}
      </button>
    </form>
  );
}
