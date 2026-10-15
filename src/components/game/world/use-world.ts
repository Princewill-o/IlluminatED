"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RealtimeChannel } from "@supabase/supabase-js";

import type { Avatar } from "@/game/core/cosmetics";
import { SERVER_CAPACITY, channelFor, chatText } from "@/game/core/world";
import { browserSupabase } from "@/lib/supabase-browser";

/**
 * Realtime multiplayer for one map on one server, over Supabase Realtime:
 * - presence: who's here, their look and a recent position (for late joiners)
 * - broadcast "m": movement (sent ~8×/s only while walking)
 * - broadcast "c": emotes and preset phrases (no free text, by design)
 * Private channels: the database only lets signed-in, non-banned members join
 * (see the games_world migration). The connection heals itself after Wi-Fi drops.
 */
export type Connection = "connecting" | "live" | "reconnecting" | "offline" | "full" | "error";

export interface Me {
  id: string;
  username: string;
  avatar: Avatar;
  /** Verified employer badge (company name), if any. */
  org: string | null;
}

export interface RemotePlayer {
  id: string;
  username: string;
  avatar: Avatar;
  org: string | null;
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: 1 | -1;
  walking: boolean;
  chat: { text: string; until: number } | null;
  heardAt: number;
}

interface Meta {
  u: string;
  a: Avatar;
  o: string | null;
  x: number;
  y: number;
  d: 1 | -1;
}

