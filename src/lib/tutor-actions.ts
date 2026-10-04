"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createHash, randomBytes } from "node:crypto";

import type { FormState } from "@/lib/account/actions";
import { getAccount } from "@/lib/account/server";
import { COURSES } from "@/lib/data/courses";
import {
  emailEnabled,
  notifyModerators,
  sendEmail,
  serverSecret,
  siteOrigin,
} from "@/lib/email";
import { getSupabase } from "@/lib/social/server";
import { getStripe, paymentsEnabled } from "@/lib/stripe";
import { HELP_TYPES, SPEEDS, helpLabel } from "@/lib/tutoring";

type Supabase = NonNullable<Awaited<ReturnType<typeof getSupabase>>>;

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
  if (m.includes("adults_only"))
    return "You need to be 18 or over to tutor with IlluminatED. Check the age on your account.";
  if (m.includes("already_tutor")) return "You're already a tutor.";
  if (
    m.includes("tutor_applications_one_pending") ||
    m.includes("duplicate key")
  )
    return "You already have an application waiting for review.";
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
    // Only the hash is stored. The token itself goes in the guardian's email.
    const token = randomBytes(32).toString("base64url");
    const { error: gErr } = await sb.from("request_guardians").insert({
      request_id: data.id,
      email: guardianEmail,
      token_hash: emailEnabled ? sha256(token) : null,
    });
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
    if (emailEnabled) {
      const link = `${await siteOrigin()}/guardian/confirm?token=${token}`;
      await sendEmail({
        to: guardianEmail,
        subject: "Please confirm tutoring on IlluminatED",
        text: [
          `A learner gave this email address as their parent or guardian when asking for help from a tutor on IlluminatED (${course.title}).`,
          "Because they're under 18, a tutor can't take the request on until you agree. You can see what they asked for and respond here:",
          link,
          "The link works once and expires in 7 days. If you don't know about this, choose \"I don't consent\" and the request will be cancelled.",
        ].join("\n\n"),
      });
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
  await notifyOtherParty(
    sb,
    requestId,
    "New message on IlluminatED",
    "You have a new message about your tutoring request. Read and reply on IlluminatED:",
    true,
  );
  revalidatePath(`/tutors/requests/${requestId}`);
  return { ok: true, message: "Sent." };
}

/** Claim, release, cancel, complete, or (moderators) confirm a guardian or mark a refund. */
export async function changeRequest(fd: FormData) {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account?.profile) redirect("/sign-in");
  const id = Number(fd.get("id"));
  const action = String(fd.get("action"));
  const back = String(fd.get("back") ?? `/tutors/requests/${id}`);
  if (!Number.isInteger(id)) return;

  if (action === "claim") {
    const { data: claimed } = await sb.rpc("claim_tutor_request", { req: id });
    if (claimed === true)
      await notifyOtherParty(
        sb,
        id,
        "A tutor has taken on your request",
        "Good news: a tutor has taken on your IlluminatED tutoring request. You can message them here:",
      );
  } else if (action === "release")
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
  else if (action === "mark-refunded" && account.profile.role === "moderator")
    // The refund itself is made in the Stripe dashboard. This only records it.
    await sb
      .from("tutor_requests")
      .update({ refunded_at: new Date().toISOString() })
      .eq("id", id)
      .not("paid_at", "is", null)
      .is("refunded_at", null);

  revalidatePath("/tutors/desk");
  revalidatePath("/dashboard");
  revalidatePath(`/tutors/requests/${id}`);
  redirect(
    back.startsWith("/tutors") || back.startsWith("/dashboard")
      ? back
      : `/tutors/requests/${id}`,
  );
}

const sha256 = (t: string) =>
  createHash("sha256").update(t, "utf8").digest("hex");

/**
 * Emails the other person on a request (learner or assigned tutor) with a link
 * to it. Never includes message contents. `throttle` limits it to one email
 * per request every 15 minutes.
 */
async function notifyOtherParty(
  sb: Supabase,
  requestId: number,
  subject: string,
  intro: string,
  throttle = false,
) {
  const secret = serverSecret();
  if (!emailEnabled || !secret) return;
  try {
    const { data: to } = await sb.rpc("request_party_email", {
      request_id: requestId,
      secret,
    });
    if (typeof to !== "string" || !to) return;
    if (throttle) {
      const { data: ok } = await sb.rpc("claim_message_notification", {
        req: requestId,
      });
      if (ok !== true) return;
    }
    const link = `${await siteOrigin()}/tutors/requests/${requestId}`;
    await sendEmail({ to, subject, text: `${intro}\n\n${link}` });
  } catch {
    // Notifications are best effort; the message or claim has already been saved.
  }
}

