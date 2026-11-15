"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Mic, MicOff, Phone, PhoneOff, Users, Video, VideoOff, X } from "lucide-react";
import { createPortal } from "react-dom";

import { HudSlot } from "./hud";

import { roleById } from "@/game/core/roles";
import { roleContract } from "@/lib/illum-world/role-contracts";
import { browserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

/**
 * Free voice and video for friends: peer-to-peer WebRTC (public STUN, no media
 * server), signalled over private Supabase Realtime channels that only accepted
 * friends can use (see the friend_calls migration).
 *
 * - Call: ring a friend from the list; they accept and you talk anywhere.
 * - Nearby: unmute and any friend standing close to you on the same map who is
 *   also unmuted joins automatically; walk away and they drop off.
 * - Camera: optional, per person. Strangers can never hear or see you.
 */
const ICE: RTCConfiguration = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };
/** Proximity range in pixels (about 5 tiles). */
export const VOICE_RANGE = 160;
export const TRAINING_MIC_SLOT = "illumed-role-training-mic";

export type Friend = { id: string; username: string };

/** One signalling topic. Supabase Realtime in the game; a BroadcastChannel in local tests. */
export interface SignalChannel {
  on(event: string, cb: (payload: unknown) => void): SignalChannel;
  subscribe(ready?: () => void, failed?: () => void): void;
  send(event: string, payload: unknown): void;
  close(): void;
}
export interface Signaller {
  open(topic: string): Promise<SignalChannel>;
  /** Fire-and-forget message to a topic you don't listen on (another friend's ring inbox). */
  post(topic: string, event: string, payload: unknown): Promise<void>;
}

/** Private Realtime channels; RLS limits them to accepted friends (friend_calls migration). */
function supabaseSignaller(sb: SupabaseClient): Signaller {
  const make = async (topic: string) => {
    const { data } = await sb.auth.getSession();
    if (!data.session) throw new Error("Sign in to call friends.");
    await sb.realtime.setAuth(data.session.access_token);
    return sb.channel(topic, { config: { private: true, broadcast: { self: false } } });
  };
  const wrap = (ch: RealtimeChannel): SignalChannel => {
    const api: SignalChannel = {
      on: (event, cb) => { ch.on("broadcast", { event }, ({ payload }) => cb(payload)); return api; },
      subscribe: (ready, failed) => {
        ch.subscribe(status => {
          if (status === "SUBSCRIBED") ready?.();
          if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") failed?.();
        });
      },
      send: (event, payload) => { void ch.send({ type: "broadcast", event, payload }); },
      close: () => { void sb.removeChannel(ch); },
    };
    return api;
  };
  return {
    open: async topic => wrap(await make(topic)),
    post: async (topic, event, payload) => {
      const ch = await make(topic);
      try {
        const result = await ch.httpSend(event, payload);
        if (!result.success) throw new Error(result.error);
      } finally {
        void sb.removeChannel(ch);
      }
    },
  };
}

/** Same-browser signalling for local tests and the preview (two tabs talk to each other). */
export function localSignaller(): Signaller {
  const wrap = (topic: string): SignalChannel => {
    const bc = new BroadcastChannel(`voice:${topic}`);
    const handlers = new Map<string, ((p: unknown) => void)[]>();
    bc.onmessage = e => { const { event, payload } = e.data as { event: string; payload: unknown }; for (const cb of handlers.get(event) ?? []) cb(payload); };
    const api: SignalChannel = {
      on: (event, cb) => { handlers.set(event, [...(handlers.get(event) ?? []), cb]); return api; },
      subscribe: ready => { window.setTimeout(() => ready?.(), 0); },
      send: (event, payload) => bc.postMessage({ event, payload }),
      close: () => bc.close(),
    };
    return api;
  };
  return {
    open: async topic => wrap(topic),
    post: async (topic, event, payload) => { const bc = new BroadcastChannel(`voice:${topic}`); bc.postMessage({ event, payload }); bc.close(); },
  };
}

