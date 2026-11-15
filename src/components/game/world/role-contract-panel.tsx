"use client";

import { useEffect, useRef, useState } from "react";

import { Award, Briefcase, Check, X } from "lucide-react";

import { OFFICE_WORK } from "./art";
import { TrainingContext } from "./training-context";
import { TRAINING_MIC_SLOT } from "./voice-chat";

import {
  ROLE_CONTRACTS,
  contractMinutes,
  markContract,
  normaliseContractAnswers,
  roleContract,
} from "@/lib/illum-world/role-contracts";

type Props = {
  initialRole: string;
  playerId: string;
  username: string;
  onClose: () => void;
  onTrainingRole?: (roleId: string, active: boolean) => void;
};
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#5141b5] px-4 py-2 font-bold text-white hover:bg-[#433396] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#332477]";

export function RoleContractPanel({
  initialRole,
  playerId,
  username,
  onClose,
  onTrainingRole,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [role, setRole] = useState(initialRole);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [page, setPage] = useState(0);
  const course = roleContract(role);
  const catalogue = ROLE_CONTRACTS.filter(item =>
    (!sector || item.workplace === sector) && `${item.workplace} ${item.title}`.toLowerCase().includes(search.trim().toLowerCase()));
  useEffect(() => {
    OFFICE_WORK.active = true;
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    return () => {
      OFFICE_WORK.active = false;
      if (node?.open) node.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label="In-game role contracts"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[90dvh] w-[min(94vw,52rem)] overflow-auto rounded-3xl border-2 border-[#1d1a4a] bg-[#f5f5ff] p-0 text-[#1d1a4a] shadow-2xl backdrop:bg-[#120f30]/70"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-[#1d1a4a] px-5 py-3 text-white">
        <p className="flex items-center gap-2 font-extrabold">
          <Briefcase className="size-5 text-[#ffd76a]" aria-hidden /> In-game
          role contracts
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <div id={TRAINING_MIC_SLOT} className="relative" />
          <button
            type="button"
            aria-label="Close role contracts"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
          >
            <X aria-hidden />
          </button>
        </div>
      </div>
      <div className="p-5 sm:p-8">
        {course ? (
          <ContractCourse
            key={course.id}
            courseId={course.id}
            playerId={playerId}
            username={username}
            onBack={() => setRole("all")}
            onTrainingRole={onTrainingRole}
          />
        ) : (
          <>
            <h2 className="text-3xl font-black">
              Find a workplace simulation
            </h2>
            <p className="mt-2">
              Pick a role in the workplace simulation. Each in-game contract
              takes three short, self-paced shifts.
            </p>
            <label className="mt-5 block text-sm font-bold">
              Search by employer or role
              <input
                type="search"
                value={search}
                onChange={event => { setSearch(event.target.value); setPage(0); }}
                className="mt-1 min-h-11 w-full rounded-lg border-2 border-[#1d1a4a] bg-white px-3"
              />
            </label>
            <label className="mt-3 block font-bold">Workplace or sector
              <select value={sector} onChange={event => {setSector(event.target.value);setPage(0);}} className="ml-3 min-h-11 max-w-full rounded-lg border bg-white p-2">
                <option value="">All sectors</option>
                {[...new Set(ROLE_CONTRACTS.map(item => item.workplace))].map(name => <option key={name}>{name}</option>)}
              </select>
            </label>
            <p className="mt-3">{catalogue.length} introductory scenarios</p>
            {catalogue.length === 0 && <p role="status" className="mt-4">No matching roles.</p>}
            <ul className="mt-5 grid gap-3">
              {catalogue.slice(page * 18, page * 18 + 18).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setRole(item.id)}
                    className="w-full rounded-2xl border-2 border-[#1d1a4a] bg-white p-4 text-left hover:bg-[#ebe6ff]"
                  >
                    <span className="block text-sm font-bold text-[#5141b5]">{item.workplace}</span>
                    <strong className="text-xl">{item.title}</strong>
                    <span className="ml-2 text-sm font-bold">
                      {contractMinutes(item)} min
                    </span>
                    <span className="mt-1 block text-sm">{item.summary}</span>
                  </button>
                </li>
              ))}
            </ul>
            <nav aria-label="Role pages" className="mt-4 flex gap-4">
              <button className={button} disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className={button} disabled={(page + 1) * 18 >= catalogue.length} onClick={() => setPage(p => p + 1)}>Next</button>
            </nav>
          </>
        )}
      </div>
    </dialog>
  );
}

function ContractCourse({
  courseId,
  playerId,
  username,
  onBack,
  onTrainingRole,
}: {
  courseId: string;
  playerId: string;
  username: string;
  onBack: () => void;
  onTrainingRole?: Props["onTrainingRole"];
}) {
  const course = roleContract(courseId)!;
  const key = `illumed-role-contract-v1:${playerId}:${courseId}`;
  const [answers, setAnswers] = useState(() => {
    try {
      return normaliseContractAnswers(
        course,
        JSON.parse(localStorage.getItem(key) ?? "{}"),
      );
    } catch {
      return normaliseContractAnswers(course, {});
    }
  });
  const [index, setIndex] = useState(() => {
    const first = markContract(course, answers).shifts.findIndex(
      (shift) => !shift.complete,
    );
    return first < 0 ? course.shifts.length - 1 : first;
  });
  const [checked, setChecked] = useState(false);
  const [download, setDownload] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState("");
  const status = markContract(course, answers);
  const shift = course.shifts[index];
  const result = status.shifts[index];
  useEffect(() => {
    onTrainingRole?.(courseId, !status.complete);
  }, [courseId, onTrainingRole, status.complete]);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(answers));
    } catch {
      /* practice still works */
    }
  }, [key, answers]);
  const chooseShift = (next: number) => {
    setIndex(next);
    setChecked(false);
  };
  async function getCertificate() {
    setDownload("pending");
    setError("");
    try {
      const response = await fetch(
        `/api/world/contracts/${courseId}/certificate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ learner: username, answers }),
        },
      );
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/pdf")
      )
        throw new Error("The certificate could not be downloaded. Try again.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `IllumWorld-${courseId}-completion.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownload("done");
    } catch {
      setError(
        "The certificate could not be downloaded. Your answers are still saved on this device.",
      );
      setDownload("idle");
    }
  }
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="min-h-11 font-bold underline"
      >
        ← All roles
      </button>
      <h2 className="text-3xl font-black">{course.title}</h2>
      <p className="mt-2 text-sm font-bold">
        {course.workplace} · In-game contract · {contractMinutes(course)}{" "}
        minutes across three shifts
      </p>
      <p className="mt-2">
        Read the brief and example, then pass the checks. Take each shift at
        your own pace.
      </p>
      {!courseId.startsWith("career-") && <TrainingContext key={courseId} roleId={courseId} />}
      <nav aria-label="Course shifts" className="my-5 flex flex-wrap gap-2">
        {course.shifts.map((item, i) => {
          const unlocked = status.shifts.slice(0, i).every((s) => s.complete);
          return (
            <button
              key={item.id}
              type="button"
              aria-current={index === i ? "step" : undefined}
              disabled={!unlocked}
              onClick={() => chooseShift(i)}
              className={`flex min-h-11 items-center gap-1 rounded-lg border border-[#1d1a4a] px-3 font-bold disabled:opacity-45 ${index === i ? "bg-[#1d1a4a] text-white" : "bg-white"}`}
            >
              {status.shifts[i].complete && (
                <Check className="size-4" aria-label="Complete" />
              )}{" "}
              Shift {i + 1}
            </button>
          );
        })}
      </nav>
      <section className="rounded-2xl border border-[#1d1a4a]/25 bg-white p-5">
        <h3 className="text-xl font-black">{shift.title}</h3>
        <p className="mt-2 text-sm font-bold">About {shift.minutes} minutes</p>
        <p className="mt-3">{shift.brief}</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          {shift.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <details className="mt-4 rounded-xl bg-[#ebe6ff] p-4">
          <summary className="cursor-pointer font-bold">Worked example</summary>
          <p className="mt-2">{shift.example}</p>
        </details>
      </section>
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setChecked(true);
        }}
      >
        <h3 className="text-xl font-black">Shift knowledge check</h3>
        {shift.questions.map((question, i) => (
          <fieldset
            key={question.prompt}
            className="rounded-xl border border-[#1d1a4a]/30 bg-white p-4"
          >
            <legend className="px-1 font-bold">
              {i + 1}. {question.prompt}
            </legend>
            {question.options.map((option, j) => (
              <label
                key={option}
                className="flex min-h-10 cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  required
                  name={`${shift.id}-${i}`}
                  checked={answers[shift.id][i] === j}
                  onChange={() => {
                    setChecked(false);
                    setAnswers((old) => ({
                      ...old,
                      [shift.id]: old[shift.id].map((value, k) =>
                        k === i ? j : value,
                      ),
                    }));
                  }}
                />
                {option}
              </label>
            ))}
            {checked && (
              <p className="mt-2 rounded-lg bg-[#ebe6ff] p-3 text-sm">
                <strong>
                  {result.checks[i].correct ? "Correct. " : "Try again. "}
                </strong>
                {result.checks[i].explanation}
              </p>
            )}
          </fieldset>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={button}>
            Check answers
          </button>
          {result.complete && index < course.shifts.length - 1 && (
            <button
              type="button"
              className={button}
              onClick={() => chooseShift(index + 1)}
            >
              Next shift →
            </button>
          )}
        </div>
        {checked && (
          <p role="status">
            {result.correct} of {result.total} correct.{" "}
            {result.complete
              ? "Shift complete."
              : "Read the feedback and try again."}
          </p>
        )}
      </form>
      {status.complete && (
        <section className="mt-6 rounded-2xl bg-[#fff0b4] p-5">
          <h3 className="flex items-center gap-2 text-xl font-black">
            <Award aria-hidden /> Contract complete
          </h3>
          <p className="my-3">
            All nine checks passed. Download your IlluminatED in-game course
            certificate.
          </p>
          <button
            type="button"
            disabled={download === "pending"}
            className={button}
            onClick={getCertificate}
          >
            {download === "pending" ? "Creating PDF…" : "Download certificate"}
          </button>
          {download === "done" && (
            <p role="status" className="mt-2">
              Download started.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2">
              {error}
            </p>
          )}
        </section>
      )}
      <p className="mt-5 text-sm">
        Progress stays on this device. The certificate marks completion of a
        fictional game activity.
      </p>
    </div>
  );
}
