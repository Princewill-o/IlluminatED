import "server-only";

import { cache } from "react";

import { redirect } from "next/navigation";

import { getSupabase, getViewer } from "@/lib/social/server";

export interface SchoolAccess { id: string; name: string; role: "teacher" | "student"; active: boolean; status: string; expiresAt: string; }
export const getSchoolAccess = cache(async (): Promise<SchoolAccess | null> => {
  const sb = await getSupabase();
  if (!sb) return null;
  const {data:auth}=await sb.auth.getUser();
  if(!auth.user)return null;
  const { data, error } = await sb.rpc("school_access");
  if (error) throw new Error("School access could not be verified. Please try again.");
  return data as SchoolAccess | null;
});

export async function requireTeacher() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/teacher");
  const access = await getSchoolAccess();
  const sb = await getSupabase();
  const { data: admin } = await sb!.rpc("platform_admin_status");
  if (admin === true) return { viewer, access };
  if (!access?.active) redirect("/school-access");
  if (access.role !== "teacher") redirect("/homework");
  return { viewer, access };
}