/** Sends the learner to Stripe Checkout for their request's price. */
export async function startCheckout(fd: FormData) {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account?.profile) redirect("/sign-in");
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) redirect("/dashboard");
  const back = `/tutors/requests/${id}`;
  const stripe = getStripe();
  if (!stripe || !paymentsEnabled) redirect(back);

  const { data: r } = await sb
    .from("tutor_requests")
    .select(
      "id, student_id, subject, help_type, price_pence, status, needs_guardian, guardian_ok, paid_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (
    !r ||
    r.student_id !== account.id ||
    r.paid_at ||
    !["open", "matched"].includes(r.status) ||
    (r.needs_guardian && !r.guardian_ok) ||
    !(r.price_pence >= 30)
  )
    redirect(back);

  const origin = await siteOrigin();
  let url: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: r.price_pence,
            product_data: {
              name: `${helpLabel(r.help_type)}: ${r.subject}`,
            },
          },
        },
      ],
      client_reference_id: String(id),
      metadata: { request_id: String(id) },
      payment_intent_data: { metadata: { request_id: String(id) } },
      customer_email: account.email ?? undefined,
      success_url: `${origin}${back}?paid=1`,
      cancel_url: `${origin}${back}?paid=0`,
    });
    url = session.url;
  } catch {
    // Falls through to the error notice on the request page.
  }
  redirect(url ?? `${back}?paid=error`);
}

const LEVELS = ["gcse", "alevel", "btec", "tlevel", "level23", "other"];
const DBS = ["enhanced-update-service", "enhanced", "none"];

export async function applyToTutor(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account?.profile || !account.details)
    return { error: "Sign in and finish setting up your account first." };
  if (account.details.ageBand !== "18+")
    return { error: explain("adults_only") };

  const text = (k: string, max: number) =>
    String(fd.get(k) ?? "")
      .trim()
      .slice(0, max);
  const fullName = text("fullName", 120);
  const subjects = text("subjects", 500);
  const levels = fd
    .getAll("levels")
    .map(String)
    .filter((l) => LEVELS.includes(l));
  const experience = text("experience", 3000);
  const qualifications = text("qualifications", 2000);
  const dbs = String(fd.get("dbs") ?? "");
  const statement = text("statement", 3000);

  if (fullName.length < 2) return { error: "Enter your full name." };
  if (subjects.length < 2) return { error: "List the subjects you'd tutor." };
  if (!levels.length) return { error: "Choose at least one level." };
  if (experience.length < 20)
    return {
      error:
        "Describe your teaching or tutoring experience (at least 20 characters).",
    };
  if (qualifications.length < 2) return { error: "List your qualifications." };
  if (!DBS.includes(dbs))
    return { error: "Choose your DBS certificate status." };
  if (statement.length < 20)
    return {
      error: "Tell us why you'd like to tutor (at least 20 characters).",
    };
  if (fd.get("adult") !== "on")
    return { error: "Please confirm you're 18 or over." };

  const { error } = await sb.from("tutor_applications").insert({
    user_id: account.id,
    full_name: fullName,
    subjects,
    levels,
    experience,
    qualifications,
    dbs_status: dbs,
    statement,
    confirmed_adult: true,
  });
  if (error) return { error: explain(error.message) };

  await notifyModerators(
    "New tutor application",
    "Someone has applied to tutor on IlluminatED. Review it here.",
    "/tutors/applications",
  );
  revalidatePath("/tutors/apply");
  revalidatePath("/tutors/applications");
  return {
    ok: true,
    message: "Application sent. Our team will review it and be in touch.",
  };
}

/** Moderators approve or reject a tutor application. */
export async function reviewApplication(fd: FormData) {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || account?.profile?.role !== "moderator") redirect("/tutors/desk");
  const id = Number(fd.get("id"));
  const decision = String(fd.get("decision"));
  const notes =
    String(fd.get("notes") ?? "")
      .trim()
      .slice(0, 2000) || null;
  if (Number.isInteger(id) && (decision === "approve" || decision === "reject"))
    await sb.rpc("review_tutor_application", {
      application_id: id,
      approve: decision === "approve",
      notes,
    });
  revalidatePath("/tutors/applications");
  redirect("/tutors/applications");
}
