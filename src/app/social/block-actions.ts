"use server";

import { revalidatePath } from "next/cache";

import { getSupabase, getViewer } from "@/lib/social/server";

const UUID = /^[0-9a-f-]{36}$/i;

/** Block or unblock a member. Blocks only affect what the blocker sees. */
export async function toggleBlock(fd: FormData) {
  const sb = await getSupabase();
  const viewer = await getViewer();
  if (!sb || !viewer) return;
  const target = String(fd.get("target") ?? "");
  const username = String(fd.get("username") ?? "");
  const action = fd.get("action");
  if (!UUID.test(target) || target === viewer.id) return;
  if (action === "block") {
    await sb
      .from("user_blocks")
      .upsert(
        { blocker: viewer.id, blocked: target },
        { onConflict: "blocker,blocked", ignoreDuplicates: true },
      );
  } else if (action === "unblock") {
    await sb
      .from("user_blocks")
      .delete()
      .eq("blocker", viewer.id)
      .eq("blocked", target);
  }
  revalidatePath("/social", "layout");
  if (/^[A-Za-z0-9_]{3,20}$/.test(username))
    revalidatePath(`/social/u/${username}`);
}
