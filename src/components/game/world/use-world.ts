"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RealtimeChannel } from "@supabase/supabase-js";

import { type VerifiedIdentity, verifyPass } from "./verify-pass";

import { carById } from "@/game/core/cars";
import type { WorldAffiliation } from "@/game/core/affiliation";
import { uniformFor } from "@/game/core/careers";
import type { Avatar } from "@/game/core/cosmetics";
import { SERVER_CAPACITY, channelFor, chatText } from "@/game/core/world";
import { joinGameChannel } from "@/lib/realtime";
import { browserSupabase } from "@/lib/supabase-browser";


/**
 * Realtime multiplayer for one map on one server, over Supabase Realtime:
 * - presence: who's here, their look and a recent position (for late joiners)
 * - broadcast "m": movement (sent ~8×/s only while walking)
 * - broadcast "c": emotes and preset phrases (no free text, by design)
 * Private channels: the database only lets signed-in, non-banned members join
 * (see the games_world migration). The connection heals itself after Wi-Fi drops.
 * Names, employer badges and logos come from a server-signed world pass that
 * every client verifies, so nobody can pose as someone else or as verified staff.
 */
export type Connection = "connecting" | "live" | "reconnecting" | "offline" | "full" | "error" | "solo";

export interface Me {
  affiliation?: WorldAffiliation | null;
  id: string;
  username: string;
  avatar: Avatar;
  /** Verified employer badge (company name), if any. */
  org: string | null;
  /** Company id whose parody logo they wear on their back. */
  badge: string | null;
  /** Server-signed identity (see lib/game/world-pass.ts). */
  pass: string | null;
  /** Key for checking other players' passes. Null only when the server has no secret (local dev). */
  publicKey: string | null;
}

export interface RemotePlayer {
  affiliation?: WorldAffiliation | null;
  car?: string | null;
  heading?: number;
  id: string;
  username: string;
  avatar: Avatar;
  org: string | null;
  badge: string | null;
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
  car?: string | null;
  heading?: number;
  /** Signed world pass. */
  p: string | null;
  /** Name, only trusted when the server has no signing key (local dev). */
  u: string;
  a: Avatar;
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
  const pos = useRef({ ...start, d: 1 as 1 | -1, car: null as string | null, heading: 0 });
  const lastTracked = useRef({ x: -1, y: -1 });
  const lastSent = useRef(0);
  const bump = useCallback(() => setRoster((n) => n + 1), []);

