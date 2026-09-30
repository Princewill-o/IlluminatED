"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/account/actions";
import { getAccount } from "@/lib/account/server";
import { COURSES } from "@/lib/data/courses";
import { getSupabase } from "@/lib/social/server";
import { HELP_TYPES, SPEEDS } from "@/lib/tutoring";

const contact = (t: string) =>
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(t) ||
  /(\+44|0)7\d{9}/.test(t.replace(/[\s().-]/g, ""));

function explain(m: string | undefined): string {
  if (!m) return "Something went wrong. Please try again.";
  if (m.includes("contact_details"))
    return "Please don't include email addresses or phone numbers. Keep all contact on IlluminatED so everyone stays safe.";
  if (m.includes("too_many_open"))
    return "You already have 5 open requests. Cancel one or wait for a tutor before adding more.";
  if (m.includes("details_required"))
    return "Finish setting up your account before requesting a tutor.";
  if (m.includes("rate_limited"))
    return "You're sending messages very quickly. Wait a minute and try again.";
  if (m.includes("row-level security"))
    return "You can't do that right now. If your account has been restricted, you won't be able to post.";
  return "Something went wrong. Please try again.";
}

export async function createTutorRequest(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account?.profile || !account.details)
    return { error: "Sign in and finish setting up your account first." };

  const course = COURSES.find((c) => c.id === fd.get("courseId"));
  const helpType = String(fd.get("helpType") ?? "");
  const speed = String(fd.get("speed") ?? "");
  const topic =
    String(fd.get("topic") ?? "")
      .trim()
      .slice(0, 120) || null;
  const details = String(fd.get("details") ?? "").trim();
  const availability =
    String(fd.get("availability") ?? "")
      .trim()
      .slice(0, 300) || null;
  const guardianEmail = String(fd.get("guardianEmail") ?? "").trim();
  const under18 = account.details.ageBand !== "18+";

  if (!course) return { error: "Choose a subject." };
  if (!HELP_TYPES.some((h) => h.id === helpType))
    return { error: "Choose the kind of help you need." };
  if (!SPEEDS.some((s) => s.id === speed))
    return { error: "Choose how quickly you need a tutor." };
  if (details.length < 20 || details.length > 3000)
    return {
      error: "Describe what you need in at least 20 characters (up to 3,000).",
    };
  if (contact(`${details} ${availability ?? ""} ${topic ?? ""}`))
    return { error: explain("contact_details") };
  if (helpType === "coursework" && fd.get("integrity") !== "on")
    return {
      error:
        "Please confirm you understand tutors can guide coursework but can't write or correct it for you.",
    };
  if (under18) {
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail) ||
      guardianEmail.length > 200
    )
      return {
        error:
          "Add a parent or guardian's email. We contact them before a tutor starts.",
      };
    if (guardianEmail.toLowerCase() === (account.email ?? "").toLowerCase())
      return {
        error: "The parent or guardian email needs to be different from yours.",
      };
  }

  const { data, error } = await sb
    .from("tutor_requests")
    .insert({
      course_id: course.id,
      subject: course.title,
      topic,
      help_type: helpType,
      speed,
      details,
      availability,
      student_id: account.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: explain(error?.message) };

  if (under18) {
    const { error: gErr } = await sb
      .from("request_guardians")
      .insert({ request_id: data.id, email: guardianEmail });
    if (gErr) {
      await sb.rpc("set_tutor_request_status", {
        req: data.id,
        new_status: "cancelled",
      });
      return {
        error:
          "We couldn't save the parent or guardian email. Check it and try again.",
      };
    }
  }

  revalidatePath("/dashboard");
  redirect(`/tutors/requests/${data.id}?new=1`);
}

export async function sendTutorMessage(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account?.profile) return { error: "Sign in to send messages." };
  const requestId = Number(fd.get("requestId"));
  const body = String(fd.get("body") ?? "").trim();
  if (!Number.isInteger(requestId))
    return { error: "Something went wrong. Please refresh." };
  if (!body || body.length > 4000)
    return { error: "Messages need to be between 1 and 4,000 characters." };
  if (contact(body)) return { error: explain("contact_details") };
  const { error } = await sb
    .from("tutor_messages")
    .insert({ request_id: requestId, body, sender_id: account.id });
  if (error) return { error: explain(error.message) };
  revalidatePath(`/tutors/requests/${requestId}`);
  return { ok: true, message: "Sent." };
}

/** Claim, release, cancel, complete, or (moderators) confirm a guardian. */
export async function changeRequest(fd: FormData) {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account?.profile) redirect("/sign-in");
  const id = Number(fd.get("id"));
  const action = String(fd.get("action"));
  const back = String(fd.get("back") ?? `/tutors/requests/${id}`);
  if (!Number.isInteger(id)) return;

  if (action === "claim") await sb.rpc("claim_tutor_request", { req: id });
  else if (action === "release")
    await sb.rpc("release_tutor_request", { req: id });
  else if (action === "cancel" || action === "complete")
    await sb.rpc("set_tutor_request_status", {
      req: id,
      new_status: action === "cancel" ? "cancelled" : "completed",
    });
  else if (
    action === "confirm-guardian" &&
    account.profile.role === "moderator"
  )
    await sb.from("tutor_requests").update({ guardian_ok: true }).eq("id", id);

  revalidatePath("/tutors/desk");
  revalidatePath("/dashboard");
  revalidatePath(`/tutors/requests/${id}`);
  redirect(
    back.startsWith("/tutors") || back.startsWith("/dashboard")
      ? back
      : `/tutors/requests/${id}`,
  );
}
