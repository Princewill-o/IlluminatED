"use client";

import { useState } from "react";

import { LogOut } from "lucide-react";

import { browserSupabase } from "@/lib/supabase-browser";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await browserSupabase()?.auth.signOut();
        window.location.assign("/");
      }}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left font-bold text-ink-coral transition hover:bg-hover active:scale-[0.98] disabled:opacity-50"
    >
      <LogOut className="size-5" aria-hidden />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