  useEffect(() => {
    // Private places (your home) are single player: no channel at all.
    if (serverId === "solo") {
      setStatus("solo");
      return;
    }
    const sb = browserSupabase();
    if (!sb) {
      setStatus("error");
      return;
    }
    let disposed = false;
    const map = players.current;
    map.clear();
    const topic = channelFor(mapId, serverId);

    const meta = (): Meta => ({ p: me.pass, u: me.username, a: me.avatar, x: Math.round(pos.current.x), y: Math.round(pos.current.y), d: pos.current.d, car: pos.current.car, heading: pos.current.heading });

    const channel = sb.channel(topic, {
      config: { private: true, presence: { key: me.id }, broadcast: { self: false, ack: true } },
    });
    channelRef.current = channel;

    // Checked identities by pass. Players only appear once their pass checks out.
    const checked = new Map<string, VerifiedIdentity | null | "pending">();
    const identify = (id: string, m: Meta): VerifiedIdentity | null => {
      if (!me.publicKey) return { id, username: String(m.u ?? "player").slice(0, 40), org: null, badge: null };
      if (typeof m.p !== "string") return null;
      const got = checked.get(m.p);
      if (got === undefined) {
        checked.set(m.p, "pending");
        const pass = m.p;
        void verifyPass(pass, me.publicKey).then((who) => {
          checked.set(pass, who);
          if (!disposed) sync();
        });
        return null;
      }
      if (got === "pending" || !got || got.id !== id || (got.expiresAt && got.expiresAt <= Date.now())) return null;
      return got;
    };

    const sync = () => {
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
        const who = identify(id, m);
        if (!who) continue;
        seen.add(id);
        const p = map.get(id);
        if (!p) {
          map.set(id, {
            id,
            username: who.username,
            avatar: mapId === "prison" ? m.a : uniformFor(who.occupation ?? null, m.a),
            org: who.org,
            badge: who.badge,
            affiliation: who.affiliation ?? null,
            x: m.x,
            y: m.y,
            tx: m.x,
            ty: m.y,
            dir: m.d ?? 1,
            walking: false,
            chat: null,
            heardAt: Date.now(),
            car: typeof m.car === "string" && carById(m.car) ? m.car : null,
            heading: Number.isFinite(m.heading) ? m.heading : 0,
          });
        } else {
          p.avatar = mapId === "prison" ? m.a : uniformFor(who.occupation ?? null, m.a);
          p.username = who.username;
          p.org = who.org;
          p.badge = who.badge;
          p.affiliation = who.affiliation ?? null;
          p.car = typeof m.car === "string" && carById(m.car) ? m.car : null;
          p.heading = Number.isFinite(m.heading) ? m.heading : 0;
          // Only snap from presence if we haven't heard live movement lately.
          if (Date.now() - p.heardAt > 4000) {
            p.tx = m.x;
            p.ty = m.y;
          }
        }
      }
      for (const id of [...map.keys()]) if (!seen.has(id)) map.delete(id);
      bump();
    };
    channel.on("presence", { event: "sync" }, sync);

    channel.on("broadcast", { event: "m" }, ({ payload }) => {
      if (!payload || typeof payload.i !== "string" || !Number.isFinite(payload.x) || !Number.isFinite(payload.y)) return;
      const p = map.get(payload.i);
      if (!p) return;
      p.tx = payload.x;
      p.ty = payload.y;
      p.dir = payload.d;
      p.walking = Boolean(payload.w);
      p.car = typeof payload.car === "string" && carById(payload.car) ? payload.car : null;
      p.heading = Number.isFinite(payload.heading) ? payload.heading : 0;
      p.heardAt = Date.now();
    });

    channel.on("broadcast", { event: "c" }, ({ payload }) => {
      if (!payload || typeof payload.i !== "string") return;
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
        const tracked = await channel.track(meta());
        if (disposed) return;
        setStatus(!navigator.onLine ? "offline" : tracked === "ok" ? "live" : "reconnecting");
        lastTracked.current = { x: pos.current.x, y: pos.current.y };
      } else if (s === "AUTH_ERROR") {
        setStatus("error");
      } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
        setStatus(navigator.onLine ? "reconnecting" : "offline");
      } else if (s === "CLOSED") {
        setStatus("reconnecting");
      }
    };
    // Private channels need the signed-in user's token on the socket first.
    void joinGameChannel(sb, channel, me.id, (s) => void onStatus(s), () => disposed);

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
      if (channel.state !== "joined" && channel.state !== "joining") {
        void joinGameChannel(sb, channel, me.id, (s) => void onStatus(s), () => disposed);
      }
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
  const reportMove = useCallback((x: number, y: number, d: 1 | -1, walking: boolean, car: string | null = null, heading = 0) => {
    const vehicleChanged = pos.current.car !== car;
    pos.current = { x, y, d, car, heading };
    const ch = channelRef.current;
    if (!ch || ch.state !== "joined") return;
    const now = performance.now();
    if (vehicleChanged || walking && now - lastSent.current > 120) {
      lastSent.current = now;
      void ch.send({ type: "broadcast", event: "m", payload: { i: me.id, x: Math.round(x), y: Math.round(y), d, w: walking ? 1 : 0, car, heading } });
    }
  }, [me.id]);

  const stopped = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || ch.state !== "joined") return;
    const { x, y, d, car, heading } = pos.current;
    void ch.send({ type: "broadcast", event: "m", payload: { i: me.id, x: Math.round(x), y: Math.round(y), d, w: 0, car, heading } });
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
    let disposed = false;
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
    void joinGameChannel(sb, channel, userId, async (s) => {
      if (disposed) return;
      if (s === "SUBSCRIBED") {
        if (here) await channel.track({ m: here.map, s: here.server });
        else setReady(true);
      }
    }, () => disposed);
    return () => {
      disposed = true;
      void sb.removeChannel(channel);
    };
  }, [here?.map, here?.server, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  return { counts, ready };
}
