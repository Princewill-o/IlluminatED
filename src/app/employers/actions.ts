"use server";


import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createHash, randomInt } from "node:crypto";

import { emailEnabled, sendEmail } from "@/lib/email";
import { SECTORS, myMembership } from "@/lib/employers/server";
import { getSupabase, getViewer } from "@/lib/social/server";

export type EmployerState = { error?: string; step?: "details" | "code"; email?: string; ok?: string } | null;

const SECRET = () => process.env.BILLING_CALLBACK_SECRET ?? "";
const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

const ERRORS: Record<string, string> = {
  free_mail: "Use your work email, not a personal one like Gmail or Outlook.",
  invalid_email: "That doesn't look like an email address.",
  invalid_name: "Enter your company's name (2 to 60 characters).",
  invalid_sector: "Choose your sector.",
  already_member: "You're already verified with a company.",
  suspended: "That company's office is currently suspended. Contact us if this is a mistake.",
  rate_limited: "Too many codes requested. Try again in an hour.",
  wrong_code: "That code isn't right. Check the email and try again.",
  expired: "That code has expired. Request a new one.",
  too_many_attempts: "Too many wrong tries. Request a new code.",
  no_code: "Request a code first.",
  not_allowed: "Please sign in again.",
};
const explain = (msg?: string) => ERRORS[Object.keys(ERRORS).find((k) => msg?.includes(k)) ?? ""] ?? "Something went wrong. Please try again.";

export async function requestEmployerCode(_: EmployerState, fd: FormData): Promise<EmployerState> {
  const sb = await getSupabase();
  const viewer = await getViewer();
  if (!sb || !viewer) return { error: "Please sign in first." };
  if (!emailEnabled) return { error: "Email sending isn't set up yet, so we can't send your code. (The site owner needs to add RESEND_API_KEY and EMAIL_FROM.)" };

  if (!viewer.profile) {
    const username = String(fd.get("username") ?? "").trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username))
      return { error: "Pick a username: 3 to 20 letters, numbers or underscores." };
    if (fd.get("adult") !== "on") return { error: "Employer accounts are for people aged 18 or over." };
    if (fd.get("terms") !== "on") return { error: "Please agree to the Terms, Privacy policy and safeguarding rules." };
    const { error } = await sb.from("profiles").insert({ id: viewer.id, username });
    if (error) return { error: error.code === "23505" ? "That username is taken. Try another." : "We couldn't create your account." };
  } else if (fd.get("terms") !== "on") {
    return { error: "Please agree to the Terms, Privacy policy and safeguarding rules." };
  }

  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const name = String(fd.get("company") ?? "").trim();
  const sector = String(fd.get("sector") ?? "");
  let website = String(fd.get("website") ?? "").trim();
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  website = website.replace(/^http:\/\//i, "https://");
  const title = String(fd.get("title") ?? "").trim().slice(0, 80);
  if (!SECTORS.some((s) => s.id === sector)) return { error: ERRORS.invalid_sector };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await sb.rpc("employer_request_code", {
    p_name: name,
    p_sector: sector,
    p_website: website || null,
    p_title: title || null,
    p_email: email,
    p_code_hash: sha(code),
    p_secret: SECRET(),
  });
  if (error) return { error: explain(error.message) };
  const sent = await sendEmail({
    to: email,
    subject: `Your IlluminatED employer code: ${code}`,
    text: `Your code to verify ${name} on IlluminatED is ${code}.\n\nIt expires in 15 minutes. If you didn't ask for this, you can ignore this email.`,
  });
  if (!sent) return { error: "We couldn't send the email. Check the address and try again." };
  return { step: "code", email };
}

