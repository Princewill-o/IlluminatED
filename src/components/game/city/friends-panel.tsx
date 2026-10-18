"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { cityAction } from "@/app/games/city-actions";
import {
  decrypt,
  deviceKeys,
  e2eeSupported,
  encrypt,
  securityCode,
  sharedKey,
} from "@/lib/e2ee";
import { browserSupabase } from "@/lib/supabase-browser";

export interface FriendEdge {
  id: string;
  otherId: string;
  username: string;
  requestedBy: string;
  state: "pending" | "accepted" | "declined" | "blocked";
  blockedBy: string | null;
}
const btn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-50";

export function FriendsPanel({
  meId,
  friends,
  ready,
}: {
  meId: string;
  friends: FriendEdge[];
  ready: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState<FriendEdge | null>(null);
  const accepted = friends.filter((f) => f.state === "accepted");
  function act(name: string, action: string) {
    start(async () => {
      const r = await cityAction("city_friend_action", {
        p_username: name.replace(/^@/, ""),
        p_action: action,
      });
      setMessage(r.error ?? "Friends list updated.");
      if (!r.error) {
        setUsername("");
        if (action !== "request") setOpen(null);
        router.refresh();
      }
    });
  }
  return (
    <>
      {!ready && (
        <p role="status" className="mb-5 rounded-xl border p-4">
          Friends are temporarily unavailable. Please try again later.
        </p>
      )}
      <div className="bg-card mb-6 rounded-3xl border p-6">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <Users className="size-5" />
          {accepted.length}/30 friends
        </h2>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            act(username, "request");
          }}
        >
          <label className="min-w-0 flex-1 text-sm font-bold">
            Add by exact username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={40}
              placeholder="@username"
              className="bg-background mt-2 block min-h-11 w-full rounded-xl border px-4"
            />
          </label>
          <button
            className={`${btn} bg-primary text-primary-foreground`}
            disabled={!ready || pending || accepted.length >= 30}
          >
            Send friend request
          </button>
        </form>
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          Share your username with people you know. There is no public directory
          of students. Requests do not reveal your email or study results.
        </p>
      </div>
      <p role="status" aria-live="polite" className="mb-4 text-sm">
        {message}
      </p>
      {!friends.some((f) => f.state !== "declined") && (
        <p className="text-muted-foreground mb-5 rounded-2xl border border-dashed p-8 text-center">
          No friends yet. Send a request to someone you know.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {friends
          .filter((f) => f.state !== "declined")
          .map((f) => (
            <article key={f.id} className="bg-card rounded-2xl border p-5">
              <p className="font-black">@{f.username}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {f.state === "pending"
                  ? f.requestedBy === meId
                    ? "Request sent"
                    : "Wants to be your friend"
                  : f.state === "blocked"
                    ? "Blocked — messaging disabled"
                    : "Your friend"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {f.state === "pending" && f.requestedBy !== meId && (
                  <button
                    className={btn}
                    disabled={pending}
                    onClick={() => act(f.username, "accept")}
                  >
                    Accept
                  </button>
                )}
                {f.state === "accepted" && (
                  <button
                    className={`${btn} bg-primary text-primary-foreground`}
                    onClick={() => setOpen(f)}
                  >
                    <MessageCircle className="size-4" />
                    Message
                  </button>
                )}
                {f.state !== "blocked" && (
                  <>
                    <button
                      className={btn}
                      disabled={pending}
                      onClick={() => act(f.username, "remove")}
                    >
                      {f.state === "pending" ? "Dismiss" : "Remove"}
                    </button>
                    <button
                      className={btn}
                      disabled={pending}
                      onClick={() => act(f.username, "block")}
                    >
                      Block
                    </button>
                  </>
                )}
                {f.state === "blocked" && (
                  <>
                    <button className={btn} onClick={() => setOpen(f)}>
                      View message history
                    </button>
                    {f.blockedBy === meId && (
                      <button
                        className={btn}
                        disabled={pending}
                        onClick={() => act(f.username, "unblock")}
                      >
                        Unblock
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
      </div>
      <section className="bg-card mt-7 rounded-2xl border p-5 text-sm leading-6">
        <h2 className="flex items-center gap-2 font-black">
          <ShieldCheck className="size-5" />
          Private conversations, clear controls
        </h2>
        <p className="mt-2">
          Messages are encrypted in your browser. IlluminatED stores ciphertext,
          sender, recipient relationship and timing. Keep conversations here,
          avoid sharing personal details and use Block if something feels wrong.
          Reporting shares the selected message’s text with the safety team.
        </p>
        <Link
          href="/safeguarding"
          className="mt-2 inline-block font-bold underline"
        >
          Safety and support →
        </Link>
      </section>
      {open && (
        <FriendChat
          key={open.id}
          meId={meId}
          friend={open}
          close={() => setOpen(null)}
          onBlock={() => act(open.username, "block")}
        />
      )}
    </>
  );
}

interface EncryptedRow {
  id: number;
  sender_id: string;
  ciphertext: string;
  iv: string;
  created_at: string;
}
interface ReadRow {
  id: number;
  mine: boolean;
  text: string | null;
}

function FriendChat({
  meId,
  friend,
  close,
  onBlock,
}: {
  meId: string;
  friend: FriendEdge;
  close: () => void;
  onBlock: () => void;
}) {
  const sb = browserSupabase();
  const key = useRef<CryptoKey | null>(null);
  const [rows, setRows] = useState<ReadRow[]>([]);
  const [text, setText] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [report, setReport] = useState<ReadRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const onClose = useRef(close);
  onClose.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    input.current?.focus();
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose.current();
      if (e.key === "Tab") {
        const items = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), textarea:not(:disabled), a[href], summary",
          ) ?? [],
        );
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("keydown", esc);
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    if (!sb) return;
    let stopped = false;
    let busy = false;
    async function refresh() {
      if (busy || stopped || !sb) return;
      busy = true;
      try {
        if (!e2eeSupported())
          throw new Error(
            "This browser cannot encrypt messages. Try a secure browser with IndexedDB enabled.",
          );
        const mine = await deviceKeys(meId);
        const { data: published, error: keyError } = await sb
          .from("city_friend_keys")
          .select("public_key")
          .eq("user_id", meId)
          .maybeSingle();
        if (keyError)
          throw new Error("Encryption keys are temporarily unavailable.");
        if (!published) {
          const { error: publishError } = await sb
            .from("city_friend_keys")
            .insert({ user_id: meId, public_key: mine.publicJwk });
          if (publishError)
            throw new Error(
              "Couldn't publish this device's encryption key. Reopen this conversation to retry.",
            );
        } else if (
          published.public_key.x !== mine.publicJwk.x ||
          published.public_key.y !== mine.publicJwk.y
        ) {
          throw new Error(
            "Your messaging key belongs to another browser or device. Use that original browser. Keys cannot be silently replaced and there is currently no key recovery.",
          );
        }
        const { data: peer, error: peerError } = await sb
          .from("city_friend_keys")
          .select("public_key")
          .eq("user_id", friend.otherId)
          .maybeSingle();
        if (peerError || !peer)
          throw new Error(
            "Waiting for your friend to open this conversation on their device. This screen retries automatically.",
          );
        const fingerprint = await securityCode(mine.publicJwk, peer.public_key);
        const pinKey = `illuminated:friend-key:${meId}:${friend.otherId}`;
        const pinned = localStorage.getItem(pinKey);
        if (pinned && pinned !== fingerprint)
          throw new Error(
            "Your friend's security code changed. Messaging is paused. Contact support before trusting a new key.",
          );
        localStorage.setItem(pinKey, fingerprint);
        const derived = await sharedKey(mine.privateKey, peer.public_key);
        const { data, error: loadError } = await sb
          .from("city_friend_messages")
          .select("id,sender_id,ciphertext,iv,created_at")
          .eq("friendship_id", friend.id)
          .order("id", { ascending: false })
          .limit(100);
        if (loadError) throw new Error("Couldn't load this conversation.");
        const shown: ReadRow[] = [];
        for (const row of ((data ?? []) as EncryptedRow[]).reverse()) {
          let plaintext: string | null = null;
          try {
            plaintext = await decrypt(
              derived,
              row.ciphertext,
              row.iv,
              `${friend.id}:${row.sender_id}`,
            );
          } catch {
            /* Never fall back to unencrypted content. */
          }
          shown.push({
            id: row.id,
            mine: row.sender_id === meId,
            text: plaintext,
          });
        }
        if (!stopped) {
          key.current = derived;
          setCode(fingerprint);
          setRows(shown);
          setError(null);
        }
      } catch (e) {
        if (!stopped) {
          key.current = null;
          setError(e instanceof Error ? e.message : "Encryption unavailable.");
        }
      } finally {
        busy = false;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      stopped = true;
      key.current = null;
      window.clearInterval(timer);
    };
  }, [sb, meId, friend.id, friend.otherId]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!sb || !key.current || sending || !text.trim()) return;
    setSending(true);
    setNotice(null);
    try {
      const encrypted = await encrypt(
        key.current,
        text.trim(),
        `${friend.id}:${meId}`,
      );
      const { error: sendError } = await sb.rpc("city_send_message", {
        p_friendship: friend.id,
        p_ciphertext: encrypted.ciphertext,
        p_iv: encrypted.iv,
      });
      if (sendError)
        throw new Error(
          "Couldn't send. Your friendship may have changed or you may need to wait a minute.",
        );
      setText("");
      setNotice("Encrypted message sent.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Couldn't send.");
    } finally {
      setSending(false);
    }
  }
  async function submitReport() {
    if (!sb || !report?.text) return;
    const { error: reportError } = await sb
      .from("city_friend_reports")
      .insert({
        reporter: meId,
        message_id: report.id,
        disclosed_text: report.text,
      });
    setNotice(
      reportError
        ? "Couldn't submit this report, or you have already reported it."
        : "Selected message shared with the safety team.",
    );
    setReport(null);
  }
  return (
    <div className="fixed inset-0 z-[100010] grid place-items-center bg-black/60 p-3">
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-chat-title"
        className="bg-background flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b p-4">
          <LockKeyhole className="text-primary size-5" />
          <h2 id="friend-chat-title" className="flex-1 font-black">
            @{friend.username}
          </h2>
          {friend.state === "accepted" && (
            <button className={btn} onClick={onBlock}>
              Block
            </button>
          )}
          <button
            type="button"
            className="grid size-11 place-items-center"
            aria-label="Close conversation"
            onClick={close}
          >
            <X />
          </button>
        </header>
        <div className="text-muted-foreground border-b p-4 text-xs leading-5">
          <p>
            End-to-end encrypted · single-browser keys · latest 100 messages
          </p>
          {code && (
            <details className="mt-1">
              <summary className="cursor-pointer font-bold">
                Compare your security code
              </summary>
              <p className="mt-2 font-mono">{code}</p>
              <p>
                Compare this code in person or through another trusted channel.
                Initial key delivery depends on IlluminatED. This version has no
                forward secrecy or multi-device recovery; clearing browser
                storage can make your history unreadable.
              </p>
            </details>
          )}
          {error && (
            <p role="status" className="text-destructive mt-2">
              {error}
            </p>
          )}
        </div>
        <div
          className="min-h-32 flex-1 space-y-3 overflow-y-auto p-4"
          aria-label="Messages"
        >
          {!rows.length && (
            <p className="text-muted-foreground text-sm">
              Your private conversation starts here.
            </p>
          )}
          {rows.map((r) => (
            <div
              key={r.id}
              className={`max-w-[90%] rounded-2xl p-3 ${r.mine ? "bg-primary text-primary-foreground ml-auto" : "bg-secondary"}`}
            >
              <p className="text-xs font-bold">
                {r.mine ? "You" : `@${friend.username}`}
              </p>
              <p className="mt-1 text-sm break-words whitespace-pre-wrap">
                {r.text ?? "This message cannot be decrypted on this device."}
              </p>
              {!r.mine && r.text && (
                <button
                  className="mt-2 min-h-9 text-xs underline"
                  onClick={() => setReport(r)}
                >
                  Report this message
                </button>
              )}
            </div>
          ))}
        </div>
        {report && (
          <div className="bg-secondary border-t p-4 text-sm">
            <p>
              Share this selected message’s decrypted text with IlluminatED’s
              safety team? Other messages stay encrypted.
            </p>
            <blockquote className="my-3 max-h-24 overflow-y-auto border-l-2 pl-3">
              {report.text}
            </blockquote>
            <div className="flex gap-2">
              <button className={btn} onClick={submitReport}>
                Share and report
              </button>
              <button className={btn} onClick={() => setReport(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        <p role="status" aria-live="polite" className="px-4 text-sm">
          {notice}
        </p>
        <form className="flex items-end gap-2 border-t p-4" onSubmit={send}>
          <label className="min-w-0 flex-1 text-xs font-bold">
            Message
            <textarea
              ref={input}
              value={text}
              maxLength={4000}
              rows={2}
              onChange={(e) => setText(e.target.value)}
              disabled={friend.state !== "accepted"}
              className="bg-background mt-1 block w-full resize-none rounded-xl border p-3 text-sm"
            />
          </label>
          <button
            className={`${btn} bg-primary text-primary-foreground`}
            disabled={
              sending ||
              !code ||
              Boolean(error) ||
              !text.trim() ||
              friend.state !== "accepted"
            }
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </section>
    </div>
  );
}
