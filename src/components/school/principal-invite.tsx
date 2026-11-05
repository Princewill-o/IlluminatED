"use client";

import { useActionState } from "react";

import { inviteToSchool } from "@/app/principal/actions";

export function PrincipalInvite() {
  const [state, action, pending] = useActionState(inviteToSchool, null);
  return (
    <form action={action} className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-bold">Invite your school</h2>
      <p className="text-sm text-muted-foreground">Paste school email addresses, one per line or separated by commas. Each person signs up with that email and joins your school automatically.</p>
      <textarea name="emails" required rows={4} placeholder={"j.smith@school.org.uk\na.khan@school.org.uk"} className="w-full rounded-xl border bg-background p-3 text-sm" />
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-bold">As
          <select name="role" className="ml-2 rounded-xl border bg-background px-3 py-2"><option value="student">Students</option><option value="teacher">Teachers</option></select>
        </label>
        <button disabled={pending} className="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground disabled:opacity-50">{pending ? "Inviting…" : "Send invitations"}</button>
      </div>
      {state && <p role="status" className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</p>}
    </form>
  );
}
