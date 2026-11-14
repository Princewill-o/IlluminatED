"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  HelpCircle,
  Save,
  Smartphone,
} from "lucide-react";

import { saveRepairProject } from "@/app/world/tech-repair-trainee/actions";
import {
  emptyRepairAnswers,
  markRepairCalculations,
  normaliseRepairAnswers,
  pounds,
  projectStatusLabel,
  REPAIR_DEVICES,
  repairSubmissionErrors,
  type DeviceAnswer,
  type RepairAnswers,
  type RepairDevice,
  type RepairProject,
} from "@/lib/illum-world/repair";
import { MISSION_HELP } from "@/lib/learning/mission-help";

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:cursor-wait disabled:opacity-60";

export function DeviceIllustration({ device }: { device: RepairDevice }) {
  return (
    <figure className="bg-muted rounded-2xl p-5">
      <svg
        viewBox="0 0 260 190"
        role="img"
        aria-label={`${device.name}: ${device.condition}`}
        className="mx-auto h-44 w-full max-w-xs"
      >
        <rect x="81" y="5" width="98" height="176" rx="18" fill="#192337" />
        <rect
          x="88"
          y="15"
          width="84"
          height="153"
          rx="11"
          fill={device.id === "ember-e3" ? "#344057" : device.colour}
        />
        <rect x="111" y="18" width="38" height="6" rx="3" fill="#192337" />
        {device.id === "raven-r4" && (
          <path
            d="m166 103-24 27 13 6-27 24m15-30-22-9m34 15 11 7"
            stroke="white"
            strokeWidth="3"
            fill="none"
          />
        )}
        {device.id === "kite-k2" && (
          <>
            <path
              d="M127 182v-16m-8 29 8-13 8 13"
              stroke="#e89d26"
              strokeWidth="4"
              fill="none"
            />
            <path d="M101 82h56m-56 13h38" stroke="white" strokeWidth="4" />
          </>
        )}
        {device.id === "ember-e3" && (
          <>
            <path
              d="M130 77v24m-10-21a24 24 0 1 0 20 0"
              stroke="#bac3d4"
              strokeWidth="4"
              fill="none"
            />
            <circle cx="167" cy="159" r="6" fill="#fb7185" />
          </>
        )}
        <path
          d="M54 66h21m110 62h24"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
        <circle cx="49" cy="66" r="4" fill="currentColor" />
        <circle cx="214" cy="128" r="4" fill="currentColor" />
      </svg>
      <figcaption className="text-muted-foreground mt-2 text-center text-xs">
        Fictional device · original inspection illustration
      </figcaption>
    </figure>
  );
}