export function useWorld({
  mapId,
  serverId,
  me,
  start,
}: {
  mapId: string;
  serverId: string;
  me: Me;
  start: { x: number; y: number };
}) {
  const [status, setStatus] = useState<Connection>("connecting");
  const [ping, setPing] = useState<number | null>(null);
  const [roster, setRoster] = useState(0);
  const players = useRef(new Map<string, RemotePlayer>());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pos = useRef({ ...start, d: 1 as 1 | -1 });
  const lastTracked = useRef({ x: -1, y: -1 });
  const lastSent = useRef(0);
  const bump = useCallback(() => setRoster((n) => n + 1), []);

  useEffect(() => {
    const sb = browserSupabase();
    if (!sb) {
      setStatus("error");
      return;
    }
    let disposed = false;
    const map = players.current;
    map.clear();
    const topic = channelFor(mapId, serverId);

    const meta = (): Meta => ({ u: me.username, a: me.avatar, o: me.org, x: Math.round(pos.current.x), y: Math.round(pos.current.y), d: pos.current.d });

    const channel = sb.channel(topic, {
      config: { private: true, presence: { key: me.id }, broadcast: { self: false, ack: true } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<Meta>();
      const ids = Object.keys(state);
      // Too many people already here: politely refuse (the server list offers another).
      if (!map.size && ids.length > SERVER_CAPACITY && !mapId.startsWith("office-")) {
        const rank = ids.sort().indexOf(me.id);
        if (rank >= SERVER_CAPACITY) {
          setStatus("full");
          void channel.untrack();
          return;
        }
      }
      const seen = new Set<string>();
      for (const id of ids) {
        if (id === me.id) continue;
        const m = state[id]?.[0];
        if (!m) continue;
        seen.add(id);
        const p = map.get(id);
        if (!p) {
          map.set(id, {
            id,
            username: m.u,
            avatar: m.a,
            org: m.o ?? null,
            x: m.x,
            y: m.y,
            tx: m.x,
            ty: m.y,
            dir: m.d ?? 1,
            walking: false,
            chat: null,
            heardAt: Date.now(),
          });
        } else {
          p.avatar = m.a;
          p.username = m.u;
          p.org = m.o ?? null;
          // Only snap from presence if we haven't heard live movement lately.
          if (Date.now() - p.heardAt > 4000) {
            p.tx = m.x;
            p.ty = m.y;
          }
        }
      }
      for (const id of [...map.keys()]) if (!seen.has(id)) map.delete(id);
      bump();
    });

    channel.on("broadcast", { event: "m" }, ({ payload }) => {
      const p = map.get(payload.i);
      if (!p) return;
      p.tx = payload.x;
      p.ty = payload.y;
      p.dir = payload.d;
      p.walking = Boolean(payload.w);
      p.heardAt = Date.now();
    });

    channel.on("broadcast", { event: "c" }, ({ payload }) => {
      const p = map.get(payload.i);
      // Only approved emotes and phrases are shown: the payload is an id, never free text.
      const text = typeof payload.t === "string" ? chatText(payload.t) : null;
      if (!p || !text) return;
      p.chat = { text, until: Date.now() + 4500 };
      bump();
    });

    const onStatus = async (s: string) => {
      if (disposed) return;
      if (s === "SUBSCRIBED") {
        setStatus(navigator.onLine ? "live" : "offline");
        await channel.track(meta());
        lastTracked.current = { x: pos.current.x, y: pos.current.y };
      } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
        setStatus(navigator.onLine ? "reconnecting" : "offline");
      } else if (s === "CLOSED") {
        setStatus("reconnecting");
      }
    };
    // Private channels need the signed-in user's token on the socket first.
    void sb.realtime
      .setAuth()
      .catch(() => undefined)
      .then(() => {
        if (!disposed) channel.subscribe((s) => void onStatus(s));
      });

    // Keep late joiners' view of us fresh, and measure ping.
    const heartbeat = window.setInterval(() => {
      const moved = Math.hypot(pos.current.x - lastTracked.current.x, pos.current.y - lastTracked.current.y) > 8;
      if (moved && channel.state === "joined") {
        void channel.track(meta());
        lastTracked.current = { x: pos.current.x, y: pos.current.y };
      }
    }, 3000);
    const pinger = window.setInterval(async () => {
      if (channel.state !== "joined") return;
      const t0 = performance.now();
      const res = await channel.send({ type: "broadcast", event: "p", payload: {} });
      if (res === "ok") setPing(Math.round(performance.now() - t0));
    }, 5000);

    const offline = () => setStatus("offline");
    const online = () => {
      setStatus("reconnecting");
      // The socket reconnects by itself; rejoin the channel if it gave up.
      if (channel.state !== "joined" && channel.state !== "joining") channel.subscribe((s) => void onStatus(s));
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);

    return () => {
      disposed = true;
      window.clearInterval(heartbeat);
      window.clearInterval(pinger);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      void sb.removeChannel(channel);
      channelRef.current = null;
      map.clear();
    };
    // me.avatar/username are fixed for a session; re-joining on every render would be wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, serverId, me.id, bump]);

  /** Call every frame with the local position; sends at most ~8 updates a second. */
  const reportMove = useCallback((x: number, y: number, d: 1 | -1, walking: boolean) => {
    const prev = pos.current;
    pos.current = { x, y, d };
    const ch = channelRef.current;
    if (!ch || ch.state !== "joined") return;
    const now = performance.now();
    const changed = Math.abs(prev.x - x) + Math.abs(prev.y - y) > 0.5;
    if (changed && now - lastSent.current > 120) {
      lastSent.current = now;
      void ch.send({ type: "broadcast", event: "m", payload: { i: me.id, x: Math.round(x), y: Math.round(y), d, w: walking ? 1 : 0 } });
    }
  }, [me.id]);

  const stopped = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || ch.state !== "joined") return;
    const { x, y, d } = pos.current;
    void ch.send({ type: "broadcast", event: "m", payload: { i: me.id, x: Math.round(x), y: Math.round(y), d, w: 0 } });
  }, [me.id]);

  const say = useCallback((text: string) => {
    if (!chatText(text)) return;
    const ch = channelRef.current;
    if (!ch || ch.state !== "joined") return;
    void ch.send({ type: "broadcast", event: "c", payload: { i: me.id, t: text } });
  }, [me.id]);

  return { status, ping, players, roster, reportMove, stopped, say, count: players.current.size + 1 };
}

/**
 * Live player counts for every map and server, from a shared lobby channel.
 * Pass `here` while in a world so others can see you counted.
 */
export function useLobby(here: { map: string; server: string } | null, userId: string) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sb = browserSupabase();
    if (!sb) return;
    const channel = sb.channel("world:lobby", { config: { private: true, presence: { key: userId } } });
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ m: string; s: string }>();
      const next: Record<string, number> = {};
      for (const metas of Object.values(state)) {
        const m = metas[0];
        if (!m?.m) continue;
        const key = `${m.m}:${m.s}`;
        next[key] = (next[key] ?? 0) + 1;
      }
      setCounts(next);
      setReady(true);
    });
    channel.subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        if (here) await channel.track({ m: here.map, s: here.server });
        else setReady(true);
      }
    });
    return () => {
      void sb.removeChannel(channel);
    };
  }, [here?.map, here?.server, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  return { counts, ready };
}
