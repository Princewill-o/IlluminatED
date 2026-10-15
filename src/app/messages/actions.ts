"use server";


import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createHash, randomBytes } from "node:crypto";

import { getAccount } from "@/lib/account/server";
import { sendEmail } from "@/lib/email";
import { siteOrigin } from "@/lib/site";
import { getSupabase } from "@/lib/social/server";

export type OpenState = { error?: string } | null;

const SECRET = () => process.env.BILLING_CALLBACK_SECRET ?? "";
const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

const ERRORS: Record<string, string> = {
  guardian_required: "Because you're under 18, a parent or carer needs to approve this first. Enter their email.",
  guardian_is_self: "Enter your parent or carer's email, not your own.",
  guardian_declined: "Your parent or carer declined this conversation.",
  not_staff: "You can only message verified people from companies.",
  staff_cannot_open: "Staff accounts reply to learners; they can't start conversations.",
  blocked: "You can't message this person.",
  not_allowed: "Please sign in again.",
};

/** Starts (or reopens) a conversation with verified staff. Under-18s need a parent or carer to approve. */
export async function openThread(_: OpenState, fd: FormData): Promise<OpenState> {
  const sb = await getSupabase();
  const account = await getAccount();
  if (!sb || !account?.details) return { error: "Please sign in first." };
  const to = String(fd.get("to") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(to)) return { error: ERRORS.not_staff };
  const adult = account.details.ageBand === "18+";
  const guardianEmail = adult ? null : String(fd.get("guardian") ?? "").trim().toLowerCase() || null;
  if (!adult && fd.get("understand") !== "on") return { error: "Please tick to confirm you understand how safeguarded chat works." };
  const token = adult ? null : randomBytes(32).toString("base64url");
  const { data, error } = await sb.rpc("dm_open", {
    p_staff: to,
    p_guardian_email: guardianEmail,
    p_token_hash: token ? sha(token) : null,
    p_secret: SECRET(),
  });
  if (error || !data) {
    const key = Object.keys(ERRORS).find((k) => error?.message.includes(k));
    return { error: key ? ERRORS[key] : "Couldn't start the conversation. Please try again." };
  }
  const thread = data as { id: string; mode: string; guardian: string };
  if (token && thread.guardian === "pending" && guardianEmail) {
    const origin = await siteOrigin();
    await sendEmail({
      to: guardianEmail,
      subject: "Please approve a careers conversation on IlluminatED",
      text: `@${account.profile?.username ?? "Your child"} would like to ask a verified employer for careers advice on IlluminatED.\n\nPlease check the details and approve or decline here:\n${origin}/guardian/messages?token=${token}\n\nMessages in approved conversations are checked for safety and can be seen by our moderators. Contact details can't be shared. This link expires in 7 days.`,
    });
  }
  revalidatePath("/messages");
  redirect(`/messages/${thread.id}`);
}

export async function guardianDecision(fd: FormData) {
  const sb = await getSupabase();
  const token = String(fd.get("token") ?? "");
  const accept = fd.get("decision") === "accept";
  if (!sb) redirect("/guardian/messages?result=invalid");
  const { data } = await sb.rpc("dm_guardian_respond", { p_token: token, p_accept: accept });
  redirect(`/guardian/messages?result=${encodeURIComponent(String(data ?? "invalid"))}`);
}

export async function bookSlot(fd: FormData) {
  const sb = await getSupabase();
  const slug = String(fd.get("slug") ?? "");
  if (!sb) redirect("/sign-in");
  const { data, error } = await sb.rpc("book_office_slot", { p_slot: String(fd.get("slot")) });
  if (error) {
    const reason = ["message_first", "taken", "unavailable", "too_many_bookings"].find((k) => error.message.includes(k)) ?? "error";
    redirect(`/companies/${slug}?booking=${reason}#office-hours`);
  }
  revalidatePath(`/companies/${slug}`);
  redirect(`/messages/${(data as { thread: string }).thread}?booked=1`);
}

export async function cancelBooking(fd: FormData) {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("office_slots").update({ cancelled: true }).eq("id", String(fd.get("slot")));
  revalidatePath("/messages");
}

export async function closeThread(fd: FormData) {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("dm_threads").update({ closed: true }).eq("id", String(fd.get("thread")));
  revalidatePath("/messages");
  redirect("/messages");
}