export function RepairMission({
  assignment,
  initial,
  signedIn,
  userId,
  loadError,
}: {
  assignment: string | null;
  initial: RepairProject | null;
  signedIn: boolean;
  userId: string | null;
  loadError: string | null;
}) {
  const [answers, setAnswers] = useState<RepairAnswers>(
    initial?.answers ?? emptyRepairAnswers,
  );
  const [project, setProject] = useState(initial);
  const [restored, setRestored] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState(
    initial ? "Saved to your account" : "Your draft will save on this device",
  );
  const [error, setError] = useState(loadError);
  const [busy, setBusy] = useState(false);
  const [marking, setMarking] = useState(false);
  const [help, setHelp] = useState("maths");
  const [guestDraft, setGuestDraft] = useState<RepairAnswers | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const editVersion = useRef(0);
  const manualSavePending = useRef(false);
  const storageKey = `illumworld:repair:${userId ?? "guest"}:${assignment ?? "independent"}`;
  const guestKey = `illumworld:repair:guest:${assignment ?? "independent"}`;
  const locked =
    project?.status === "submitted" || project?.status === "approved";
  const results = marking ? markRepairCalculations(answers) : [];
  const nextPath = `/world/tech-repair-trainee${assignment ? `?assignment=${assignment}` : ""}`;

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem(storageKey) ?? "null") as {
        answers?: unknown;
        updatedAt?: number;
      } | null;
      if (
        !locked &&
        local?.answers &&
        (!initial ||
          Number(local.updatedAt) > new Date(initial.updated_at).getTime())
      ) {
        setAnswers(normaliseRepairAnswers(local.answers));
        editVersion.current += 1;
        setDirty(true);
        setSaveState("Recovered your draft from this device");
      } else if (userId && !locked) {
        // Work started before signing in is kept under the guest key. Offer it
        // explicitly rather than merging silently: school laptops are shared.
        const guest = JSON.parse(localStorage.getItem(guestKey) ?? "null") as {
          answers?: unknown;
        } | null;
        const draft = guest?.answers
          ? normaliseRepairAnswers(guest.answers)
          : null;
        if (draft && hasRepairWork(draft)) setGuestDraft(draft);
      }
    } catch {
      /* Cloud draft or empty form remains available. */
    }
    setRestored(true);
  }, [storageKey, guestKey, userId, initial, locked]);

  useEffect(() => {
    if (!restored || !dirty || locked) return;
    const version = editVersion.current;
    let storedOnDevice = false;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ answers, updatedAt: Date.now() }),
      );
      storedOnDevice = true;
      setSaveState("Saved on this device · syncing…");
    } catch {
      setSaveState(
        "This browser cannot store drafts. Save to your account before leaving.",
      );
    }
    if (!signedIn) {
      if (storedOnDevice)
        setSaveState("Saved on this device · sign in for cloud saving");
      return;
    }
    timer.current = setTimeout(() => {
      queue.current = queue.current
        .then(async () => {
          const result = await saveRepairProject(assignment, answers);
          if (result.ok) {
            setProject(result.project);
            // An earlier save can finish while newer edits are waiting. Only
            // the latest version may announce that all current work is saved.
            if (version === editVersion.current) {
              setSaveState("Saved to your account");
              setError(null);
            }
          } else {
            if (version === editVersion.current) {
              setError(result.error);
              setSaveState(
                storedOnDevice
                  ? "Cloud save pending · draft stays on this device"
                  : "Cloud save pending · keep this tab open",
              );
            }
          }
        })
        .catch(() => {
          setSaveState("Cloud save pending · retry before leaving");
        });
    }, 1400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [answers, assignment, dirty, locked, restored, signedIn, storageKey]);

  function applyGuestDraft(keep: boolean) {
    if (keep && guestDraft) {
      setAnswers(guestDraft);
      editVersion.current += 1;
      setDirty(true);
      setSaveState("Draft from before you signed in · syncing…");
    }
    try {
      localStorage.removeItem(guestKey);
    } catch {
      /* Nothing else to clear. */
    }
    setGuestDraft(null);
  }
  function updateDevice(id: string, change: Partial<DeviceAnswer>) {
    editVersion.current += 1;
    setDirty(true);
    setAnswers((a) => ({
      ...a,
      devices: a.devices.map((d) => (d.id === id ? { ...d, ...change } : d)),
    }));
  }
  async function save(submit: boolean) {
    if (manualSavePending.current) return;
    if (timer.current) clearTimeout(timer.current);
    setError(null);
    if (submit) {
      const errors = repairSubmissionErrors(answers);
      if (errors.length) {
        setError(errors.join(" "));
        return;
      }
    }
    manualSavePending.current = true;
    setBusy(true);
    try {
      await queue.current;
      const result = await saveRepairProject(assignment, answers, submit);
      if (result.ok) {
        setProject(result.project);
        setDirty(false);
        setSaveState("Saved to your account");
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* Saved in cloud. */
        }
      } else setError(result.error);
    } catch {
      setError("Connection interrupted. Keep this tab open and retry saving.");
    } finally {
      manualSavePending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6">
      <nav
        aria-label="Mission breadcrumbs"
        className="flex flex-wrap gap-3 text-sm"
      >
        <Link href="/world" className="font-bold underline underline-offset-4">
          IllumWorld
        </Link>
        <span aria-hidden>/</span>
        <span>Repair shop</span>
        <Link
          href="/world/my-work"
          className="ml-auto font-bold underline underline-offset-4"
        >
          My Work
        </Link>
      </nav>
      <header className="my-8 max-w-3xl">
        <p className="text-primary text-sm font-bold tracking-widest uppercase">
          Year 10 · 35–40 minutes · Virtual work experience
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Tech Repair Trainee
        </h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
          Three phones. A £25 profit target. Recommend which devices the shop
          should take on, then write a report a customer can trust.
        </p>
      </header>
      <div className="bg-card mb-6 flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4">
        <Save className="text-primary size-5" aria-hidden />
        <p role="status" className="flex-1 text-sm">
          {saveState}
        </p>
        {project && (
          <span className="bg-secondary rounded-full px-3 py-1 text-xs font-bold">
            {projectStatusLabel(project.status)}
          </span>
        )}
        <button
          onClick={() => void save(false)}
          disabled={busy || locked || !signedIn}
          className="min-h-11 rounded-xl border px-4 text-sm font-bold"
        >
          Save now
        </button>
      </div>
      {!signedIn && (
        <p className="bg-secondary mb-6 rounded-xl p-4 text-sm">
          Try the complete mission here.{" "}
          <Link
            className="font-bold underline"
            href={`/sign-in?next=${encodeURIComponent(nextPath)}`}
          >
            Sign in with your shared account
          </Link>{" "}
          to save in My Work and hand in an assignment. This device draft is
          separate from your account draft.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 mb-6 rounded-xl border p-4 text-sm"
        >
          {error}
        </p>
      )}
      {guestDraft && (
        <section
          className="border-primary/40 bg-primary/5 mb-6 rounded-2xl border p-5"
          aria-labelledby="guest-draft-heading"
        >
          <h2 id="guest-draft-heading" className="font-bold">
            Continue the draft you started before signing in?
          </h2>
          <p className="mt-2 text-sm">
            This browser has unsaved mission answers from before you signed
            in. Only use them if they are yours.
            {project ? " They will replace your saved account draft." : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              className={button}
              onClick={() => applyGuestDraft(true)}
            >
              Use that draft
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl border px-4 font-bold"
              onClick={() => applyGuestDraft(false)}
            >
              Discard it
            </button>
          </div>
        </section>
      )}
      {project?.feedback && (
        <section className="border-primary/40 bg-primary/5 mb-6 rounded-2xl border p-5">
          <h2 className="font-bold">Teacher feedback</h2>
          <p className="mt-2 whitespace-pre-wrap">{project.feedback}</p>
          {(project.status === "changes_requested" ||
            (project.status === "draft" && project.revision > 0)) && (
            <p className="mt-3 text-sm">
              Revise your calculations, reasons or report, then submit again.
              Your teacher will review the new version.
            </p>
          )}
        </section>
      )}
      {locked && (
        <section className="bg-secondary mb-6 rounded-2xl border p-5">
          <h2 className="font-bold">
            {project?.status === "approved"
              ? "Your project is approved."
              : assignment
                ? "Handed in. Your teacher can now review your work."
                : "Your independent project is finished."}
          </h2>
          <p className="mt-2 text-sm">
            {assignment
              ? "Your portfolio keeps your submission and feedback. Teacher approval unlocks your project certificate."
              : "Download your project from My Work. Certificates require a teacher-assigned and approved project."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-5">
            <Link
              href={`/world/my-work/${project?.id}`}
              className="inline-flex min-h-11 items-center font-bold underline"
            >
              Open your project <ArrowRight className="ml-2 size-4" />
            </Link>
            {!assignment && project?.status === "submitted" && (
              <button
                className="min-h-11 font-bold underline"
                disabled={busy}
                onClick={() => void save(false)}
              >
                Revise independent project
              </button>
            )}
          </div>
        </section>
      )}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-8">
          <section className="bg-card rounded-2xl border p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <ClipboardCheck className="size-6" aria-hidden /> Your brief
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              The shop wants at least £25 expected profit per phone before other
              costs. Calculate expected profit if the quoted repair succeeds.
              Use the inspection notes to make a recommendation and explain
              uncertainty. Different decisions can be defensible; your evidence
              matters.
            </p>
            <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <li>
                <b>1. Inspect · 8 min</b>
                <br />
                Read each case and its limitations.
              </li>
              <li>
                <b>2. Decide · 15 min</b>
                <br />
                Calculate and justify three choices.
              </li>
              <li>
                <b>3. Report · 12 min</b>
                <br />
                Write, check and submit.
              </li>
            </ol>
            <p className="bg-secondary mt-4 rounded-xl p-3 font-mono text-sm">
              Expected profit = expected resale − acquisition − repair
            </p>
          </section>
          <fieldset
            disabled={busy || locked}
            className="min-w-0 space-y-8 disabled:opacity-90"
          >
            <legend className="sr-only">
              Device assessments and customer report
            </legend>
            {REPAIR_DEVICES.map((device, index) => {
              const answer = answers.devices.find((a) => a.id === device.id)!;
              const result = results.find((r) => r.id === device.id);
              return (
                <section
                  key={device.id}
                  className="bg-card rounded-2xl border p-5 sm:p-6"
                  aria-labelledby={`device-${device.id}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-full font-bold">
                      {index + 1}
                    </span>
                    <h2
                      id={`device-${device.id}`}
                      className="text-2xl font-bold"
                    >
                      {device.name}
                    </h2>
                  </div>
                  <div className="mt-5 grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
                    <DeviceIllustration device={device} />
                    <div>
                      <p className="font-bold">{device.condition}</p>
                      <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                        {device.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <dl className="bg-secondary my-5 grid grid-cols-2 gap-3 rounded-xl p-4 text-sm sm:grid-cols-4">
                    {[
                      ["Acquisition", device.acquisition],
                      ["Quoted repair", device.repair],
                      ["Expected resale", device.resale],
                      ["As-is resale", device.asIs],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-muted-foreground text-xs">
                          {label}
                        </dt>
                        <dd className="mt-1 text-xl font-bold">
                          {pounds(Number(value))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label
                      className="block text-sm font-bold"
                      htmlFor={`profit-${device.id}`}
                    >
                      Expected profit before other costs (£)
                      <input
                        id={`profit-${device.id}`}
                        inputMode="decimal"
                        value={answer.profit}
                        onChange={(e) => {
                          updateDevice(device.id, { profit: e.target.value });
                          setMarking(false);
                        }}
                        placeholder="e.g. 30 or -15"
                        maxLength={12}
                        className={`${field} mt-2`}
                      />
                    </label>
                    <label
                      className="block text-sm font-bold"
                      htmlFor={`decision-${device.id}`}
                    >
                      Your recommendation
                      <select
                        id={`decision-${device.id}`}
                        value={answer.decision}
                        onChange={(e) =>
                          updateDevice(device.id, {
                            decision: e.target
                              .value as DeviceAnswer["decision"],
                          })
                        }
                        className={`${field} mt-2`}
                      >
                        <option value="">Choose a recommendation</option>
                        <option value="repair">Acquire and repair</option>
                        <option value="as-is">Acquire and sell as-is</option>
                        <option value="decline">Decline the device</option>
                      </select>
                    </label>
                  </div>
                  {result && (
                    <p
                      role="status"
                      className={`mt-3 rounded-xl p-3 text-sm ${result.correct ? "bg-emerald-500/10" : "bg-amber-500/10"}`}
                    >
                      <b>
                        {result.correct
                          ? "Correct calculation. "
                          : "Check your calculation. "}
                      </b>
                      {result.explanation}
                    </p>
                  )}
                  <label
                    className="mt-4 block text-sm font-bold"
                    htmlFor={`reason-${device.id}`}
                  >
                    Explain your decision using the costs, evidence and
                    uncertainty
                    <textarea
                      id={`reason-${device.id}`}
                      value={answer.reason}
                      onChange={(e) =>
                        updateDevice(device.id, { reason: e.target.value })
                      }
                      maxLength={1200}
                      rows={4}
                      className={`${field} mt-2 font-normal`}
                      placeholder="The inspection shows… My expected profit is… The risk is… So I recommend…"
                    />
                  </label>
                </section>
              );
            })}
            <section className="bg-card rounded-2xl border p-6">
              <h2 className="text-2xl font-bold">
                Your customer condition report
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                Choose one phone. Explain the observed defects, their practical
                effect, the proposed next step and what the inspection cannot
                confirm. Write for a customer, with no unsupported guarantee.
              </p>
              <label
                className="mt-4 block text-sm font-bold"
                htmlFor="report-device"
              >
                Report device
                <select
                  id="report-device"
                  className={`${field} mt-2`}
                  value={answers.reportDevice}
                  onChange={(e) => {
                    editVersion.current += 1;
                    setDirty(true);
                    setAnswers((a) => ({ ...a, reportDevice: e.target.value }));
                  }}
                >
                  {REPAIR_DEVICES.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="mt-4 block text-sm font-bold"
                htmlFor="condition-report"
              >
                Condition report
                <textarea
                  id="condition-report"
                  value={answers.report}
                  maxLength={2400}
                  rows={9}
                  onChange={(e) => {
                    editVersion.current += 1;
                    setDirty(true);
                    setAnswers((a) => ({ ...a, report: e.target.value }));
                  }}
                  className={`${field} mt-2 font-normal`}
                  placeholder="Device inspected… Observed condition… Practical impact… Recommended next step… Limits of this inspection…"
                />
              </label>
              <p className="text-muted-foreground mt-2 text-xs">
                {answers.report.length}/2,400 characters · at least 100 to
                submit
              </p>
              <ul className="mt-5 grid gap-2 text-sm">
                {[
                  "I describe observations rather than presenting suspicions as facts.",
                  "I explain what a defect means for the customer.",
                  "I make a clear recommendation without promising an unverified repair.",
                  "I check spelling, tone and all three calculations.",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2
                      className="text-primary mt-0.5 size-4 shrink-0"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </fieldset>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy || locked}
              onClick={() => setMarking(true)}
              className="bg-card min-h-11 rounded-xl border px-5 py-3 font-bold"
            >
              Check calculations
            </button>
            <button
              onClick={() => void save(true)}
              disabled={busy || locked || !signedIn}
              className={button}
            >
              {busy
                ? "Saving…"
                : assignment
                  ? "Submit to my teacher"
                  : "Finish and save project"}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
          <p className="text-muted-foreground text-sm">
            Calculations are marked automatically. A teacher assesses the
            quality of your evidence, reasoning and customer report. This is a
            virtual workplace activity; the certificate records the approved
            project and skills.
          </p>
        </div>
        <aside
          className="bg-card rounded-2xl border p-5 lg:sticky lg:top-24"
          aria-label="Help alongside your task"
        >
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <HelpCircle className="size-5" aria-hidden /> Help at the workbench
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Keep your task open while you build the skill.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {MISSION_HELP.map((item) => (
              <button
                key={item.id}
                aria-pressed={help === item.id}
                onClick={() => setHelp(item.id)}
                className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold ${help === item.id ? "bg-primary text-primary-foreground" : "bg-background"}`}
              >
                {item.id === "maths"
                  ? "Maths"
                  : item.id === "science"
                    ? "Science"
                    : "English"}
              </button>
            ))}
          </div>
          {MISSION_HELP.filter((item) => item.id === help).map((item) => (
            <section key={item.id} className="mt-5">
              <h3 className="font-bold">{item.title}</h3>
              {item.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="text-muted-foreground mt-3 text-sm leading-relaxed"
                >
                  {p}
                </p>
              ))}
              <Link
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4"
              >
                Open full resource in a new tab
              </Link>
            </section>
          ))}
          <div className="text-muted-foreground mt-5 border-t pt-4 text-xs leading-relaxed">
            <Smartphone className="mb-2 size-5" aria-hidden />
            This mission uses fictional devices and inspection evidence. Do not
            open or repair a real battery or device as part of this activity.
          </div>
        </aside>
      </div>
    </div>
  );
}

/** True once a pupil has entered anything worth offering to restore. */
function hasRepairWork(answers: RepairAnswers) {
  return (
    answers.report.trim().length > 0 ||
    answers.devices.some(
      (d) => d.profit.trim() || d.decision || d.reason.trim(),
    )
  );
}
