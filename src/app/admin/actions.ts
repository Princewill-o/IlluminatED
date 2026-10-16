"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { getSupabase, getViewer } from "@/lib/social/server";

/** Lets someone in: their email can finish setting up an account. */
export async function inviteEmail(formData: FormData) {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  const note = String(formData.get("note") ?? "").slice(0, 200);
  if (!email.success) return;
  const [sb, viewer] = await Promise.all([getSupabase(), getViewer()]);
  if (!sb || !viewer) return;
  await sb.from("access_invites").upsert({ email: email.data, note: note || null, invited_by: viewer.id });
  await sb.from("demo_requests").update({ status: "invited" }).eq("email", email.data);
  revalidatePath("/admin");
}

export async function setDemoStatus(formData: FormData) {
  const id = Number(formData.get("id"));
  const status = z.enum(["new", "booked", "invited", "closed"]).safeParse(formData.get("status"));
  if (!Number.isInteger(id) || !status.success) return;
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("demo_requests").update({ status: status.data }).eq("id", id);
  revalidatePath("/admin");
}
