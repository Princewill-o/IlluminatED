"use server";

import { getSupabase } from "@/lib/social/server";

export type League = { week: string; minimum: number; table: { school: string; active: number; score: number; wins: number; mine: boolean }[] };
export type MySchool = { school: string; active: number; score: number | null; rank: number; schools: number } | null;

export async function schoolLeague(subject?: string | null): Promise<League> {
  const sb = await getSupabase();
  const empty = { week: "", minimum: 5, table: [] };
  if (!sb) return empty;
  const { data } = await sb.rpc("school_league", { p_subject: subject ?? null, p_week: null });
  return (data as League) ?? empty;
}

export async function mySchool(): Promise<MySchool> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.rpc("school_mine");
  return (data as MySchool) ?? null;
}
