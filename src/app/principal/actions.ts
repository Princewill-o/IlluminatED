"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getSupabase } from "@/lib/social/server";

const ERRORS: Record<string, string> = {
  not_allowed: "Only your school's principal can invite people.",
  invalid_role: "Choose teacher or student.",
  invalid_email: "That email address doesn't look right.",
  other_school: "That email is already invited by another school.",
  no_seats: "Your licence has no student seats left. Contact IlluminatED to add more.",
  rate_limited: "That's a lot of invitations today. Try again tomorrow.",
};

/** Invite a teacher or student to your school. They finish signing up with that email. */
export async function inviteToSchool(_: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  const role = z.enum(["teacher", "student"]).safeParse(form.get("role"));
  const emails = String(form.get("emails") ?? "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean).slice(0, 60);
  if (!role.success || !emails.length) return { ok: false, message: "Add at least one email and pick a role." };
  const sb = await getSupabase();
  if (!sb) return { ok: false, message: "Couldn't reach the server." };
  let sent = 0;
  for (const email of emails) {
    const { error } = await sb.rpc("school_invite", { p_email: email, p_role: role.data });
    if (error) {
      const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
      return { ok: sent > 0, message: `${sent ? `${sent} invited. ` : ""}${email}: ${key ? ERRORS[key] : "couldn't be invited."}` };
    }
    sent++;
  }
  revalidatePath("/principal");
  return { ok: true, message: `${sent} ${role.data === "teacher" ? "teacher" : "student"}${sent === 1 ? "" : "s"} invited. They can sign up with that email now.` };
}
