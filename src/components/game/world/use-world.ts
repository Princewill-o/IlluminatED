"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RealtimeChannel } from "@supabase/supabase-js";

import { type VerifiedIdentity, verifyPass } from "./verify-pass";

import type { WorldAffiliation } from "@/game/core/affiliation";
import { uniformFor } from "@/game/core/careers";
import { carById } from "@/game/core/cars";
import type { Avatar } from "@/game/core/cosmetics";
import { SERVER_CAPACITY, chatText } from "@/game/core/world";
import {
  MOVE_INTERVAL_MS,
  PRESENCE_INTERVAL_MS,
} from "@/game/core/world-network";
import {
  claimWorld,
  releaseWorld,
  type WorldLease,
} from "@/lib/game/world-admission";
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
export type Connection =
  | "connecting"
  | "live"
  | "reconnecting"
  | "offline"
  | "full"
  | "busy"
  | "elsewhere"
  | "error"
  | "solo";

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
  const pos = useRef({
    ...start,
    d: 1 as 1 | -1,
    car: null as string | null,
    heading: 0,
  });
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
    let disposed = false,
      blocked = false,
      connecting = false;
    setStatus("connecting");
    let currentTopic = "",
      expiresAt = 0;
    let renewal: ReturnType<typeof setTimeout> | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let closeRoom = () => {};
    let clientId = crypto.randomUUID();
    const map = players.current;
    map.clear();
    const stop = (state: Connection) => {
      if (disposed || blocked) return;
      blocked = true;
      clearTimeout(renewal);
      clearTimeout(expiry);
      closeRoom();
      channelRef.current = null;
      map.clear();
      bump();
      setStatus(state);
      void releaseWorld(sb, clientId);
    };
    const openRoom = (lease: WorldLease) => {
      closeRoom();
      map.clear();
      bump();
      currentTopic = lease.topic!;
      let closed = false,
        syncQueued = false,
        lastTrack = 0;
      let trackedPosition = { x: -1, y: -1 };
      let syncTimer: ReturnType<typeof setTimeout> | undefined;
      let deferredTrack: ReturnType<typeof setTimeout> | undefined;
      const checked = new Map<string, VerifiedIdentity | null | "pending">();
      const channel = sb.channel(currentTopic, {
        config: {
          private: true,
          presence: { key: me.id },
          broadcast: { self: false, ack: true },
        },
      });
      channelRef.current = channel;
      const cancelled = () => disposed || blocked || closed;
      const meta = (): Meta => ({
        p: me.pass,
        u: me.username,
        a: me.avatar,
        x: Math.round(pos.current.x),
        y: Math.round(pos.current.y),
        d: pos.current.d,
        car: pos.current.car,
        heading: pos.current.heading,
      });
      const scheduleSync = () => {
        if (syncQueued || cancelled()) return;
        syncQueued = true;
        syncTimer = setTimeout(() => {
          syncQueued = false;
          if (!cancelled()) sync();
        }, 16);
      };
      const identify = (id: string, m: Meta): VerifiedIdentity | null => {
        if (!me.publicKey)
          return {
            id,
            username: String(m.u ?? "player").slice(0, 40),
            org: null,
            badge: null,
          };
        if (typeof m.p !== "string" || m.p.length > 2000) return null;
        const got = checked.get(m.p);
        if (got === undefined) {
          checked.set(m.p, "pending");
          const pass = m.p;
          void verifyPass(pass, me.publicKey).then((who) => {
            if (!cancelled()) {
              checked.set(pass, who);
              scheduleSync();
            }
          });
          return null;
        }
        if (
          got === "pending" ||
          !got ||
          got.id !== id ||
          (got.expiresAt && got.expiresAt <= Date.now())
        )
          return null;
        return got;
      };
      const sync = () => {
        if (cancelled()) return;
        const state = channel.presenceState<Meta>();
        const ids = Object.keys(state).sort();
        if (
          ids.length > SERVER_CAPACITY &&
          ids.indexOf(me.id) >= SERVER_CAPACITY
        ) {
          stop("full");
          return;
        }
        const seen = new Set<string>(),
          activePasses = new Set<string>();
        for (const id of ids.slice(0, SERVER_CAPACITY)) {
          if (id === me.id) continue;
          const m = state[id]?.[0];
          if (!m || !Number.isFinite(m.x) || !Number.isFinite(m.y)) continue;
          if (typeof m.p === "string") activePasses.add(m.p);
          const who = identify(id, m);
          if (!who) continue;
          seen.add(id);
          const p = map.get(id);
          const identity = {
            username: who.username,
            avatar:
              mapId === "prison"
                ? m.a
                : uniformFor(who.occupation ?? null, m.a),
            org: who.org,
            badge: who.badge,
            affiliation: who.affiliation ?? null,
            car: typeof m.car === "string" && carById(m.car) ? m.car : null,
            heading: Number.isFinite(m.heading) ? m.heading : 0,
          };
          if (!p)
            map.set(id, {
              ...identity,
              id,
              x: m.x,
              y: m.y,
              tx: m.x,
              ty: m.y,
              dir: m.d === -1 ? -1 : 1,
              walking: false,
              chat: null,
              heardAt: Date.now(),
            });
          else {
            Object.assign(p, identity);
            if (Date.now() - p.heardAt > 4000) {
              p.tx = m.x;
              p.ty = m.y;
            }
          }
        }
        for (const id of map.keys()) if (!seen.has(id)) map.delete(id);
        for (const pass of checked.keys())
          if (!activePasses.has(pass)) checked.delete(pass);
        bump();
      };
      channel.on("presence", { event: "sync" }, scheduleSync);
      channel.on("broadcast", { event: "m" }, ({ payload }) => {
        if (
          cancelled() ||
          !payload ||
          typeof payload.i !== "string" ||
          !Number.isFinite(payload.x) ||
          !Number.isFinite(payload.y)
        )
          return;
        const p = map.get(payload.i);
        if (!p) return;
        p.tx = payload.x;
        p.ty = payload.y;
        p.dir = payload.d === -1 ? -1 : 1;
        p.walking = Boolean(payload.w);
        p.car =
          typeof payload.car === "string" && carById(payload.car)
            ? payload.car
            : null;
        p.heading = Number.isFinite(payload.heading) ? payload.heading : 0;
        p.heardAt = Date.now();
      });
      channel.on("broadcast", { event: "c" }, ({ payload }) => {
        if (cancelled() || !payload || typeof payload.i !== "string") return;
        const p = map.get(payload.i),
          text = typeof payload.t === "string" ? chatText(payload.t) : null;
        if (p && text) {
          p.chat = { text, until: Date.now() + 4500 };
          bump();
        }
      });
      const track = async () => {
        if (cancelled()) return;
        const wait = PRESENCE_INTERVAL_MS - (Date.now() - lastTrack);
        if (wait > 0) {
          clearTimeout(deferredTrack);
          deferredTrack = setTimeout(() => void track(), wait + 1);
          return;
        }
        lastTrack = Date.now();
        const t0 = performance.now(),
          result = await channel.track(meta());
        if (cancelled()) return;
        if (result !== "ok") {
          stop("error");
          return;
        }
        trackedPosition = { x: pos.current.x, y: pos.current.y };
        setPing(Math.round(performance.now() - t0));
        setStatus(navigator.onLine ? "live" : "offline");
      };
      const onStatus = (s: string) => {
        if (cancelled()) return;
        if (s === "SUBSCRIBED") void track();
        else if (s === "AUTH_ERROR") stop("error");
        else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(s))
          setStatus(navigator.onLine ? "reconnecting" : "offline");
      };
      closeRoom = () => {
        closed = true;
        window.clearInterval(heartbeat);
        clearTimeout(syncTimer);
        clearTimeout(deferredTrack);
        if (channelRef.current === channel) channelRef.current = null;
        void sb.removeChannel(channel);
        checked.clear();
      };
      const heartbeat = window.setInterval(() => {
        if (Date.now() >= expiresAt) {
          stop("error");
          return;
        }
        if (
          channel.state === "joined" &&
          Math.hypot(
            pos.current.x - trackedPosition.x,
            pos.current.y - trackedPosition.y,
          ) > 8
        )
          void track();
      }, PRESENCE_INTERVAL_MS);
      void joinGameChannel(sb, channel, me.id, onStatus, cancelled);
    };
    const refresh = async () => {
      if (disposed || blocked || connecting) return;
      connecting = true;
      try {
        const lease = await claimWorld(sb, mapId, serverId, clientId);
        if (disposed || blocked) {
          void releaseWorld(sb, clientId);
          return;
        }
        if (!lease.accepted) {
          stop(
            lease.reason === "room_full"
              ? "full"
              : lease.reason === "already_connected"
                ? "elsewhere"
                : "busy",
          );
          return;
        }
        expiresAt = lease.expiresAt!;
        clearTimeout(expiry);
        expiry = setTimeout(
          () => stop("error"),
          Math.max(0, expiresAt - Date.now()),
        );
        if (currentTopic !== lease.topic) openRoom(lease);
        renewal = setTimeout(
          () => void refresh(),
          Math.max(250, Math.min(30000, lease.rotateAt! - Date.now() + 100)),
        );
      } catch {
        stop(navigator.onLine ? "error" : "offline");
      } finally {
        connecting = false;
      }
    };
    const offline = () => setStatus("offline");
    const online = () => {
      if (!disposed) {
        if (blocked) {
          // A prolonged outage may have expired/released the old reservation.
          // Use a fresh token so delayed old cleanup cannot release the retry.
          blocked = false;
          clientId = crypto.randomUUID();
          currentTopic = "";
          setStatus("reconnecting");
        }
        clearTimeout(renewal);
        void refresh();
      }
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    void refresh();
    return () => {
      disposed = true;
      clearTimeout(renewal);
      clearTimeout(expiry);
      closeRoom();
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      map.clear();
      void releaseWorld(sb, clientId);
    };
    // me.avatar/username are fixed for a session; re-joining on every render would be wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, serverId, me.id, bump]);

  /** Call every frame with the local position; sends at most ~8 updates a second. */
  const reportMove = useCallback(
    (
      x: number,
      y: number,
      d: 1 | -1,
      walking: boolean,
      car: string | null = null,
      heading = 0,
    ) => {
      const vehicleChanged = pos.current.car !== car;
      pos.current = { x, y, d, car, heading };
      const ch = channelRef.current;
      if (!ch || ch.state !== "joined") return;
      const now = performance.now();
      if (
        vehicleChanged ||
        (walking && now - lastSent.current > MOVE_INTERVAL_MS)
      ) {
        lastSent.current = now;
        void ch.send({
          type: "broadcast",
          event: "m",
          payload: {
            i: me.id,
            x: Math.round(x),
            y: Math.round(y),
            d,
            w: walking ? 1 : 0,
            car,
            heading,
          },
        });
      }
    },
    [me.id],
  );

  const stopped = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || ch.state !== "joined") return;
    const { x, y, d, car, heading } = pos.current;
    void ch.send({
      type: "broadcast",
      event: "m",
      payload: {
        i: me.id,
        x: Math.round(x),
        y: Math.round(y),
        d,
        w: 0,
        car,
        heading,
      },
    });
  }, [me.id]);

  const say = useCallback(
    (text: string) => {
      if (!chatText(text)) return;
      const ch = channelRef.current;
      if (!ch || ch.state !== "joined") return;
      void ch.send({
        type: "broadcast",
        event: "c",
        payload: { i: me.id, t: text },
      });
    },
    [me.id],
  );

  return {
    status,
    ping,
    players,
    roster,
    reportMove,
    stopped,
    say,
    count: players.current.size + 1,
  };
}

/** Aggregate counts only; no project-wide presence fanout or exposed roster. */
export function useLobby(
  here: { map: string; server: string } | null,
  userId: string,
) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sb = browserSupabase();
    if (!sb) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const { data, error } = await sb.rpc("world_counts");
        if (!disposed && !error && data?.counts) {
          setCounts(data.counts);
          setReady(true);
        }
      } catch {
        /* Counts are advisory; admission remains authoritative. */
      } finally {
        if (!disposed)
          timer = setTimeout(() => void poll(), 15000 + Math.random() * 3000);
      }
    };
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [here?.map, here?.server, userId]);
  return { counts, ready };
}
