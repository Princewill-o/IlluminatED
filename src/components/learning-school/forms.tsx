"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { joinClass } from "@/app/homework/actions";
import { createLearningAssignment, reviewLearningWork, saveReviewContent } from "@/app/school/actions";
import { ASSIGNABLE_RESOURCES, PRODUCT_NAMES } from "@/lib/learning-school/catalogue";

const input = "mt-1 block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-foreground";
const button = "rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50";

function useSave() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const router = useRouter();
  const run = (save: () => Promise<{ ok: boolean; error?: string }>) => start(async () => {
    setMessage("");
    try {
      const result = await save();
      setMessage(result.ok ? "Saved." : result.error ?? "Could not save. Try again.");
      if (result.ok) router.refresh();
    } catch { setMessage("Could not reach the server. Your form is still here; try again."); }
  });
  return { pending, message, run };
}

export function ClassJoin({ code = "" }: { code?: string }) {
  const { pending, message, run } = useSave();
  return <form action={(form) => run(() => joinClass(String(form.get("code") ?? "")))} className="rounded-2xl border bg-card p-5">
    <h2 className="text-xl font-bold">Join your class</h2><p className="mt-2 text-sm text-muted-foreground">Use the code your teacher shared. Your school account must already have access.</p>
    <label className="mt-4 block text-sm font-semibold">Class code<input name="code" defaultValue={code} pattern="[A-Za-z0-9]{6}" maxLength={6} required autoComplete="off" className={`${input} uppercase`} /></label>
    <button disabled={pending} className={`${button} mt-3`}>{pending ? "Joining…" : "Join class"}</button><p role="status" className="mt-2 text-sm">{message}</p>
  </form>;
}

export function AssignmentForm({ classId }: { classId: string }) {
  const { pending, message, run } = useSave();
  return <form action={(form) => run(() => createLearningAssignment(form))} className="rounded-2xl border bg-card p-5">
    <h2 className="text-xl font-bold">Assign across products</h2><input type="hidden" name="classId" value={classId} />
    <label className="mt-4 block text-sm font-semibold">Mission or topic<select required name="resource" className={input}>{ASSIGNABLE_RESOURCES.map((r) => <option key={`${r.product}:${r.slug}`} value={`${r.product}:${r.slug}`}>{PRODUCT_NAMES[r.product]} · {r.title}</option>)}</select></label>
    <label className="mt-3 block text-sm font-semibold">Assignment title <span className="font-normal">(optional)</span><input name="title" maxLength={120} className={input} placeholder="Uses the topic title if left blank" /></label>
    <label className="mt-3 block text-sm font-semibold">Due <span className="font-normal">(optional, your local time)</span><input name="due" type="datetime-local" className={input} /></label>
    <button disabled={pending} className={`${button} mt-4`}>{pending ? "Assigning…" : "Assign to class"}</button><p role="status" className="mt-2 text-sm">{message}</p>
  </form>;
}

export function CopyJoinLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" className="rounded-xl border bg-background px-4 py-2 text-sm font-semibold" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/school?join=${encodeURIComponent(code)}`); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Join link copied" : "Copy class join link"}</button>;
}

export function ReviewForm({ assignment, user, project, feedback = "" }: { assignment: string; user: string; project?: string; feedback?: string }) {
  const { pending, message, run } = useSave();
  return <form action={(form) => run(() => reviewLearningWork(form))} className="mt-4 space-y-3 rounded-xl border bg-background p-4">
    <input type="hidden" name="assignment" value={assignment} /><input type="hidden" name="user" value={user} /><input type="hidden" name="project" value={project ?? ""} />
    <label className="block text-sm font-semibold">Teacher feedback<textarea name="feedback" defaultValue={feedback} maxLength={4000} rows={3} className={input} /></label>
    {project && <fieldset className="space-y-2 text-sm"><legend className="mb-2 font-semibold">Before approving the certificate, confirm:</legend><label className="flex gap-2"><input type="checkbox" name="calculations" />All three profit calculations are correct.</label><label className="flex gap-2"><input type="checkbox" name="evidence" />The recommendations use inspection evidence and explain uncertainty.</label><label className="flex gap-2"><input type="checkbox" name="report" />The report explains the defects and their practical impact clearly.</label></fieldset>}
    <div className="flex flex-wrap gap-2"><button name="decision" value={project ? "approved" : "completed"} disabled={pending} className={button}>{project ? "Approve certificate" : "Mark reviewed"}</button><button name="decision" value="changes_requested" disabled={pending} className="rounded-xl border px-4 py-2 font-semibold disabled:opacity-50">Request changes</button></div>
    <p role="status" className="text-sm">{message}</p>
  </form>;
}

export function ContentForm() {
  const { pending, message, run } = useSave();
  return <form action={(form) => run(() => saveReviewContent(form))} className="space-y-4 rounded-2xl border bg-card p-5"><h2 className="text-xl font-bold">Add a draft</h2>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Product<select name="product" className={input}>{Object.entries(PRODUCT_NAMES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label><label className="text-sm font-semibold">Type<select name="kind" className={input}><option value="resource">Resource</option><option value="question">Question</option><option value="mission">Mission</option></select></label></div>
    <label className="block text-sm font-semibold">Title<input name="title" required minLength={3} maxLength={160} className={input} /></label>
    <label className="block text-sm font-semibold">Topic<input name="topic" required minLength={2} maxLength={120} className={input} /></label>
    <label className="block text-sm font-semibold">Content or question<textarea name="body" required minLength={10} maxLength={30000} rows={7} className={input} /></label>
    <label className="block text-sm font-semibold">Answer and explanation <span className="font-normal">(required for questions)</span><textarea name="answer_explanation" maxLength={12000} rows={4} className={input} /></label>
    <label className="block text-sm font-semibold">Source URL <span className="font-normal">(optional)</span><input name="source_url" type="url" maxLength={500} className={input} /></label>
    <label className="block text-sm font-semibold">Exam board <span className="font-normal">(optional)</span><input name="exam_board" maxLength={100} className={input} /></label>
    <label className="flex gap-2 text-sm"><input type="checkbox" name="verified" />I have checked this mapping against the named exam board specification.</label>
    <button disabled={pending} className={button}>Save draft for review</button><p role="status" className="text-sm">{message}</p>
  </form>;
}

export function ContentReviewForm({ id, status, notes }: { id: string; status: string; notes?: string }) {
  const { pending, message, run } = useSave();
  return <form action={(form) => run(() => saveReviewContent(form))} className="mt-4 space-y-3"><input type="hidden" name="id" value={id} /><label className="block text-sm font-semibold">Review status<select name="status" defaultValue={status} className={input}><option value="draft">Draft</option><option value="changes_requested">Changes requested</option><option value="reviewed">Reviewed</option></select></label><label className="block text-sm font-semibold">Review notes<textarea name="notes" defaultValue={notes} maxLength={4000} rows={3} className={input} /></label><button disabled={pending} className={button}>Save review</button><p role="status" className="text-sm">{message}</p></form>;
}
