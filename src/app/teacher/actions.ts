"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireTeacher } from "@/lib/school/access";
import { getSupabase } from "@/lib/social/server";

export async function completeTeacherProfile(form: FormData) {
  const { viewer } = await requireTeacher();
  const username = String(form.get("username") ?? "").trim();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username) || form.get("terms") !== "on") redirect("/teacher?error=details");
  if (!viewer.profile) {
    const sb = await getSupabase();
    const { error } = await sb!.from("profiles").insert({ id: viewer.id, username });
    if (error) redirect("/teacher?error=username");
  }
  revalidatePath("/teacher");
  redirect("/teacher");
}
