"use server";

import { revalidatePath } from "next/cache";

import {
  normaliseRepairAnswers,
  repairSubmissionErrors,
  type RepairProject,
} from "@/lib/illum-world/repair";
import { getSupabase } from "@/lib/social/server";

export async function saveRepairProject(
  assignment: string | null,
  raw: unknown,
  submit = false,
): Promise<
  { ok: true; project: RepairProject } | { ok: false; error: string }
> {
  if (
    assignment &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      assignment,
    )
  )
    return { ok: false, error: "The assignment link is invalid." };
  const answers = normaliseRepairAnswers(raw);
  if (submit) {
    const errors = repairSubmissionErrors(answers);
    if (errors.length) return { ok: false, error: errors[0] };
  }
  const sb = await getSupabase();
  if (!sb)
    return {
      ok: false,
      error:
        "Cloud saving is unavailable. Keep this tab open and retry saving.",
    };
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user)
    return {
      ok: false,
      error: "Sign in to save this project to My Work and submit it.",
    };
  const { data, error } = await sb.rpc("save_learning_world_project", {
    p_assignment: assignment,
    p_answers: answers,
    p_submit: submit,
  });
  if (error)
    return {
      ok: false,
      error: error.message.includes("project_locked")
        ? "This project has already been submitted. Wait for teacher feedback before making changes."
        : error.message.includes("assignment_mismatch")
          ? "Join the teacher's class to save this assignment."
          : "Your project could not be saved to your account. Keep this tab open and retry saving.",
    };
  if (submit) {
    revalidatePath("/world/my-work");
    revalidatePath("/school");
  }
  return { ok: true, project: data as RepairProject };
}
