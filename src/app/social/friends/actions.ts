"use server";

import { revalidatePath } from "next/cache";

import { getSupabase, getViewer } from "@/lib/social/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function changeConnection(formData: FormData) {
  const viewer = await getViewer();
  const sb = await getSupabase();
  if (!viewer?.profile || viewer.profile.banned || !sb) return;
  const target = String(formData.get("target") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!UUID.test(target) || target === viewer.id) return;

  if (action === "request") {
    await sb.from("social_connections").insert({ requester: viewer.id, recipient: target });
  } else if (action === "accept") {
    await sb.from("social_connections").update({ status: "accepted" }).eq("requester", target).eq("recipient", viewer.id).eq("status", "pending");
  } else if (action === "remove") {
    await sb.from("social_connections").delete().or(`and(requester.eq.${viewer.id},recipient.eq.${target}),and(requester.eq.${target},recipient.eq.${viewer.id})`);
  }
  revalidatePath("/social/friends");
  const username = String(formData.get("username") ?? "");
  if (/^[A-Za-z0-9_]{3,20}$/.test(username)) revalidatePath(`/social/u/${username}`);
}
