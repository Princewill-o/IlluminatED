"use client";

import { useState, useTransition } from "react";

import { Building2, CalendarCheck, GraduationCap, School, User } from "lucide-react";

import { requestDemo } from "@/app/book/actions";
import { cn } from "@/lib/utils";

type Org = "individual" | "school" | "college" | "sixth-form" | "trust" | "other";
type Role = "student" | "parent" | "teacher" | "leader" | "other";

const WHO: { org: Org; label: string; sub: string; icon: typeof School }[] = [
  { org: "school", label: "A school", sub: "Secondary, Years 10 and 11", icon: School },
  { org: "sixth-form", label: "A sixth form", sub: "A levels and BTECs", icon: GraduationCap },
  { org: "college", label: "A college", sub: "FE, T Levels, resits", icon: Building2 },
  { org: "individual", label: "Just me", sub: "A student or parent", icon: User },
];

const field = "mt-1.5 block w-full rounded-2xl border border-input bg-background px-4 py-3 text-[15px] outline-none focus:border-primary focus:ring-4 focus:ring-primary/15";

export function BookForm({ initialOrg }: { initialOrg?: Org }) {
  const [org, setOrg] = useState<Org>(initialOrg ?? "school");
  const individual = org === "individual";
  const [role, setRole] = useState<Role>(individual ? "student" : "teacher");
  const [f, setF] = useState({ name: "", email: "", organisation: "", learners: "", times: "", message: "", website: "" });
  const [state, setState] = useState<{ ok: boolean; text: string; mailto?: string | null } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  if (state?.ok)
    return (
      <div className="rounded-[2rem] border bg-card p-8 text-center shadow-sm md:p-12">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
          <CalendarCheck className="size-8" aria-hidden />
        </span>
        <h2 className="mt-5 text-3xl font-bold tracking-tight">Request received</h2>
        <p className="mx-auto mt-3 max-w-md text-lg leading-relaxed text-muted-foreground">
          Thanks, {f.name.split(" ")[0]}. We&apos;ll email {f.email} within one working day to find a time, show you the platform and set up your access.
        </p>
        {state.mailto && (
          <a href={state.mailto} className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
            Send it by email too
          </a>
        )}
      </div>
    );

  return (
    <form
      className="rounded-[2rem] border bg-card p-6 shadow-sm md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await requestDemo({
            name: f.name,
            email: f.email,
            role,
            organisationType: org,
            organisation: f.organisation || undefined,
            learners: f.learners ? Number(f.learners) : undefined,
            times: f.times || undefined,
            message: f.message || undefined,
            website: f.website || undefined,
          });
          setState(r.ok ? { ok: true, text: "", mailto: r.mailto } : { ok: false, text: r.error });
        });
      }}
    >
      <fieldset>
        <legend className="text-sm font-bold">Who is it for?</legend>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {WHO.map(({ org: o, label, sub, icon: Icon }) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                setOrg(o);
                setRole(o === "individual" ? "student" : "teacher");
              }}
              aria-pressed={org === o}
              className={cn(
                "rounded-2xl border-2 p-4 text-left transition",
                org === o ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40",
              )}
            >
              <Icon className={cn("size-6", org === o ? "text-primary" : "text-muted-foreground")} aria-hidden />
              <span className="mt-3 block font-bold">{label}</span>
              <span className="block text-xs text-muted-foreground">{sub}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">
          Your name
          <input required value={f.name} onChange={set("name")} autoComplete="name" className={field} />
        </label>
        <label className="text-sm font-bold">
          Email
          <input required type="email" value={f.email} onChange={set("email")} autoComplete="email" className={field} />
        </label>
        <label className="text-sm font-bold">
          You are
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={field}>
            {individual ? (
              <>
                <option value="student">A student</option>
                <option value="parent">A parent or carer</option>
              </>
            ) : (
              <>
                <option value="teacher">A teacher</option>
                <option value="leader">A head, principal or senior leader</option>
                <option value="other">Other staff</option>
              </>
            )}
          </select>
        </label>
        {individual ? (
          <label className="text-sm font-bold">
            School or college <span className="font-normal text-muted-foreground">(optional)</span>
            <input value={f.organisation} onChange={set("organisation")} className={field} />
          </label>
        ) : (
          <label className="text-sm font-bold">
            {org === "college" ? "College" : org === "sixth-form" ? "Sixth form" : "School"} name
            <input required value={f.organisation} onChange={set("organisation")} className={field} />
          </label>
        )}
        {!individual && (
          <label className="text-sm font-bold">
            Roughly how many learners?
            <input type="number" min={1} max={100000} value={f.learners} onChange={set("learners")} placeholder="e.g. 180" className={field} />
          </label>
        )}
        <label className={cn("text-sm font-bold", individual && "sm:col-span-2")}>
          Good times for a 20-minute call
          <input value={f.times} onChange={set("times")} placeholder="e.g. Tues or Thurs after 3.30pm" className={field} />
        </label>
        <label className="text-sm font-bold sm:col-span-2">
          Anything we should know? <span className="font-normal text-muted-foreground">(optional)</span>
          <textarea value={f.message} onChange={set("message")} rows={3} maxLength={1000} className={field} />
        </label>
        <input tabIndex={-1} aria-hidden value={f.website} onChange={set("website")} className="hidden" autoComplete="off" />
      </div>

      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={pending} className="shrink-0 whitespace-nowrap rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {pending ? "Sending…" : "Book my demo"}
        </button>
        <p className="text-sm text-muted-foreground">
          {individual ? "Individual access is a monthly subscription. We'll go through it on the call." : "School and college bundles are priced per learner and agreed on the call."}
        </p>
      </div>
      {state && !state.ok && (
        <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
          {state.text}
        </p>
      )}
    </form>
  );
}
