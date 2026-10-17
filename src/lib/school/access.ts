import "server-only";

import { cache } from "react";

import { redirect } from "next/navigation";

import { getSupabase, getViewer } from "@/lib/social/server";

export interface SchoolAccess { id: string; name: string; role: "teacher" | "student"; active: boolean; status: string; expiresAt: string; }
async function readSchoolAccess(sb: NonNullable<Awaited<ReturnType<typeof getSupabase>>>): Promise<SchoolAccess | null> {
  const { data, error } = await sb.rpc("school_access");
  if (error) throw new Error("School access could not be verified. Please try again.");
  return data as SchoolAccess | null;
}

/** Reuse a viewer that the caller has already verified, avoiding another auth request. */
export async function getSchoolAccessForVerifiedViewer(): Promise<SchoolAccess | null> {
  const sb = await getSupabase();
  return sb ? readSchoolAccess(sb) : null;
}

export const getSchoolAccess = cache(async (): Promise<SchoolAccess | null> => {
  const sb = await getSupabase();
  if (!sb) return null;
  const {data:auth}=await sb.auth.getUser();
  if(!auth.user)return null;
  return readSchoolAccess(sb);
});

export async function requireTeacher() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/teacher");
  const access = await getSchoolAccessForVerifiedViewer();
  const sb = await getSupabase();
  const { data: admin } = await sb!.rpc("platform_admin_status");
  if (admin === true) return { viewer, access };
  if (!access?.active) redirect("/school-access");
  if (access.role !== "teacher") redirect("/homework");
  return { viewer, access };
}
