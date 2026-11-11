"use client";

import { useMemo, useRef, useState } from "react";

import { Heart, Send, UserPlus, X } from "lucide-react";

import { FRIEND_AFTER, TALK_TOPICS, freeReply, personaFor, topicReply } from "@/game/core/npc-talk";
import { browserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

interface Line { who: "me" | "them"; text: string }

/** A chat with a fictional resident or passenger: pick topics or say anything, and make a friend. */
export function NpcTalk({ person, onClose }: { person: { id: string; name: string; heading?: string }; onClose: () => void }) {
  const p = useMemo(() => personaFor(person.id, person.name, person.heading), [person.id, person.name, person.heading]);
  const first = p.name.split(" ")[0];
  const [lines, setLines] = useState<Line[]>(() => [{ who: "them", text: topicReply(p, "hello") }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [friend, setFriend] = useState<"no" | "saving" | "yes">("no");
  const [notice, setNotice] = useState("");
  const turns = useRef(0);
  const offline = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const chats = lines.filter((l) => l.who === "me").length;
  const warmth = Math.min(1, chats / FRIEND_AFTER);

  const add = (line: Line) => {
    setLines((l) => [...l, line].slice(-40));
    requestAnimationFrame(() => scroll.current?.scrollTo({ top: 1e6, behavior: "smooth" }));
  };

  const topic = (id: string, label: string) => {
    add({ who: "me", text: label });
    turns.current++;
    setTimeout(() => add({ who: "them", text: topicReply(p, id, turns.current) }), 450);
  };

  const say = async () => {
    const text = draft.trim().slice(0, 280);
    if (!text || busy) return;
    setDraft("");
    add({ who: "me", text });
    turns.current++;
    setBusy(true);
    try {
      if (!offline.current) {
        const history = [...lines, { who: "me" as const, text }].slice(-10).map((l) => ({ role: l.who === "me" ? "user" : "assistant", content: l.text }));
        const res = await fetch("/api/npc-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, name: p.name, heading: p.heading, messages: history }) });
        if (res.ok && res.body) {
          const reader = res.body.getReader(), decoder = new TextDecoder();
          let reply = "";
          setLines((l) => [...l, { who: "them", text: "…" }]);
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            reply += decoder.decode(value, { stream: true });
            const shown = reply;
            setLines((l) => [...l.slice(0, -1), { who: "them", text: shown || "…" }]);
          }
          requestAnimationFrame(() => scroll.current?.scrollTo({ top: 1e6 }));
          return;
        }
        const body = await res.json().catch(() => null) as { error?: string; code?: string } | null;
        if (res.status === 429 && body?.error) setNotice(body.error);
        // Not signed in, or chat isn't switched on here: keep talking with built-in replies.
        offline.current = true;
      }
      await new Promise((ok) => setTimeout(ok, 450));
      add({ who: "them", text: freeReply(p, text, turns.current) });
    } catch {
      offline.current = true;
      add({ who: "them", text: freeReply(p, text, turns.current) });
    } finally {
      setBusy(false);
    }
  };

  const befriend = async () => {
    setFriend("saving");
    const sb = browserSupabase();
    const map = p.id.split(":resident:")[0];
    const r = await sb?.rpc("city_befriend_npc", { p_npc: p.id, p_name: p.name, p_map: map }).then((x) => x, () => null);
    if (!r || r.error) {
      setFriend("no");
      setNotice(r?.error?.message.includes("friend_limit") ? "You have 30 city contacts. Remove one in Messages first." : "Sign in to save city contacts. You can still chat!");
      return;
    }
    setFriend("yes");
    window.dispatchEvent(new Event("illuminated:contacts"));
    add({ who: "them", text: `Brilliant! I've saved your number in my phone. Message me any time, ${["catch you later", "speak soon", "see you around"][turns.current % 3]}!` });
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-[100008] flex justify-center p-2 sm:p-4 md:inset-auto md:right-4 md:bottom-24" role="dialog" aria-label={`Talking to ${p.name}`}>
      <section className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-b-8 border-black/25 bg-[#f7f4ee] text-[#16213a] shadow-2xl [color-scheme:light]">
        <header className="flex items-center gap-3 bg-[#16213a] px-4 py-3 text-white">
          <span className="grid size-10 place-items-center rounded-full bg-[#ffd166] text-lg font-black text-[#16213a]" aria-hidden>{first[0]}</span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-black">{p.name}</h2>
            <p className="truncate text-xs text-white/70">{p.job[0].toUpperCase() + p.job.slice(1)} · from {p.from}{p.heading ? ` · going to ${p.heading}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Say bye" className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
        </header>
        <div className="flex items-center gap-2 border-b border-black/10 px-4 py-2 text-xs">
          <Heart className={cn("size-4", warmth >= 1 ? "fill-[#e0457b] text-[#e0457b]" : "text-[#e0457b]")} aria-hidden />
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/10" role="meter" aria-label="Friendship" aria-valuenow={Math.round(warmth * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span className="block h-full rounded-full bg-[#e0457b] transition-[width]" style={{ width: `${warmth * 100}%` }} />
          </span>
          {friend === "yes" ? <span className="font-black text-[#15987f]">Friends</span>
            : <button type="button" disabled={warmth < 1 || friend === "saving"} onClick={() => void befriend()} className="flex items-center gap-1 rounded-full bg-[#e0457b] px-2.5 py-1 font-black text-white disabled:opacity-40"><UserPlus className="size-3.5" /> Add contact</button>}
        </div>
        <div ref={scroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3" aria-live="polite">
          {lines.map((l, i) => (
            <p key={i} className={cn("w-fit max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug", l.who === "me" ? "ml-auto rounded-br-sm bg-[#2b5fd9] text-white" : "rounded-bl-sm bg-white shadow-sm")}>{l.text}</p>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
          {TALK_TOPICS.map((t) => (
            <button key={t.id} type="button" onClick={() => topic(t.id, t.label)} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-sm hover:bg-[#eef3ff]">{t.label}</button>
          ))}
        </div>
        <form className="flex gap-2 border-t border-black/10 p-3" onSubmit={(e) => { e.preventDefault(); void say(); }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 280))} placeholder={`Say anything to ${first}…`} aria-label={`Message ${first}`} className="min-w-0 flex-1 rounded-full border border-black/15 bg-white px-4 py-2.5 text-sm" />
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="grid size-11 place-items-center rounded-full bg-[#2b5fd9] text-white disabled:opacity-40"><Send className="size-4" /></button>
        </form>
        <p className="px-4 pb-3 text-[11px] text-black/50">{notice || `${first} is a character in the game. Keep your real name and details private.`}</p>
      </section>
    </div>
  );
}
