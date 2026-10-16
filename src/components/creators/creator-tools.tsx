"use client";

import { useEffect, useState, useTransition } from "react";

import { Check, Copy, Send, Share2 } from "lucide-react";

import { claimReferral, submitCreatorVideo } from "@/app/creators/actions";

export function ReferralLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const text = "I'm revising by playing IlluminatED: get a job, earn Clout, beat my score.";
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="text-sm font-bold text-muted-foreground">Your link</p>
      <p className="mt-1 font-mono text-lg font-bold break-all">{link}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (navigator.share) void navigator.share({ title: "IlluminatED", text, url: link }).catch(() => {});
            else void navigator.clipboard.writeText(`${text} ${link}`);
          }}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-bold"
        >
          <Share2 className="size-4" /> Share
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-border px-4 py-2 text-sm font-bold"
        >
          WhatsApp
        </a>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Put it in your bio and captions. Each new player who joins through it earns you 150 Clout.</p>
    </div>
  );
}

const PLATFORMS = [
  ["tiktok", "TikTok"],
  ["instagram", "Instagram"],
  ["youtube", "YouTube"],
  ["snapchat", "Snapchat"],
  ["x", "X"],
  ["other", "Other"],
] as const;

export function SubmitVideo() {
  const [platform, setPlatform] = useState("tiktok");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<{ ok: boolean; text: string; mailto?: string | null } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="rounded-3xl border border-border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await submitCreatorVideo({ platform, url, note });
          if (r.ok) {
            setUrl("");
            setNote("");
          }
          setState(
            r.ok
              ? { ok: true, text: r.mailto ? "Saved. Tap below to email it over too." : "Sent! We'll review it and email you about payment.", mailto: r.mailto }
              : { ok: false, text: r.error },
          );
        });
      }}
    >
      <p className="font-black">Submit a video</p>
      <label className="mt-3 block text-sm font-bold">
        Where did you post it?
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="mt-1 block w-full rounded-xl border border-input bg-background px-3 py-2.5">
          {PLATFORMS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-sm font-bold">
        Link to the post
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@you/video/..."
          className="mt-1 block w-full rounded-xl border border-input bg-background px-3 py-2.5"
        />
      </label>
      <label className="mt-3 block text-sm font-bold">
        Anything we should know? <span className="font-normal text-muted-foreground">(optional)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className="mt-1 block w-full rounded-xl border border-input bg-background px-3 py-2.5" />
      </label>
      <button type="submit" disabled={pending} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-black text-primary-foreground disabled:opacity-50">
        <Send className="size-4" /> {pending ? "Sending…" : "Send for review"}
      </button>
      {state && (
        <p role="status" className={state.ok ? "mt-3 text-sm font-bold text-success" : "mt-3 text-sm font-bold text-destructive"}>
          {state.text}{" "}
          {state.mailto && (
            <a href={state.mailto} className="underline">
              Email it to us
            </a>
          )}
        </p>
      )}
    </form>
  );
}

/** Runs once after sign-up: credits the creator whose link you came in on. */
export function ClaimReferral() {
  useEffect(() => {
    void claimReferral();
  }, []);
  return null;
}
