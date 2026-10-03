"use server";

import { revalidatePath } from "next/cache";

import { getSupabase } from "@/lib/social/server";

export async function savePrivateSchool(formData: FormData) {
  const sb = await getSupabase();
  if (!sb) throw new Error("Account unavailable");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const school = String(formData.get("school") ?? "").trim().replace(/\s+/g, " ");
  if (school.length > 100) throw new Error("School name is too long");
  if (!school) {
    const { error } = await sb.from("private_school").delete().eq("user_id", user.id);
    if (error) throw new Error("Could not remove school");
  } else {
    if (school.length < 2) throw new Error("Enter at least two characters");
    const { error } = await sb.from("private_school").upsert({ user_id: user.id, school_name: school, updated_at: new Date().toISOString() });
    if (error) throw new Error("Could not save school");
  }
  revalidatePath("/social/account");
}

export async function saveFriendRequests(formData: FormData) {
  const sb = await getSupabase();
  if (!sb) throw new Error("Account unavailable");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const allow = formData.get("allow") === "on";
  const { data: existing, error: readError } = await sb.from("social_friend_settings").select("user_id").eq("user_id", user.id).maybeSingle();
  if (readError) throw new Error("Could not load friend request setting");
  const { error } = existing
    ? await sb.from("social_friend_settings").update({ allow_requests: allow }).eq("user_id", user.id)
    : await sb.from("social_friend_settings").insert({ user_id: user.id, allow_requests: allow });
  if (error) throw new Error("Could not save friend request setting");
  revalidatePath("/social/account");
}
