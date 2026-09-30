"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SUPABASE_KEY,
  SUPABASE_URL,
  socialConfigured,
} from "@/lib/social/config";

let client: SupabaseClient | null = null;

/** Browser Supabase client (publishable key only). Null when accounts aren't configured. */
export function browserSupabase(): SupabaseClient | null {
  if (!socialConfigured) return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