type Link = {
  pc: RTCPeerConnection;
  channel: SignalChannel;
  senders: Record<MediaKind, RTCRtpSender>;
  pendingIce: RTCIceCandidateInit[];
  polite: boolean;
  making: boolean;
  ignore: boolean;
  stream: MediaStream | null;
  reason: "call" | "near";
  trainingRole: string | null;
};
type Signal =
  | { t: "desc"; from: string; sdp: RTCSessionDescriptionInit }
  | { t: "ice"; from: string; c: RTCIceCandidateInit }
  | { t: "state"; from: string; trainingRole: string | null }
  | { t: "bye"; from: string; reason?: Link["reason"] }
  | { t: "hi"; from: string };

type MediaKind = "audio" | "video";
type PeerView = Pick<Link, "stream" | "reason" | "trainingRole"> & { connected: boolean };
const MEDIA_NAME = { audio: "microphone", video: "camera" } as const;
const NO_HIDDEN_FRIENDS: ReadonlySet<string> = new Set();
const resolveTrainingRole = (id: unknown) => typeof id === "string" && id.length <= 64
  ? roleContract(id)?.title ?? roleById(id)?.title ?? null
  : null;
const pairTopic = (a: string, b: string) => (a < b ? `call:${a}:${b}` : `call:${b}:${a}`);

