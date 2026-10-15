"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { decrypt, deviceKeys, e2eeSupported, encrypt, securityCode, sharedKey } from "@/lib/e2ee";
import { browserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

interface Row {
  id: number;
  sender_id: string;
  body: string | null;
  ciphertext: string | null;
  iv: string | null;
  created_at: string;
}

interface Shown {
  id: number;
  mine: boolean;
  text: string | null;
  unreadable: boolean;
  at: string;
}

const REASONS = [
  ["inappropriate", "Inappropriate"],
  ["grooming", "Made me uncomfortable / asked to meet or move apps"],
  ["personal-info", "Asked for personal details"],
  ["bullying", "Bullying"],
  ["spam", "Spam"],
  ["other", "Something else"],
] as const;

const ERR: Record<string, string> = {
  contact_details: "Phone numbers, emails and social media handles can't be shared here.",
  blocked_term: "That message includes words our community rules don't allow.",
  rate_limited: "Slow down a little. Try again in a minute.",
  awaiting_guardian: "Waiting for a parent or carer to approve this conversation.",
  thread_closed: "This conversation is closed.",
};

export function ThreadView({
  threadId,
  meId,
  themId,
  mode,
  usable,
}: {
  threadId: string;
  meId: string;
  themId: string;
  mode: "e2ee" | "moderated";
  usable: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [shown, setShown] = useState<Shown[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<Shown | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sb = browserSupabase();

  // Set up encryption keys for this conversation (adults only).
  useEffect(() => {
    if (mode !== "e2ee" || !sb) return;
    (async () => {
      if (!e2eeSupported()) return setKeyError("This browser can't do end-to-end encryption.");
      const mine = await deviceKeys(meId);
      const { data: existing } = await sb.from("user_keys").select("public_key").eq("user_id", meId).maybeSingle();
      const same = existing?.public_key && (existing.public_key as JsonWebKey).x === mine.publicJwk.x;
      if (!same) await sb.from("user_keys").upsert({ user_id: meId, public_key: mine.publicJwk, updated_at: new Date().toISOString() });
      const { data: theirs } = await sb.from("user_keys").select("public_key").eq("user_id", themId).maybeSingle();
      if (!theirs?.public_key) return setKeyError("Waiting for them to open IlluminatED so we can set up encryption. Try again soon.");
      keyRef.current = await sharedKey(mine.privateKey, theirs.public_key as JsonWebKey);
      setCode(await securityCode(mine.publicJwk, theirs.public_key as JsonWebKey));
      setKeyError(null);
    })().catch(() => setKeyError("Couldn't set up encryption on this device."));
  }, [mode, meId, themId, sb]);

  const load = useCallback(async () => {
    if (!sb) return;
    const { data } = await sb.from("dm_messages").select("id,sender_id,body,ciphertext,iv,created_at").eq("thread_id", threadId).order("id").limit(500);
    setRows((data ?? []) as Row[]);
  }, [sb, threadId]);

  useEffect(() => {
    void load();
    if (!sb) return;
    const channel = sb
      .channel(`dm:${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` }, (payload) => {
        setRows((r) => (r.some((x) => x.id === (payload.new as Row).id) ? r : [...r, payload.new as Row]));
      })
      .subscribe();
    const poll = window.setInterval(load, 15000);
    return () => {
      window.clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [sb, threadId, load]);

  // Decrypt (or just show) messages whenever they or the key change.
  useEffect(() => {
    let live = true;
    (async () => {
      const out: Shown[] = [];
      for (const r of rows) {
        let t: string | null = r.body;
        let unreadable = false;
        if (r.ciphertext && r.iv) {
          try {
            t = keyRef.current ? await decrypt(keyRef.current, r.ciphertext, r.iv) : null;
            unreadable = !keyRef.current;
          } catch {
            t = null;
            unreadable = true;
          }
        }
        out.push({ id: r.id, mine: r.sender_id === meId, text: t, unreadable, at: r.created_at });
      }
      if (live) setShown(out);
    })();
    return () => {
      live = false;
    };
  }, [rows, meId, code]);

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [shown.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !sb) return;
    setError(null);
    let row: Record<string, unknown> = { thread_id: threadId, sender_id: meId };
    if (mode === "e2ee") {
      if (!keyRef.current) return setError(keyError ?? "Encryption isn't ready yet.");
      row = { ...row, ...(await encrypt(keyRef.current, body.slice(0, 2000))) };
    } else {
      row = { ...row, body: body.slice(0, 2000) };
    }
    const { data, error: err } = await sb.from("dm_messages").insert(row).select("id,sender_id,body,ciphertext,iv,created_at").single();
    if (err) {
      const key = Object.keys(ERR).find((k) => err.message.includes(k));
      return setError(key ? ERR[key] : "Couldn't send. Please try again.");
    }
    setText("");
    setRows((r) => (r.some((x) => x.id === (data as Row).id) ? r : [...r, data as Row]));
  };

  const report = async (reason: string) => {
    if (!sb || !reporting) return;
    await sb.from("dm_reports").insert({
      message_id: reporting.id,
      reason,
      disclosed: mode === "e2ee" ? (reporting.text ?? "").slice(0, 2000) : null,
    });
    setReporting(null);
    setError("Thanks. Our safety team will look at this. If you feel unsafe, talk to a trusted adult or see our Safeguarding page.");
  };

  return (
    <div className="flex h-[calc(100dvh-56px-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom)-90px)] flex-col md:h-[calc(100dvh-170px)]">
      {mode === "e2ee" && (
        <p className="text-muted-foreground px-1 pb-2 text-xs">
          🔒 End-to-end encrypted{code && <> · security code <span className="font-mono">{code}</span></>}
          {keyError && <span className="ml-1 text-ink-sun">{keyError}</span>}
        </p>
      )}
      <div className="bg-card flex-1 space-y-2 overflow-y-auto rounded-3xl border p-3">
        {shown.length === 0 && <p className="text-muted-foreground py-10 text-center text-sm">Say hello and ask your question.</p>}
        {shown.map((m) => (
          <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "group max-w-[80%] rounded-3xl px-4 py-2.5 text-[15px] leading-6",
                m.mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-secondary",
              )}
            >
              {m.unreadable ? <em className="text-white/60">🔒 Encrypted on another device</em> : <span className="whitespace-pre-wrap">{m.text}</span>}
              <span className="mt-0.5 flex items-center justify-end gap-2 text-[10px] opacity-60">
                {new Date(m.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                {!m.mine && (
                  <button type="button" onClick={() => setReporting(m)} className="underline">
                    Report
                  </button>
                )}
              </span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-ink-sun" role="alert">{error}</p>}
      <form onSubmit={send} className="mt-2 flex gap-2">
        <label htmlFor="msg" className="sr-only">
          Message
        </label>
        <textarea
          id="msg"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(e);
            }
          }}
          disabled={!usable}
          maxLength={2000}
          rows={1}
          placeholder={usable ? "Message…" : "You can't send messages in this conversation yet"}
          className="bg-card max-h-32 flex-1 resize-none rounded-3xl border px-4 py-3"
        />
        <button disabled={!usable || !text.trim()} className="rounded-full bg-[#c6f36b] px-5 font-black text-[#0b0910] disabled:opacity-40">
          Send
        </button>
      </form>
      {reporting && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 md:place-items-center" onClick={() => setReporting(null)}>
          <div className="bg-card w-full max-w-sm rounded-t-3xl border p-5 md:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Report message">
            <h2 className="text-lg font-black">Report this message</h2>
            {mode === "e2ee" && (
              <p className="text-muted-foreground mt-1 text-xs">This one message will be shared with our safety team so they can read it.</p>
            )}
            <div className="mt-3 grid gap-2">
              {REASONS.map(([id, label]) => (
                <button key={id} type="button" onClick={() => void report(id)} className="rounded-2xl bg-foreground/[0.05] px-4 py-3 text-left text-sm font-bold hover:bg-hover">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
