"use server";

import { revalidatePath } from "next/cache";

import { getSupabase, getViewer } from "@/lib/social/server";

const PATH = "/social/moderation";
const UUID = /^[0-9a-f-]{36}$/i;

/** Returns a client only when the caller is a moderator. The database checks again with RLS. */
async function asModerator() {
  const sb = await getSupabase();
  const viewer = await getViewer();
  if (!sb || viewer?.profile?.role !== "moderator" || viewer.profile.banned)
    return null;
  return { sb, viewer };
}

export async function setContactStatus(fd: FormData) {
  const m = await asModerator();
  if (!m) return;
  const id = Number(fd.get("id"));
  const handled = fd.get("status") === "handled";
  if (!Number.isInteger(id)) return;
  await m.sb
    .from("contact_messages")
    .update({
      status: handled ? "handled" : "new",
      handled_by: handled ? m.viewer.id : null,
    })
    .eq("id", id);
  revalidatePath(PATH);
}

/** Closes a single report without changing the post. */
export async function dismissReport(fd: FormData) {
  const m = await asModerator();
  if (!m) return;
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return;
  await m.sb.from("reports").update({ resolved: true }).eq("id", id);
  revalidatePath(PATH);
}

export async function addBlockedTerm(fd: FormData) {
  const m = await asModerator();
  if (!m) return;
  const term = String(fd.get("term") ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (term.length < 2 || term.length > 60) return;
  await m.sb
    .from("blocked_terms")
    .upsert({ term }, { onConflict: "term", ignoreDuplicates: true });
  revalidatePath(PATH);
}

export async function removeBlockedTerm(fd: FormData) {
  const m = await asModerator();
  if (!m) return;
  const term = String(fd.get("term") ?? "");
  if (!term) return;
  await m.sb.from("blocked_terms").delete().eq("term", term);
  revalidatePath(PATH);
}

export async function unbanMember(fd: FormData) {
  const m = await asModerator();
  if (!m) return;
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return;
  await m.sb.from("profiles").update({ banned: false }).eq("id", id);
  revalidatePath("/social", "layout");
}