export function VoiceChat({ meId, nearby, signaller: given, friendList, trainingRole = null, trainingPanelOpen = false, hidden = NO_HIDDEN_FRIENDS }: {
  meId: string;
  /** Player ids within VOICE_RANGE on this map and server. */
  nearby: string[];
  /** Override signalling (local tests); defaults to Supabase Realtime. */
  signaller?: Signaller;
  /** Override the friends list (local tests). */
  friendList?: Friend[];
  /** Only shared with existing accepted friends on the private voice channel. */
  trainingRole?: string | null;
  trainingPanelOpen?: boolean;
  hidden?: ReadonlySet<string>;
}) {
  const [friends, setFriends] = useState<Friend[]>(friendList ?? []);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [requesting, setRequesting] = useState({ audio: false, video: false });
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState<Friend | null>(null);
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [peers, setPeers] = useState<Record<string, PeerView>>({});
  const [error, setError] = useState<string | null>(null);
  const [micSlot, setMicSlot] = useState<HTMLElement | null>(null);
  const local = useRef<MediaStream | null>(null);
  const links = useRef(new Map<string, Link>());
  const [sig] = useState<Signaller | null>(() => given ?? (() => { const sb = browserSupabase(); return sb ? supabaseSignaller(sb) : null; })());
  const visibleFriends = useRef(friends);
  visibleFriends.current = (friendList ?? friends).filter(friend => !hidden.has(friend.id));
  const canTalkTo = useCallback((id: string) => visibleFriends.current.some(friend => friend.id === id), []);
  const currentRole = useRef(trainingRole);
  currentRole.current = trainingRole;
  const nearbyIds = useRef(nearby);
  nearbyIds.current = nearby;
  const mounted = useRef(false);
  const captures = useRef(new Map<MediaKind, symbol>());
  const connecting = useRef(new Map<string, { reason: Link["reason"] }>());
  const ringTarget = useRef<string | null>(null);
  const ringTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPeers = useCallback(() => {
    if (mounted.current) setPeers(Object.fromEntries([...links.current].map(([id, l]) => [id, {
      stream: l.stream, reason: l.reason, trainingRole: l.trainingRole, connected: l.pc.connectionState === "connected",
    }])));
  }, []);

  // Refresh accepted friends when opening calls or changing mic state.
  useEffect(() => {
    if (friendList) return;
    const sb = browserSupabase();
    if (!sb) return;
    let alive = true;
    void sb
      .from("city_friends")
      .select("low_id,high_id,low:profiles!city_friends_low_id_fkey(username),high:profiles!city_friends_high_id_fkey(username)")
      .eq("state", "accepted")
      .then(({ data }) => {
        if (!alive || !data) return;
        const list = (data as unknown as { low_id: string; high_id: string; low: { username: string } | null; high: { username: string } | null }[]).map(f =>
          f.low_id === meId ? { id: f.high_id, username: f.high?.username ?? "friend" } : { id: f.low_id, username: f.low?.username ?? "friend" },
        );
        setFriends(list);
      });
    return () => { alive = false; };
  }, [meId, friendList, open, micOn]);

  /** Only the controls request media. Calls can be answered while muted. */
  const toggleMedia = useCallback(async (kind: MediaKind) => {
    const update = kind === "audio" ? setMicOn : setCamOn;
    const label = MEDIA_NAME[kind];
    if (captures.current.has(kind)) return;
    const existing = local.current?.getTracks().find(track => track.kind === kind && track.readyState === "live");
    if (existing) {
      existing.enabled = !existing.enabled;
      update(existing.enabled);
      return;
    }
    if (!sig || typeof RTCPeerConnection === "undefined") {
      setError("Friend voice is unavailable in this browser or session.");
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(`The ${label} needs a secure browser connection.`);
      return;
    }
    const ticket = Symbol(kind);
    captures.current.set(kind, ticket);
    setRequesting(state => ({ ...state, [kind]: true }));
    setError(null);
    const isCurrent = () => mounted.current && captures.current.get(kind) === ticket;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: kind === "audio" ? { echoCancellation: true, noiseSuppression: true } : false,
        video: kind === "video" ? { width: 320, height: 240 } : false,
      });
      const track = stream.getTracks().find(item => item.kind === kind && item.readyState === "live");
      if (!track || !isCurrent()) {
        stream.getTracks().forEach(item => item.stop());
        if (!track && isCurrent()) setError(`No ${label} was found.`);
        return;
      }
      const previous = local.current?.getTracks().filter(item => item.kind !== kind) ?? [];
      stream.getTracks().filter(item => item !== track).forEach(item => item.stop());
      local.current = new MediaStream([...previous, track]);
      track.addEventListener("ended", () => {
        if (!mounted.current || !local.current?.getTracks().includes(track)) return;
        local.current.removeTrack(track);
        update(false);
        setError(`The ${label} disconnected. Turn it on to reconnect.`);
      }, { once: true });
      for (const { senders } of links.current.values()) {
        void senders[kind].replaceTrack(track).catch(() => {
          if (mounted.current && local.current?.getTracks().includes(track)) setError(`The ${label} could not join the call. Reconnect to try again.`);
        });
      }
      update(true);
    } catch (cause) {
      if (!isCurrent()) return;
      const name = (cause as { name?: string } | null)?.name;
      setError(name === "NotFoundError"
        ? `No ${label} was found.`
        : name === "NotAllowedError" || name === "SecurityError"
          ? `Allow ${label} access in your browser settings and try again.`
          : `The ${label} could not start. Check your device and try again.`);
    } finally {
      if (isCurrent()) {
        captures.current.delete(kind);
        setRequesting(state => ({ ...state, [kind]: false }));
      }
    }
  }, [sig]);

  const hangUp = useCallback((id: string, notify = true) => {
    const l = links.current.get(id);
    if (!l) return;
    if (notify) l.channel.send("sig", { t: "bye", from: meId, reason: l.reason } satisfies Signal);
    links.current.delete(id);
    l.pc.close();
    l.channel.close();
    refreshPeers();
  }, [meId, refreshPeers]);

  /** Opens (or reuses) the peer link with one friend. */
  const connect = useCallback(async (id: string, reason: Link["reason"]) => {
    if (!sig || !canTalkTo(id) || typeof RTCPeerConnection === "undefined") return false;
    const existing = links.current.get(id);
    if (existing) {
      if (reason === "call") existing.reason = "call";
      refreshPeers();
      return true;
    }
    const pending = connecting.current.get(id);
    if (pending) {
      if (reason === "call") pending.reason = reason;
      return true;
    }
    const request = { reason };
    connecting.current.set(id, request);
    let channel: SignalChannel | undefined;
    let pc: RTCPeerConnection | undefined;
    let senders: Link["senders"];
    try {
      channel = await sig.open(pairTopic(meId, id));
      const hasMic = local.current?.getAudioTracks().some(track => track.enabled && track.readyState === "live");
      if (!mounted.current || connecting.current.get(id) !== request || !canTalkTo(id)
          || (request.reason === "near" && (!hasMic || !nearbyIds.current.includes(id)))) {
        channel.close();
        return false;
      }
      pc = new RTCPeerConnection(ICE);
      const stream = local.current ?? new MediaStream();
      const connection = pc;
      const transceiver = (kind: MediaKind) => {
        const track = stream.getTracks().find(item => item.kind === kind && item.readyState === "live");
        return connection.addTransceiver(track ?? kind, { direction: "sendrecv", streams: [stream] }).sender;
      };
      senders = { audio: transceiver("audio"), video: transceiver("video") };
    } catch {
      pc?.close();
      channel?.close();
      if (mounted.current) setError("Voice could not connect. Try calling again.");
      return false;
    } finally {
      if (connecting.current.get(id) === request) connecting.current.delete(id);
    }
    const link: Link = {
      pc, channel, senders, pendingIce: [],
      polite: meId > id, making: false, ignore: false, stream: null, reason: request.reason, trainingRole: null,
    };
    links.current.set(id, link);
    const send = (payload: Signal) => link.channel.send("sig", payload);
    const sendRole = () => send({ t: "state", from: meId, trainingRole: currentRole.current });
    // One stream per friend holding every track they send (audio stays when they add a camera).
    pc.ontrack = e => {
      const stream = link.stream ?? new MediaStream();
      for (const old of stream.getTracks()) if (old.kind === e.track.kind && old !== e.track) stream.removeTrack(old);
      stream.addTrack(e.track);
      e.track.onended = () => { stream.removeTrack(e.track); refreshPeers(); };
      link.stream = stream;
      refreshPeers();
    };
    pc.onicecandidate = e => { if (e.candidate) send({ t: "ice", from: meId, c: e.candidate.toJSON() }); };
    const negotiate = async () => {
      try { link.making = true; await pc.setLocalDescription(); if (pc.localDescription) send({ t: "desc", from: meId, sdp: pc.localDescription.toJSON() }); }
      catch { /* A later signal can retry negotiation. */ }
      finally { link.making = false; }
    };
    pc.onnegotiationneeded = negotiate;
    pc.onconnectionstatechange = () => {
      if (!mounted.current || links.current.get(id) !== link) return;
      if (pc.connectionState === "failed") {
        setError("Voice could not reach your friend. Try calling again.");
        hangUp(id, false);
      } else refreshPeers();
    };
    channel.on("sig", async payload => {
      const s = payload as Signal | null;
      if (s?.from !== id || !canTalkTo(id) || links.current.get(id) !== link) return;
      try {
        if (s.t === "bye") {
          if (!(s.reason === "near" && link.reason === "call")) hangUp(id, false);
          return;
        }
        if (s.t === "state") {
          link.trainingRole = resolveTrainingRole(s.trainingRole);
          refreshPeers();
          return;
        }
        // The other side just joined: whoever isn't connected yet re-sends an offer they may have missed.
        if (s.t === "hi") {
          sendRole();
          if (pc.connectionState === "connected" || link.making) return;
          if (pc.signalingState === "have-local-offer" && pc.localDescription) send({ t: "desc", from: meId, sdp: pc.localDescription.toJSON() });
          else if (pc.signalingState === "stable") await negotiate();
          return;
        }
        if (s.t === "desc") {
          const collision = s.sdp.type === "offer" && (link.making || pc.signalingState !== "stable");
          link.ignore = !link.polite && collision;
          if (link.ignore) { link.pendingIce = []; return; }
          await pc.setRemoteDescription(s.sdp);
          for (const candidate of link.pendingIce.splice(0)) {
            try { await pc.addIceCandidate(candidate); } catch { /* A candidate may belong to an older offer. */ }
          }
          if (s.sdp.type === "offer") { await pc.setLocalDescription(); send({ t: "desc", from: meId, sdp: pc.localDescription!.toJSON() }); }
        } else if (s.t === "ice") {
          if (link.ignore) return;
          if (!pc.remoteDescription) {
            if (link.pendingIce.length < 32) link.pendingIce.push(s.c);
          } else await pc.addIceCandidate(s.c);
        }
      } catch { /* A dropped signal: the next negotiation retries. */ }
    });
    channel.subscribe(() => {
      send({ t: "hi", from: meId });
      sendRole();
    }, () => {
      setError("Voice signalling is unavailable. Try calling again.");
      hangUp(id, false);
    });
    refreshPeers();
    return true;
  }, [meId, sig, canTalkTo, hangUp, refreshPeers]);

  const stopRinging = useCallback(() => {
    if (ringTimeout.current !== null) clearTimeout(ringTimeout.current);
    ringTimeout.current = null;
    ringTarget.current = null;
    if (mounted.current) setOutgoing(null);
  }, []);

  // Incoming calls on my ring inbox.
  useEffect(() => {
    if (!sig) return;
    let ch: SignalChannel | null = null, dead = false;
    void sig.open(`ring:${meId}`).then(c => {
      if (dead) { c.close(); return; }
      ch = c;
      c.on("ring", payload => {
        const id = (payload as { from?: unknown } | null)?.from;
        const from = visibleFriends.current.find(friend => friend.id === id);
        if (from) setRinging(from);
      }).on("answer", payload => {
        const p = payload as { from: string; ok: boolean } | null;
        if (!p || p.from !== ringTarget.current || !canTalkTo(p.from) || typeof p.ok !== "boolean") return;
        stopRinging();
        if (p.ok) { setError(null); void connect(p.from, "call"); }
        else setError("Call declined.");
      }).subscribe(undefined, () => setError("The friend call service is unavailable. Try reopening the world."));
    }).catch(() => { if (!dead) setError("Could not open friend calls. Check your connection."); });
    return () => { dead = true; ch?.close(); };
  }, [meId, sig, canTalkTo, connect, stopRinging]);

  const ring = useCallback(async (friend: Friend, event: "ring" | "answer", extra: Record<string, unknown> = {}) => {
    if (!sig || !mounted.current || !canTalkTo(friend.id)) return false;
    try {
      await sig.post(`ring:${friend.id}`, event, { from: meId, ...extra });
      return true;
    } catch {
      if (mounted.current) setError("Your friend could not be reached. Try again.");
      return false;
    }
  }, [meId, sig, canTalkTo]);

  async function callFriend(friend: Friend) {
    if (ringTarget.current) return;
    ringTarget.current = friend.id;
    setOutgoing(friend.id);
    setError(null);
    ringTimeout.current = setTimeout(() => {
      stopRinging();
      if (mounted.current) setError("Your friend did not answer.");
    }, 30_000);
    if (!await ring(friend, "ring") && ringTarget.current === friend.id) stopRinging();
  }

  async function answerCall(friend: Friend, accepted: boolean) {
    setRinging(null);
    setError(null);
    if (!accepted) { await ring(friend, "answer", { ok: false }); return; }
    const connected = await connect(friend.id, "call");
    if (!connected || !await ring(friend, "answer", { ok: true })) hangUp(friend.id);
  }

  // Proximity: unmuted friends close by join; those who walk away (and aren't on a call) drop.
  const nearKey = nearby.filter(canTalkTo).sort().join(",");
  useEffect(() => {
    const near = new Set(nearKey ? nearKey.split(",") : []);
    if (micOn) for (const id of near) void connect(id, "near");
    for (const [id, l] of links.current) if (l.reason === "near" && (!micOn || !near.has(id))) hangUp(id);
  }, [nearKey, micOn, connect, hangUp]);

  useEffect(() => {
    for (const [id, link] of links.current) {
      if (canTalkTo(id)) link.channel.send("sig", { t: "state", from: meId, trainingRole } satisfies Signal);
    }
  }, [canTalkTo, meId, trainingRole]);
  useEffect(() => {
    for (const id of links.current.keys()) if (!canTalkTo(id)) hangUp(id, false);
    if (ringTarget.current && !canTalkTo(ringTarget.current)) stopRinging();
  }, [friends, friendList, hidden, canTalkTo, hangUp, stopRinging]);

  // The phone's FaceTime app opens the friends list.
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("illuminated:open-calls", show);
    return () => window.removeEventListener("illuminated:open-calls", show);
  }, []);

  // Leave everything on unmount.
  useEffect(() => {
    mounted.current = true;
    const pendingCapture = captures.current;
    const pendingLinks = connecting.current;
    const openLinks = links.current;
    return () => {
      mounted.current = false;
      stopRinging();
      pendingCapture.clear();
      pendingLinks.clear();
      for (const id of [...openLinks.keys()]) hangUp(id);
      local.current?.getTracks().forEach(track => track.stop());
      local.current = null;
    };
  }, [hangUp, stopRinging]);
  useEffect(() => {
    // Local debugging only: lets automated two-tab tests inspect the peer connections.
    if (process.env.NODE_ENV === "development") (window as unknown as { __voice?: unknown }).__voice = links.current;
  }, []);
  useEffect(() => {
    setMicSlot(trainingPanelOpen ? document.getElementById(TRAINING_MIC_SLOT) : null);
  }, [trainingPanelOpen]);

  const displayedFriends = visibleFriends.current;
  const name = (id: string) => displayedFriends.find(f => f.id === id)?.username ?? "Friend";
  const peerIds = Object.keys(peers).filter(canTalkTo);
  const myRole = resolveTrainingRole(trainingRole);
  const incoming = ringing && canTalkTo(ringing.id) ? ringing : null;
  const nearbyFriendCount = nearKey ? nearKey.split(",").length : 0;
  const microphone = (
    <button type="button" onClick={() => void toggleMedia("audio")} aria-pressed={micOn} aria-busy={requesting.audio} disabled={requesting.audio}
      title={micOn ? "Mute microphone" : "Unmute to talk to friends"} aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
      className={cn("jelly flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-black text-white shadow-lg disabled:opacity-75", micOn ? "bg-[#15987f]" : "bg-[#13203a]")}>
      {micOn ? <Mic className="size-4" aria-hidden /> : <MicOff className="size-4" aria-hidden />}
      {requesting.audio ? "Allow mic…" : micOn ? "Mute" : "Unmute"}
    </button>
  );
  const voiceStatus = error || micOn ? (
    error ? (
      <div className="flex w-60 max-w-full items-center gap-1 rounded-2xl bg-[#13203a] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
        <p role="alert">{error}</p>
        <button type="button" aria-label="Dismiss voice message" onClick={() => setError(null)} className="grid min-h-11 min-w-11 place-items-center"><X className="size-4" aria-hidden /></button>
      </div>
    ) : (
      <p role="status" className="rounded-full bg-[#13203a] px-3 py-1.5 text-xs font-bold text-white shadow-lg">
        {peerIds.some(id => peers[id].connected) ? "Mic on · friends can hear you" : nearbyFriendCount ? "Mic on · waiting for friends to unmute" : "Mic on · no connected friends"}
      </p>
    )
  ) : null;

  return (
    <>
      {micSlot && createPortal(<>
        {microphone}
        {voiceStatus && <div className="absolute right-0 top-full z-10 mt-2 w-[min(14rem,65vw)]">{voiceStatus}</div>}
      </>, micSlot)}
      <HudSlot area="br-act" order={2}>
        <div className="relative flex flex-wrap justify-end gap-2">
          {!micSlot && microphone}
          <button type="button" onClick={() => void toggleMedia("video")} disabled={requesting.video} aria-busy={requesting.video} aria-pressed={camOn} aria-label={camOn ? "Turn camera off" : "Turn camera on"}
            className={cn("jelly grid size-11 place-items-center rounded-full text-white shadow-lg", camOn ? "bg-[#15987f]" : "bg-[#13203a]")}>
            {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </button>
          <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label="Call a friend"
            className="jelly grid size-11 place-items-center rounded-full bg-[#15987f] text-white shadow-lg"><Phone className="size-5" /></button>
          {open && (
            <section aria-label="Call a friend" className="absolute right-0 bottom-full mb-2 w-64 rounded-2xl border border-black/10 bg-white/95 p-3 text-[#13203a] shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-sm font-black"><Users className="size-4" />Friends</h2>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="gloss-off"><X className="size-4" /></button></div>
              <p className="mt-1 text-[11px] text-[#5a6272]">Voice and video are for accepted friends. Use Unmute to talk in a call or with friends nearby.</p>
              {myRole && <p className="mt-1 text-xs font-bold">Training as {myRole}</p>}
              <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                {!displayedFriends.length && <li className="text-xs text-[#5a6272]">No friends yet. Add some from Friends in the city menu.</li>}
                {displayedFriends.map(f => (
                  <li key={f.id} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-black/5">
                    <span className="truncate text-sm font-bold">@{f.username}</span>
                    {peers[f.id] ? <button type="button" onClick={() => hangUp(f.id)} className="gloss-off rounded-full bg-[#ff3b30] px-2.5 py-1 text-xs font-bold text-white">End</button>
                      : outgoing === f.id ? <span className="text-xs text-[#5a6272]">Ringing…</span>
                        : <button type="button" onClick={() => void callFriend(f)} disabled={outgoing !== null} className="gloss-off rounded-full bg-[#15987f] px-2.5 py-1 text-xs font-bold text-white disabled:opacity-60">Call</button>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </HudSlot>
      {!micSlot && voiceStatus && <HudSlot area="br" order={22}>{voiceStatus}</HudSlot>}

      {incoming && (
        <HudSlot area="tc" order={2}>
          <div role="alertdialog" aria-label="Incoming call" className="flex items-center gap-3 rounded-full bg-[#1c1c1e]/95 py-2 pr-2 pl-4 text-white shadow-2xl">
            <Phone className="size-4 animate-pulse text-[#30d158]" />
            <span className="text-sm"><b>@{incoming.username}</b> is calling</span>
            <button type="button" aria-label="Decline" onClick={() => void answerCall(incoming, false)} className="gloss-off grid size-9 place-items-center rounded-full bg-[#ff3b30]"><PhoneOff className="size-4" /></button>
            <button type="button" aria-label="Accept" onClick={() => void answerCall(incoming, true)} className="gloss-off grid size-9 place-items-center rounded-full bg-[#30d158]"><Phone className="size-4" /></button>
          </div>
        </HudSlot>
      )}

      {(peerIds.length > 0 || camOn) && (
        <HudSlot area="tr" order={65}>
          <div className="flex flex-wrap justify-end gap-2" aria-label="Voice and video">
            {(camOn || (myRole && peerIds.length > 0)) && <MediaTile stream={local.current} label="You" trainingRole={myRole} muted mirror hideVideo={!camOn} />}
            {peerIds.map(id => <MediaTile key={id} stream={peers[id].stream} trainingRole={peers[id].trainingRole}
              label={`@${name(id)}${!peers[id].connected ? " · connecting" : peers[id].reason === "near" ? " · nearby" : ""}`} onEnd={() => hangUp(id)} />)}
          </div>
        </HudSlot>
      )}
    </>
  );
}

function MediaTile({ stream, label, muted = false, mirror = false, trainingRole, hideVideo = false, onEnd }: {
  stream: MediaStream | null; label: string; muted?: boolean; mirror?: boolean; trainingRole?: string | null; hideVideo?: boolean; onEnd?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [needsPlayback, setNeedsPlayback] = useState(false);
  useEffect(() => {
    const video = ref.current;
    let active = true;
    if (video && video.srcObject !== stream) video.srcObject = stream;
    if (video && stream) {
      void video.play().then(() => { if (active) setNeedsPlayback(false); }, () => { if (active) setNeedsPlayback(!muted); });
    }
    return () => { active = false; };
  }, [muted, stream]);
  // Re-render when a friend's camera starts or stops sending frames.
  const [, tick] = useState(0);
  useEffect(() => {
    const tracks = stream?.getVideoTracks() ?? [];
    const bump = () => tick(n => n + 1);
    for (const t of tracks) { t.addEventListener("mute", bump); t.addEventListener("unmute", bump); }
    const timer = window.setInterval(bump, 1500);
    return () => { window.clearInterval(timer); for (const t of tracks) { t.removeEventListener("mute", bump); t.removeEventListener("unmute", bump); } };
  }, [stream]);
  const hasVideo = !hideVideo && !!stream?.getVideoTracks().some(t => t.enabled && !t.muted && t.readyState === "live");
  return (
    <figure className="relative h-20 w-28 overflow-hidden rounded-2xl border-2 border-white/70 bg-[#13203a] shadow-lg">
      <video ref={ref} autoPlay playsInline muted={muted} className={cn("size-full object-cover", !hasVideo && "opacity-0", mirror && "-scale-x-100")} />
      {!hasVideo && <Mic className="absolute top-1/2 left-1/2 size-6 -translate-1/2 text-white/70" aria-hidden />}
      <figcaption className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white" title={trainingRole ? `${label} · Training as ${trainingRole}` : label}>
        <span className="block truncate">{label}</span>
        {trainingRole && <span className="block truncate text-[#e2dcff]">{trainingRole}</span>}
      </figcaption>
      {needsPlayback && <button type="button" onClick={() => void ref.current?.play().then(() => setNeedsPlayback(false), () => undefined)} className="absolute inset-x-1 top-2 rounded-full bg-[#13203a] p-1 text-xs font-bold text-white">Enable sound</button>}
      {onEnd && <button type="button" onClick={onEnd} aria-label={`End call with ${label}`} className="gloss-off absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-[#ff3b30] text-white"><PhoneOff className="size-3" /></button>}
    </figure>
  );
}
