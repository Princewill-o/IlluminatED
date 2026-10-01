"use server";

import { redirect } from "next/navigation";

import { getSupabase } from "@/lib/social/server";

/** A parent or guardian answers the consent email. The token is checked in the database. */
export async function respondAsGuardian(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  const accept = fd.get("answer") === "yes";
  const sb = await getSupabase();
  let result = "error";
  if (sb && token.length >= 32 && token.length <= 200) {
    const { data, error } = await sb.rpc("guardian_respond", {
      token,
      accept,
    });
    if (!error && typeof data === "string") result = data;
  }
  redirect(`/guardian/confirm?result=${encodeURIComponent(result)}`);
}
