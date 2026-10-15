import "server-only";

import type { OfficeOrg } from "@/game/core/world";
import { getSupabase } from "@/lib/social/server";

export const SECTORS = [
  { id: "tech", label: "Technology" },
  { id: "finance", label: "Finance and banking" },
  { id: "law", label: "Law" },
  { id: "health", label: "Health and care" },
  { id: "engineering", label: "Engineering" },
  { id: "construction", label: "Construction" },
  { id: "creative", label: "Creative and media" },
  { id: "retail", label: "Retail and hospitality" },
  { id: "public", label: "Public sector" },
  { id: "education", label: "Education" },
  { id: "consulting", label: "Consulting" },
  { id: "energy", label: "Energy" },
  { id: "other", label: "Other" },
] as const;

export const sectorLabel = (id: string) => SECTORS.find((s) => s.id === id)?.label ?? id;

export interface Org extends OfficeOrg {
  id: string;
  domain: string;
  website: string | null;
  about: string | null;
}

export interface Staff {
  userId: string;
  username: string;
  title: string | null;
  role: "owner" | "mentor";
}

export interface Membership {
  org: Org;
  role: "owner" | "mentor";
  title: string | null;
}

const toOrg = (r: Record<string, unknown>): Org => ({
  id: r.id as string,
  slug: r.slug as string,
  name: r.name as string,
  sector: r.sector as string,
  accent: r.accent as string,
  domain: r.domain as string,
  website: (r.website as string | null) ?? null,
  about: (r.about as string | null) ?? null,
});

/** Verified employers, for Careers Campus and the directory. Empty until the migration is applied. */
export async function listOrgs(): Promise<Org[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("organisations")
    .select("id,slug,name,sector,accent,domain,website,about")
    .eq("status", "verified")
    .order("name")
    .limit(48);
  if (error) return [];
  return (data ?? []).map(toOrg);
}

export async function orgBySlug(slug: string): Promise<Org | null> {
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) return null;
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("organisations")
    .select("id,slug,name,sector,accent,domain,website,about")
    .eq("slug", slug)
    .eq("status", "verified")
    .maybeSingle();
  return data ? toOrg(data) : null;
}

/** Staff of several organisations, keyed by org id. */
export async function staffFor(orgIds: string[]): Promise<Record<string, Staff[]>> {
  if (!orgIds.length) return {};
  const sb = await getSupabase();
  if (!sb) return {};
  const { data, error } = await sb
    .from("org_members")
    .select("org_id,user_id,role,job_title,profile:profiles!inner(username,banned)")
    .in("org_id", orgIds);
  if (error) return {};
  const out: Record<string, Staff[]> = {};
  for (const r of data ?? []) {
    const p = (Array.isArray(r.profile) ? r.profile[0] : r.profile) as { username: string; banned: boolean } | undefined;
    if (!p || p.banned) continue;
    (out[r.org_id as string] ??= []).push({
      userId: r.user_id as string,
      username: p.username,
      title: (r.job_title as string | null) ?? null,
      role: r.role as Staff["role"],
    });
  }
  return out;
}

/** The signed-in person's employer membership, if they're verified staff. */
export async function myMembership(userId: string): Promise<Membership | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("org_members")
    .select("role,job_title,org:organisations!inner(id,slug,name,sector,accent,domain,website,about,status)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const org = (Array.isArray(data.org) ? data.org[0] : data.org) as Record<string, unknown> | undefined;
  if (!org || org.status !== "verified") return null;
  return { org: toOrg(org), role: data.role as Membership["role"], title: (data.job_title as string | null) ?? null };
}

export interface Advice {
  id: number;
  title: string;
  body: string;
  author: string;
  authorId: string;
  createdAt: string;
}

export async function adviceFor(orgId: string): Promise<Advice[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("org_advice")
    .select("id,title,body,author_id,created_at,author:profiles!org_advice_author_id_fkey(username)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []).map((r) => {
    const a = (Array.isArray(r.author) ? r.author[0] : r.author) as { username: string } | undefined;
    return {
      id: r.id as number,
      title: r.title as string,
      body: r.body as string,
      author: a?.username ?? "staff",
      authorId: r.author_id as string,
      createdAt: r.created_at as string,
    };
  });
}

export interface Slot {
  id: string;
  staffId: string;
  staff: string;
  startsAt: string;
  endsAt: string;
  room: string;
  bookedBy: string | null;
  cancelled: boolean;
}

export async function slotsFor(orgId: string): Promise<Slot[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("office_slots")
    .select("id,staff_id,starts_at,ends_at,room,booked_by,cancelled")
    .eq("org_id", orgId)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at")
    .limit(60);
  const rows = data ?? [];
  const staff = await staffFor([orgId]);
  const names = new Map((staff[orgId] ?? []).map((s) => [s.userId, s.username]));
  return rows.map((r) => ({
    id: r.id as string,
    staffId: r.staff_id as string,
    staff: names.get(r.staff_id as string) ?? "staff",
    startsAt: r.starts_at as string,
    endsAt: r.ends_at as string,
    room: r.room as string,
    bookedBy: (r.booked_by as string | null) ?? null,
    cancelled: Boolean(r.cancelled),
  }));
}
