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
  const {data:admin}=await sb.rpc("platform_admin_status");if(admin!==true)throw new Error("Administrator access required.");
  const schoolId=String(formData.get("schoolId")??"");
  const role=String(formData.get("schoolRole")??"student");
  if(schoolId&&(!z.string().uuid().safeParse(schoolId).success||!["teacher","student"].includes(role)))throw new Error("Choose a school and role.");
  const {error}=await sb.from("access_invites").upsert({ email: email.data, note: note || null, invited_by: viewer.id, school_id:schoolId||null, school_role:schoolId?role:null });
  if(error)throw new Error("The invitation could not be saved.");
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

/** Record a school agreement after its payment has been checked outside the app. */
export async function approveSchoolLicence(form: FormData) {
 const name=z.string().trim().min(2).max(100).safeParse(form.get("schoolName"));
 const agreement=z.string().trim().min(3).max(200).safeParse(form.get("agreement"));
 const seats=z.coerce.number().int().min(1).max(100000).safeParse(form.get("seats"));
 const end=String(form.get("expires")??"");
 if(!name.success||!agreement.success||!seats.success||!/^\d{4}-\d{2}-\d{2}$/.test(end)||form.get("paid")!=="on")throw new Error("Add a school, seat count, agreement reference, expiry and confirmed payment.");
 const expires=new Date(`${end}T23:59:59Z`);
 if(!Number.isFinite(expires.getTime())||expires.getTime()<=Date.now())throw new Error("The licence expiry must be in the future.");
 const [sb,viewer]=await Promise.all([getSupabase(),getViewer()]);
 if(!sb||!viewer)return;
 const {data:admin}=await sb.rpc("platform_admin_status");if(admin!==true)throw new Error("Administrator access required.");
 const {error}=await sb.from("school_licences").insert({name:name.data,seats:seats.data,agreement_reference:agreement.data,expires_at:expires.toISOString(),status:"active",payment_approved_at:new Date().toISOString(),approved_by:viewer.id});
 if(error)throw new Error("The school licence could not be saved.");
 revalidatePath("/admin");
}

export async function changeSchoolLicence(form:FormData) {
 const id=z.string().uuid().safeParse(form.get("schoolId"));
 const status=z.enum(["active","suspended"]).safeParse(form.get("status"));
 if(!id.success||!status.success)return;
 const sb=await getSupabase();if(!sb)return;
 const {data:admin}=await sb.rpc("platform_admin_status");if(admin!==true)throw new Error("Administrator access required.");
 const {error}=await sb.from("school_licences").update({status:status.data}).eq("id",id.data);
 if(error)throw new Error("Could not update the licence.");
 revalidatePath("/admin");
}
