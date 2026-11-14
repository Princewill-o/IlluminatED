"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { ASSIGNABLE_RESOURCES } from "@/lib/learning-school/catalogue";
import { requireTeacher } from "@/lib/school/access";
import { getSupabase, getViewer } from "@/lib/social/server";

type Outcome = { ok: true; id?: string } | { ok: false; error: string };
const message = (error?: string) =>
  error?.includes("not_allowed") ? "Only the class teacher can do that."
  : error?.includes("not_submitted") ? "This pupil has not submitted work yet."
  : error?.includes("calculations_need_correction") ? "At least one profit calculation is wrong, so the certificate cannot be approved yet. Request changes and point the pupil to the calculation to correct."
  : error?.includes("feedback_required") ? "Explain what the pupil should change (at least 10 characters)."
  : error?.includes("invalid") ? "Check your review and feedback, then try again."
  : "Could not save this change. Please try again.";

export async function createLearningAssignment(form: FormData): Promise<Outcome> {
  await requireTeacher();
  const [product, slug] = String(form.get("resource") ?? "").split(":");
  const resource = ASSIGNABLE_RESOURCES.find((r) => r.product === product && r.slug === slug);
  const classId = String(form.get("classId") ?? "");
  const title = String(form.get("title") ?? "").trim() || resource?.title;
  const due = String(form.get("due") ?? "");
  if (!resource || !z.string().uuid().safeParse(classId).success || !title || title.length > 120 || (due && !Number.isFinite(Date.parse(due)))) return { ok: false, error: "Choose a class and a topic or mission, then check the due date." };
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: "Sign in to your school account." };
  const { data, error } = await sb.rpc("learning_assignment_create", { p_class: classId, p_product: product, p_slug: slug, p_title: title, p_due: due ? new Date(due).toISOString() : null });
  if (error) return { ok: false, error: message(error.message) };
  revalidatePath("/school");
  revalidatePath(`/school/class/${classId}`);
  return { ok: true, id: String(data) };
}

export async function reviewLearningWork(form: FormData): Promise<Outcome> {
  await requireTeacher();
  const schema = z.object({ assignment: z.string().uuid(), user: z.string().uuid(), feedback: z.string().trim().max(4000), decision: z.enum(["completed", "changes_requested", "approved"]) });
  const parsed = schema.safeParse({ assignment: form.get("assignment"), user: form.get("user"), feedback: form.get("feedback") ?? "", decision: form.get("decision") });
  if (!parsed.success) return { ok: false, error: "Check your review and feedback." };
  const p = parsed.data;
  if (p.decision === "changes_requested" && p.feedback.length < 10) return { ok: false, error: "Explain what the pupil should change (at least 10 characters)." };
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: "Sign in to your school account." };
  const project = String(form.get("project") ?? "");
  if (project && !z.string().uuid().safeParse(project).success) return { ok: false, error: "Invalid project." };
  if (p.decision === "approved" && (!project || form.get("evidence") !== "on" || form.get("report") !== "on" || form.get("calculations") !== "on")) return { ok: false, error: "Review the calculations, evidence and customer report before approving a certificate." };
  if (project && p.decision === "completed") return { ok: false, error: "Use Approve certificate for a workplace project." };
  if (!project && p.decision === "approved") return { ok: false, error: "Certificates are for approved workplace projects." };
  const result = project
    ? await sb.rpc("review_learning_world_project", { p_project: project, p_decision: p.decision, p_feedback: p.feedback })
    : await sb.rpc("learning_review_subject", { p_assignment: p.assignment, p_user: p.user, p_decision: p.decision, p_feedback: p.feedback });
  if (result.error) return { ok: false, error: message(result.error.message) };
  revalidatePath("/school", "layout");
  revalidatePath("/world/my-work", "layout");
  return { ok: true };
}

export async function saveReviewContent(form: FormData): Promise<Outcome> {
  const viewer = await getViewer();
  const sb = await getSupabase();
  if (!viewer || !sb || (await sb.rpc("platform_admin_status")).data !== true) return { ok: false, error: "Platform admin access is required." };
  const id = String(form.get("id") ?? "");
  if (id) {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid content entry." };
    const status = String(form.get("status") ?? "draft");
    const notes = String(form.get("notes") ?? "").trim();
    if (!["draft", "reviewed", "changes_requested"].includes(status) || notes.length > 4000) return { ok: false, error: "Check the review status and notes." };
    const { error } = await sb.from("learning_content_review").update({ status, review_notes: notes || null, reviewed_by: status === "reviewed" ? viewer.id : null, reviewed_at: status === "reviewed" ? new Date().toISOString() : null }).eq("id", id);
    if (error) return { ok: false, error: message(error.message) };
  } else {
    const schema = z.object({ product: z.enum(["world", "maths", "science", "english"]), kind: z.enum(["resource", "question", "mission"]), title: z.string().trim().min(3).max(160), topic: z.string().trim().min(2).max(120), body: z.string().trim().min(10).max(30000), answer_explanation: z.string().trim().max(12000), exam_board: z.string().trim().max(100), source_url: z.string().trim().max(500).refine((v) => !v || /^https:\/\//.test(v)) });
    const parsed = schema.safeParse(Object.fromEntries(["product", "kind", "title", "topic", "body", "answer_explanation", "exam_board", "source_url"].map((key) => [key, String(form.get(key) ?? "")])));
    if (!parsed.success || (parsed.data.kind === "question" && parsed.data.answer_explanation.length < 3)) return { ok: false, error: "Add the title, topic, content and an answer explanation for questions. Source links must use HTTPS." };
    const p = parsed.data;
    const verified = form.get("verified") === "on";
    if (verified && !p.exam_board) return { ok: false, error: "Name the exam board whose mapping you verified." };
    const { error } = await sb.from("learning_content_review").insert({ ...p, answer_explanation: p.answer_explanation || null, exam_board: p.exam_board || null, source_url: p.source_url || null, board_verified: verified, created_by: viewer.id, status: "draft" });
    if (error) return { ok: false, error: message(error.message) };
  }
  revalidatePath("/school/content");
  return { ok: true };
}