export async function verifyEmployerCode(_: EmployerState, fd: FormData): Promise<EmployerState> {
  const sb = await getSupabase();
  if (!sb) return { error: "Please sign in first." };
  const code = String(fd.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { step: "code", email: String(fd.get("email") ?? ""), error: "Enter the 6-digit code." };
  const { error } = await sb.rpc("employer_verify", { p_code: code });
  if (error) return { step: "code", email: String(fd.get("email") ?? ""), error: explain(error.message) };
  revalidatePath("/", "layout");
  redirect("/employers/office?welcome=1");
}

async function requireStaff() {
  const sb = await getSupabase();
  const viewer = await getViewer();
  if (!sb || !viewer) redirect("/sign-in?next=/employers/office");
  const m = await myMembership(viewer.id);
  if (!m) redirect("/employers/join");
  return { sb, viewer, m };
}

export async function updateOrg(_: EmployerState, fd: FormData): Promise<EmployerState> {
  const { sb, m } = await requireStaff();
  if (m.role !== "owner") return { error: "Only the company owner can edit the profile." };
  const about = String(fd.get("about") ?? "").trim().slice(0, 600) || null;
  let website = String(fd.get("website") ?? "").trim();
  if (website && !/^https:\/\//i.test(website)) website = `https://${website.replace(/^http:\/\//i, "")}`;
  const accent = String(fd.get("accent") ?? "");
  const sector = String(fd.get("sector") ?? "");
  const { error } = await sb
    .from("organisations")
    .update({
      about,
      website: website || null,
      ...(/^#[0-9a-f]{6}$/.test(accent) ? { accent } : {}),
      ...(SECTORS.some((s) => s.id === sector) ? { sector } : {}),
    })
    .eq("id", m.org.id);
  if (error) return { error: "Couldn't save. Check the website starts with https://." };
  revalidatePath("/employers/office");
  return { ok: "Profile saved." };
}

export async function postAdvice(_: EmployerState, fd: FormData): Promise<EmployerState> {
  const { sb, viewer, m } = await requireStaff();
  const title = String(fd.get("title") ?? "").trim();
  const body = String(fd.get("body") ?? "").trim();
  const { error } = await sb.from("org_advice").insert({ org_id: m.org.id, author_id: viewer.id, title, body });
  if (error)
    return {
      error: error.message.includes("contact_details")
        ? "Please don't include email addresses, phone numbers or social handles. Learners message you safely through IlluminatED."
        : error.message.includes("blocked_term")
          ? "That includes words our community rules don't allow."
          : "Titles are 5–120 characters and advice 10–2,000.",
    };
  revalidatePath("/employers/office");
  revalidatePath(`/companies/${m.org.slug}`);
  return { ok: "Advice published." };
}

export async function deleteAdvice(fd: FormData) {
  const { sb, m } = await requireStaff();
  await sb.from("org_advice").delete().eq("id", Number(fd.get("id")));
  revalidatePath("/employers/office");
  revalidatePath(`/companies/${m.org.slug}`);
}

export async function addSlot(_: EmployerState, fd: FormData): Promise<EmployerState> {
  const { sb, viewer, m } = await requireStaff();
  const date = String(fd.get("date") ?? "");
  const time = String(fd.get("time") ?? "");
  const minutes = Number(fd.get("minutes") ?? 30);
  const room = String(fd.get("room") ?? "Meeting Room A");
  const repeat = Math.min(4, Math.max(1, Number(fd.get("repeat") ?? 1)));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || ![15, 30, 45, 60].includes(minutes))
    return { error: "Pick a date, a start time and a length." };
  // Times are entered in UK time.
  const start = londonToUtc(date, time);
  if (start.getTime() < Date.now() + 5 * 60_000) return { error: "Pick a time in the future." };
  const rows = Array.from({ length: repeat }, (_, i) => {
    const s = new Date(start.getTime() + i * 7 * 86_400_000);
    return {
      org_id: m.org.id,
      staff_id: viewer.id,
      starts_at: s.toISOString(),
      ends_at: new Date(s.getTime() + minutes * 60_000).toISOString(),
      room,
    };
  });
  const { error } = await sb.from("office_slots").insert(rows);
  if (error) return { error: "Couldn't add those office hours." };
  revalidatePath("/employers/office");
  revalidatePath(`/companies/${m.org.slug}`);
  return { ok: repeat > 1 ? `Added ${repeat} weekly slots.` : "Office hours added." };
}

export async function removeSlot(fd: FormData) {
  const { sb, m } = await requireStaff();
  const id = String(fd.get("id"));
  const { data } = await sb.from("office_slots").select("booked_by").eq("id", id).maybeSingle();
  if (data?.booked_by) await sb.from("office_slots").update({ cancelled: true }).eq("id", id);
  else await sb.from("office_slots").delete().eq("id", id);
  revalidatePath("/employers/office");
  revalidatePath(`/companies/${m.org.slug}`);
}

export async function removeMember(fd: FormData) {
  const { sb, m } = await requireStaff();
  const userId = String(fd.get("user"));
  if (m.role !== "owner") return;
  await sb.from("org_members").delete().eq("org_id", m.org.id).eq("user_id", userId);
  revalidatePath("/employers/office");
}

/** "2026-10-20" + "15:30" in Europe/London → a UTC Date. */
function londonToUtc(date: string, time: string) {
  const guess = new Date(`${date}T${time}:00Z`);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const [h, mi] = fmt.format(guess).split(":").map(Number);
  const [th, tm] = time.split(":").map(Number);
  const offsetMin = h * 60 + mi - (th * 60 + tm);
  return new Date(guess.getTime() - (((offsetMin + 720) % 1440) - 720) * 60_000);
}
