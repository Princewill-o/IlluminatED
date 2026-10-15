"use client";

import { useActionState } from "react";

import { type EmployerState, addSlot, postAdvice, updateOrg } from "@/app/employers/actions";

const field = "mt-1.5 w-full rounded-xl border bg-background px-4 py-3";
const ACCENTS = ["#6bc6ff", "#ffd166", "#ff8fd1", "#5fd3a5", "#c6f36b", "#ffb26b", "#c49bff", "#ff7a6b"];

function Status({ s }: { s: EmployerState }) {
  if (!s) return null;
  return (
    <p role="status" className={`mt-3 text-sm font-semibold ${s.error ? "text-destructive" : "text-ink-mint"}`}>
      {s.error ?? s.ok}
    </p>
  );
}

export function ProfileForm({
  about,
  website,
  accent,
  sector,
  sectors,
  canEdit,
}: {
  about: string | null;
  website: string | null;
  accent: string;
  sector: string;
  sectors: { id: string; label: string }[];
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState<EmployerState, FormData>(updateOrg, null);
  return (
    <form action={action}>
      <fieldset disabled={!canEdit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold" htmlFor="about">
            About your company
          </label>
          <textarea id="about" name="about" defaultValue={about ?? ""} maxLength={600} rows={4} className={field} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold" htmlFor="website">
              Website
            </label>
            <input id="website" name="website" defaultValue={website ?? ""} className={field} placeholder="https://" />
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="sector">
              Sector
            </label>
            <select id="sector" name="sector" defaultValue={sector} className={field}>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Office colour</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ACCENTS.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="accent" value={c} defaultChecked={c === accent} className="peer sr-only" />
                <span
                  className="block size-10 rounded-full border-4 border-transparent peer-checked:border-white peer-focus-visible:ring-2"
                  style={{ background: c }}
                  aria-label={c}
                />
              </label>
            ))}
          </div>
        </div>
        {canEdit && (
          <button disabled={pending} className="bg-primary text-primary-foreground h-11 rounded-full px-6 font-semibold">
            Save profile
          </button>
        )}
      </fieldset>
      {!canEdit && <p className="text-muted-foreground mt-3 text-sm">Only your company&apos;s owner can edit this.</p>}
      <Status s={state} />
    </form>
  );
}

export function AdviceForm() {
  const [state, action, pending] = useActionState<EmployerState, FormData>(postAdvice, null);
  return (
    <form action={action} className="space-y-3">
      <input name="title" required minLength={5} maxLength={120} className={field} placeholder="e.g. What we look for in apprentice applications" />
      <textarea name="body" required minLength={10} maxLength={2000} rows={4} className={field} placeholder="Your advice…" />
      <button disabled={pending} className="bg-primary text-primary-foreground h-11 rounded-full px-6 font-semibold">
        Publish advice
      </button>
      <Status s={state} />
    </form>
  );
}

export function SlotForm() {
  const [state, action, pending] = useActionState<EmployerState, FormData>(addSlot, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">
        Date
        <input type="date" name="date" required className={field} />
      </label>
      <label className="text-sm font-semibold">
        Start (UK time)
        <input type="time" name="time" required step={900} className={field} />
      </label>
      <label className="text-sm font-semibold">
        Length
        <select name="minutes" defaultValue="30" className={field}>
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="45">45 minutes</option>
          <option value="60">1 hour</option>
        </select>
      </label>
      <label className="text-sm font-semibold">
        Room
        <select name="room" className={field}>
          <option>Meeting Room A</option>
          <option>Meeting Room B</option>
        </select>
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Repeat weekly
        <select name="repeat" defaultValue="1" className={field}>
          <option value="1">Just once</option>
          <option value="2">For 2 weeks</option>
          <option value="4">For 4 weeks</option>
        </select>
      </label>
      <div className="sm:col-span-2">
        <button disabled={pending} className="bg-primary text-primary-foreground h-11 rounded-full px-6 font-semibold">
          Add office hours
        </button>
        <Status s={state} />
      </div>
    </form>
  );
}
