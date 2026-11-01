"use client";
import { useCallback, useEffect, useState } from "react";

import { ChevronLeft, MessageCircle, Users, X } from "lucide-react";

import { NPC_SPOTS, PLAYER } from "./art";
import { FriendsPanel, type FriendEdge } from "../city/friends-panel";

import { NPC_TOPICS, type NpcFriend } from "@/game/core/city-social";
import { browserSupabase } from "@/lib/supabase-browser";

export function PhoneMessages({ meId }: { meId: string }) {
  const [friends, setFriends] = useState<FriendEdge[]>([]);
  const [npcs, setNpcs] = useState<NpcFriend[]>([]);
  const [ready, setReady] = useState(false);
  const [npcError, setNpcError] = useState("");
  const [selected, setSelected] = useState<NpcFriend | null>(null);
  const [thread, setThread] = useState<{ mine: boolean; text: string }[]>([]);
  const load = useCallback(async () => {
    const sb = browserSupabase();
    if (!sb) return;
    const [f, n] = await Promise.all([
      sb
        .from("city_friends")
        .select(
          "id,low_id,high_id,requested_by,state,blocked_by,low:profiles!city_friends_low_id_fkey(username),high:profiles!city_friends_high_id_fkey(username)",
        )
        .or(`low_id.eq.${meId},high_id.eq.${meId}`)
        .in("state", ["accepted", "pending", "blocked"])
        .order("updated_at", { ascending: false })
        .limit(100),
      sb
        .from("city_npc_friends")
        .select("npc_id,name,map_id,created_at")
        .eq("user_id", meId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    const one = (v: unknown) =>
      (Array.isArray(v) ? v[0] : v) as { username: string } | null;
    setFriends(
      (f.data ?? []).map((f) => ({
        id: f.id,
        otherId: f.low_id === meId ? f.high_id : f.low_id,
        username: one(f.low_id === meId ? f.high : f.low)?.username ?? "player",
        requestedBy: f.requested_by,
        state: f.state,
        blockedBy: f.blocked_by,
      })),
    );
    setNpcs((n.data ?? []) as NpcFriend[]);
    setReady(!f.error);
    setNpcError(
      n.error ? "City contacts could not load. Try reopening Messages." : "",
    );
  }, [meId]);
  useEffect(() => {
    void load();
    const changed = () => void load();
    window.addEventListener("illuminated:contacts", changed);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("illuminated:contacts", changed);
    };
  }, [load]);
  if (selected)
    return (
      <section className="flex h-full flex-col bg-[#f2f2f7] text-[#172b28]">
        <header className="flex items-center gap-2 border-b border-black/5 bg-white/90 p-3">
          <button
            aria-label="Back to messages"
            onClick={() => setSelected(null)}
            className="grid size-11 place-items-center text-[#1675ed]"
          >
            <ChevronLeft />
          </button>
          <div className="flex-1">
            <p className="font-bold">{selected.name}</p>
            <p className="text-xs text-[#63716e]">
              City character · scripted conversation
            </p>
          </div>
        </header>
        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
          aria-live="polite"
        >
          <p className="mx-auto max-w-56 text-center text-xs text-[#63716e]">
            You met in {selected.map_id.replaceAll("-", " ")}. Choose a topic to
            chat.
          </p>
          {thread.map((m, i) => (
            <p
              key={i}
              className={`w-fit max-w-[85%] rounded-[1.25rem] px-4 py-2 text-sm ${m.mine ? "ml-auto rounded-br-md bg-[#1675ed] text-white" : "rounded-bl-md bg-[#e5e5ea] text-[#172b28]"}`}
            >
              {m.text}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-black/5 p-3">
          {NPC_TOPICS.map((t) => (
            <button
              key={t.label}
              onClick={() =>
                setThread((rows) =>
                  [
                    ...rows,
                    { mine: true, text: t.label },
                    { mine: false, text: t.reply },
                  ].slice(-30),
                )
              }
              className="min-h-11 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-[#1675ed]"
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          className="min-h-11 text-xs text-[#bd4343]"
          onClick={async () => {
            const sb = browserSupabase();
            const r = await sb
              ?.from("city_npc_friends")
              .delete()
              .eq("user_id", meId)
              .eq("npc_id", selected.npc_id);
            if (r && !r.error) {
              setSelected(null);
              void load();
            } else setNpcError("Could not remove this contact. Try again.");
          }}
        >
          Remove city contact
        </button>
        {npcError && (
          <p role="status" className="px-4 pb-2 text-xs">
            {npcError}
          </p>
        )}
      </section>
    );
  return (
    <div className="h-full overflow-y-auto bg-[#f2f2f7] p-3 text-[#172b28]">
      <h2 className="px-1 pb-3 text-3xl font-bold tracking-tight">Messages</h2>
      {!!npcs.length && (
        <section className="mb-4 overflow-hidden rounded-2xl bg-white">
          <h3 className="px-4 pt-3 text-xs font-bold tracking-wider text-[#63716e] uppercase">
            City contacts
          </h3>
          {npcs.map((n) => (
            <button
              key={n.npc_id}
              onClick={() => {
                setSelected(n);
                setThread([]);
                setNpcError("");
              }}
              className="flex min-h-16 w-full items-center gap-3 border-b border-black/5 px-4 py-3 text-left last:border-0"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e2ece7] font-bold text-[#21584b]">
                {n.name[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{n.name}</span>
                <span className="text-xs text-[#63716e]">
                  City character · tap to chat
                </span>
              </span>
              <MessageCircle className="size-4 text-[#1675ed]" />
            </button>
          ))}
        </section>
      )}
      {npcError && (
        <p role="status" className="mb-3 text-xs">
          {npcError}
        </p>
      )}
      <FriendsPanel
        meId={meId}
        friends={friends}
        ready={ready}
        compact
        onChanged={load}
      />
    </div>
  );
}

export function NearbyPeople({
  people,
  mapId,
  onRequest,
  onClose,
}: {
  people: import("@/game/core/city-social").NearbyPerson[];
  meId: string;
  mapId: string;
  onRequest: (name: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  return (
    <section className="flex h-full flex-col bg-[#f2f2f7] p-4 text-[#172b28]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Nearby</h2>
        <button
          aria-label="Close nearby people"
          onClick={onClose}
          className="grid size-11 place-items-center"
        >
          <X />
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#63716e]">
        Walk within two tiles to say hello. Players choose whether to accept
        your request. City characters can become contacts immediately.
      </p>
      <p role="status" className="my-3 text-sm">
        {notice}
      </p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {people.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center">
            <Users className="mx-auto mb-3 text-[#63716e]" />
            <p className="text-sm">Nobody close enough yet.</p>
            <p className="mt-2 text-xs text-[#63716e]">
              Close your phone and walk closer to someone.
            </p>
          </div>
        ) : (
          people.map((p) => (
            <article
              key={p.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-3"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e2ece7] font-bold">
                {p.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {p.kind === "player" ? "@" : ""}
                  {p.name}
                </p>
                <p className="text-xs text-[#63716e]">
                  {p.kind === "npc" ? "City character" : "Player"} ·{" "}
                  {Math.ceil(p.distance / 32)} tiles
                </p>
              </div>
              <button
                disabled={busy || saved.includes(p.id)}
                onClick={async () => {
                  setBusy(true);
                  try {
                    let error: string | null = null;
                    if (p.kind === "player") error = await onRequest(p.name);
                    else {
                      const current = NPC_SPOTS.find((n) => n.id === p.id);
                      if (
                        !current ||
                        Math.hypot(current.x - PLAYER.x, current.y - PLAYER.y) >
                          64
                      ) {
                        setNotice(
                          "They moved away. Walk closer and try again.",
                        );
                        return;
                      }
                      const sb = browserSupabase();
                      const r = await sb?.rpc("city_befriend_npc", {
                        p_npc: p.id,
                        p_name: p.name,
                        p_map: p.id.split(":resident:")[0] || mapId,
                      });
                      error =
                        !r || r.error
                          ? r?.error?.message.includes("friend_limit")
                            ? "You have 30 city contacts. Remove one in Messages before adding another."
                            : "Could not save this city contact. Try again later."
                          : null;
                    }
                    setNotice(
                      error ??
                        (p.kind === "npc"
                          ? `${p.name} is in your Messages contacts.`
                          : "Friend request sent. They can accept it in Messages."),
                    );
                    if (!error) {
                      setSaved((s) => [...s, p.id]);
                      window.dispatchEvent(new Event("illuminated:contacts"));
                    }
                  } catch {
                    setNotice("Could not connect. Please try again.");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="min-h-11 rounded-full bg-[#1675ed] px-3 text-xs font-bold text-white disabled:opacity-40"
              >
                {saved.includes(p.id)
                  ? "Added"
                  : p.kind === "npc"
                    ? "Befriend"
                    : "Request"}
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
