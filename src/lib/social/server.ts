import "server-only";

import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { SUPABASE_KEY, SUPABASE_URL, socialConfigured } from "./config";

/** A Supabase client bound to the visitor's session cookies. Returns null when Social isn't configured. */
export async function getSupabase() {
  if (!socialConfigured) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only. The middleware refreshes sessions.
        }
      },
    },
  });
}

export interface Viewer {
  id: string;
  email: string | null;
  profile: {
    username: string;
    role: "member" | "tutor" | "moderator";
    banned: boolean;
  } | null;
}

export async function getViewer(): Promise<Viewer | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await sb
    .from("profiles")
    .select("username, role, banned")
    .eq("id", data.user.id)
    .maybeSingle();
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    profile: (profile as Viewer["profile"]) ?? null,
  };
}
