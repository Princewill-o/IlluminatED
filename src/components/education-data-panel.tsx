"use client";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PREFIX } from "@/lib/storage";
import { browserSupabase } from "@/lib/supabase-browser";
import { useSignedIn } from "@/lib/use-signed-in";
export function EducationDataPanel() {
  const signedIn = useSignedIn();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function clear() {
    if (
      !window.confirm(
        "Clear your account's saved revision checklist ticks, career choices and saved opportunities? Course resources and your other account data will remain.",
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/education/state", { method: "DELETE" });
      if (!r.ok) throw new Error();
      const sb = browserSupabase();
      const user = (await sb?.auth.getSession())?.data.session?.user;
      if (user) {
        const prefix = PREFIX + `education:${user.id}:`;
        for (const key of Object.keys(localStorage))
          if (key.startsWith(prefix)) localStorage.removeItem(key);
      }
      setMessage(
        "Account revision checklists, career choices and saved opportunities cleared.",
      );
    } catch {
      setMessage("Account data couldn't be cleared. Try again when connected.");
    } finally {
      setBusy(false);
    }
  }
  if (!signedIn) return null;
  return (
    <section className="bg-card mb-8 rounded-xl border p-5">
      <h2 className="text-xl font-semibold">
        Your saved study and career choices
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Download or clear your account&apos;s syllabus checklist ticks,
        next-step preferences and saved opportunities. These are private to your
        account.
      </p>
      <div className="mt-4 flex flex-wrap gap-4">
        <a
          className="text-primary text-sm underline"
          href="/api/education/state?export=1"
        >
          Download saved choices
        </a>
        <Button variant="outline" size="sm" disabled={busy} onClick={clear}>
          {busy ? "Clearing…" : "Clear saved study and career choices"}
        </Button>
      </div>
      <p className="mt-3 text-sm" role="status">
        {message}
      </p>
    </section>
  );
}
