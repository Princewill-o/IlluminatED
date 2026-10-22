"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Mic, MicOff, Phone, PhoneOff, Users, Video, VideoOff, X } from "lucide-react";

import { HudSlot } from "./hud";

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

type Friend = { id: string; username: string };
type Link = {
  pc: RTCPeerConnection;
  channel: RealtimeChannel;
  polite: boolean;
  making: boolean;
  ignore: boolean;
  stream: MediaStream | null;
  reason: "call" | "near";
};
type Signal =
  | { t: "desc"; from: string; sdp: RTCSessionDescriptionInit }
  | { t: "ice"; from: string; c: RTCIceCandidateInit }
  | { t: "bye"; from: string }
  | { t: "hi"; from: string };

const pairTopic = (a: string, b: string) => (a < b ? `call:${a}:${b}` : `call:${b}:${a}`);

async function privateChannel(sb: SupabaseClient, topic: string) {
  const { data } = await sb.auth.getSession();
  if (data.session) await sb.realtime.setAuth(data.session.access_token);
  return sb.channel(topic, { config: { private: true, broadcast: { self: false } } });
}

export function VoiceChat({ meId, nearby }: { meId: string; /** Player ids within VOICE_RANGE on this map and server. */ nearby: string[] }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState<Friend | null>(null);
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [peers, setPeers] = useState<Record<string, { stream: MediaStream | null; reason: "call" | "near" }>>({});
  const [error, setError] = useState<string | null>(null);
  const local = useRef<MediaStream | null>(null);
  const links = useRef(new Map<string, Link>());
  const sbRef = useRef<SupabaseClient | null>(null);
  const friendIds = useRef(new Set<string>());

  const refreshPeers = useCallback(() => {
    setPeers(Object.fromEntries([...links.current].map(([id, l]) => [id, { stream: l.stream, reason: l.reason }])));
  }, []);

  // Accepted friends.
  useEffect(() => {
    const sb = browserSupabase();
    sbRef.current = sb;
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
        friendIds.current = new Set(list.map(f => f.id));
        setFriends(list);
      });
    return () => { alive = false; };
  }, [meId]);

  /** Microphone (and camera) for this device; tracks are enabled or muted in place. */
  const ensureMedia = useCallback(async (video: boolean) => {
    const have = local.current;
    if (have && (!video || have.getVideoTracks().length)) return have;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: video ? { width: 320, height: 240 } : false });
      if (have) for (const t of have.getAudioTracks()) {
        if (stream.getAudioTracks().length) t.stop();
        else stream.addTrack(t);
      }
      local.current = stream;
      for (const l of links.current.values()) for (const t of stream.getTracks()) {
        const sender = l.pc.getSenders().find(s => s.track?.kind === t.kind);
        if (sender) void sender.replaceTrack(t); else l.pc.addTrack(t, stream);
      }
      setError(null);
      return stream;
    } catch {
      setError(video ? "Camera blocked. Allow it in your browser settings." : "Microphone blocked. Allow it in your browser settings.");
      return null;
    }
  }, []);

  const hangUp = useCallback((id: string, notify = true) => {
    const l = links.current.get(id);
    if (!l) return;
    if (notify) void l.channel.send({ type: "broadcast", event: "sig", payload: { t: "bye", from: meId } satisfies Signal });
    l.pc.close();
    void sbRef.current?.removeChannel(l.channel);
    links.current.delete(id);
    refreshPeers();
  }, [meId, refreshPeers]);

  /** Opens (or reuses) the peer link with one friend. */
  const connect = useCallback(async (id: string, reason: "call" | "near") => {
    const sb = sbRef.current;
    if (!sb || !friendIds.current.has(id)) return;
    const existing = links.current.get(id);
    if (existing) { if (reason === "call") existing.reason = "call"; refreshPeers(); return; }
    const stream = await ensureMedia(false);
    if (!stream) return;
    const channel = await privateChannel(sb, pairTopic(meId, id));
    const pc = new RTCPeerConnection(ICE);
    const link: Link = { pc, channel, polite: meId > id, making: false, ignore: false, stream: null, reason };
    links.current.set(id, link);
    const send = (payload: Signal) => void channel.send({ type: "broadcast", event: "sig", payload });
    for (const t of stream.getTracks()) pc.addTrack(t, stream);
    pc.ontrack = e => { link.stream = e.streams[0] ?? new MediaStream([e.track]); refreshPeers(); };
    pc.onicecandidate = e => { if (e.candidate) send({ t: "ice", from: meId, c: e.candidate.toJSON() }); };
    const negotiate = async () => {
      try { link.making = true; await pc.setLocalDescription(); send({ t: "desc", from: meId, sdp: pc.localDescription!.toJSON() }); }
      finally { link.making = false; }
    };
    pc.onnegotiationneeded = negotiate;
    pc.onconnectionstatechange = () => { if (pc.connectionState === "failed") hangUp(id, false); };
    channel.on("broadcast", { event: "sig" }, async ({ payload }) => {
      const s = payload as Signal;
      if (s.from !== id) return;
      try {
        if (s.t === "bye") { hangUp(id, false); return; }
        // The other side just joined: whoever isn't connected yet re-sends an offer they may have missed.
        if (s.t === "hi") { if (pc.connectionState !== "connected" && pc.signalingState === "stable" && !link.making) await negotiate(); return; }
        if (s.t === "desc") {
          const collision = s.sdp.type === "offer" && (link.making || pc.signalingState !== "stable");
          link.ignore = !link.polite && collision;
          if (link.ignore) return;
          await pc.setRemoteDescription(s.sdp);
          if (s.sdp.type === "offer") { await pc.setLocalDescription(); send({ t: "desc", from: meId, sdp: pc.localDescription!.toJSON() }); }
        } else if (s.t === "ice") {
          try { await pc.addIceCandidate(s.c); } catch (e) { if (!link.ignore) throw e; }
        }
      } catch { /* A dropped signal: the next negotiation retries. */ }
    });
    channel.subscribe(status => { if (status === "SUBSCRIBED") send({ t: "hi", from: meId }); });
    refreshPeers();
  }, [meId, ensureMedia, hangUp, refreshPeers]);

  // Incoming calls on my ring inbox.
  useEffect(() => {
    const sb = sbRef.current ?? browserSupabase();
    if (!sb) return;
    let ch: RealtimeChannel | null = null, dead = false;
    void privateChannel(sb, `ring:${meId}`).then(c => {
      if (dead) { void sb.removeChannel(c); return; }
      ch = c;
      c.on("broadcast", { event: "ring" }, ({ payload }) => {
        const from = friends.find(f => f.id === (payload as { from: string }).from);
        if (from) setRinging(from);
      }).on("broadcast", { event: "answer" }, ({ payload }) => {
        const p = payload as { from: string; ok: boolean };
        setOutgoing(o => (o === p.from ? null : o));
        if (p.ok) void connect(p.from, "call");
        else setError("Call declined.");
      }).subscribe();
    });
    return () => { dead = true; if (ch) void sb.removeChannel(ch); };
  }, [meId, friends, connect]);

  const ring = useCallback(async (friend: Friend, event: "ring" | "answer", extra: Record<string, unknown> = {}) => {
    const sb = sbRef.current;
    if (!sb) return;
    const ch = await privateChannel(sb, `ring:${friend.id}`);
    try { await ch.httpSend(event, { from: meId, ...extra }); } finally { void sb.removeChannel(ch); }
  }, [meId]);

  // Proximity: unmuted friends close by join; those who walk away (and aren't on a call) drop.
  const nearKey = nearby.filter(id => friendIds.current.has(id)).sort().join(",");
  useEffect(() => {
    const near = new Set(nearKey ? nearKey.split(",") : []);
    if (micOn) for (const id of near) void connect(id, "near");
    for (const [id, l] of links.current) if (l.reason === "near" && (!micOn || !near.has(id))) hangUp(id);
  }, [nearKey, micOn, connect, hangUp]);

  // Mic and camera toggles mute tracks in place.
  useEffect(() => { local.current?.getAudioTracks().forEach(t => (t.enabled = micOn || Object.values(peers).some(p => p.reason === "call"))); }, [micOn, peers]);
  useEffect(() => {
    if (camOn) void ensureMedia(true).then(s => { if (!s) setCamOn(false); else s.getVideoTracks().forEach(t => (t.enabled = true)); });
    else local.current?.getVideoTracks().forEach(t => (t.enabled = false));
  }, [camOn, ensureMedia]);

  // Leave everything on unmount.
  useEffect(() => () => {
    for (const id of [...links.current.keys()]) hangUp(id);
    local.current?.getTracks().forEach(t => t.stop());
  }, [hangUp]);

  const name = (id: string) => friends.find(f => f.id === id)?.username ?? "Friend";
  const peerIds = Object.keys(peers);

  return (
    <>
      <HudSlot area="br-act" order={2}>
        <div className="relative flex gap-2">
          <button type="button" onClick={() => { if (!micOn) void ensureMedia(false).then(s => s && setMicOn(true)); else setMicOn(false); }} aria-pressed={micOn}
            title={micOn ? "Mute (friends nearby can hear you)" : "Unmute to talk to friends nearby"} aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
            className={cn("jelly grid size-11 place-items-center rounded-full text-white shadow-lg", micOn ? "bg-[#15987f]" : "bg-[#13203a]")}>
            {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
          <button type="button" onClick={() => setCamOn(v => !v)} aria-pressed={camOn} aria-label={camOn ? "Turn camera off" : "Turn camera on"}
            className={cn("jelly grid size-11 place-items-center rounded-full text-white shadow-lg", camOn ? "bg-[#15987f]" : "bg-[#13203a]")}>
            {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </button>
          <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label="Call a friend"
            className="jelly grid size-11 place-items-center rounded-full bg-[#15987f] text-white shadow-lg"><Phone className="size-5" /></button>
          {open && (
            <section aria-label="Call a friend" className="absolute right-0 bottom-full mb-2 w-64 rounded-2xl border border-black/10 bg-white/95 p-3 text-[#13203a] shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-sm font-black"><Users className="size-4" />Friends</h2>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="gloss-off"><X className="size-4" /></button></div>
              <p className="mt-1 text-[11px] text-[#5a6272]">Voice and video only work between friends. Unmute to talk to friends standing near you.</p>
              <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                {!friends.length && <li className="text-xs text-[#5a6272]">No friends yet. Add some from Friends in the city menu.</li>}
                {friends.map(f => (
                  <li key={f.id} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-black/5">
                    <span className="truncate text-sm font-bold">@{f.username}</span>
                    {peers[f.id] ? <button type="button" onClick={() => hangUp(f.id)} className="gloss-off rounded-full bg-[#ff3b30] px-2.5 py-1 text-xs font-bold text-white">End</button>
                      : outgoing === f.id ? <span className="text-xs text-[#5a6272]">Ringing…</span>
                        : <button type="button" onClick={() => { setOutgoing(f.id); void ensureMedia(false).then(s => s && ring(f, "ring")); setTimeout(() => setOutgoing(o => (o === f.id ? null : o)), 30000); }} className="gloss-off rounded-full bg-[#15987f] px-2.5 py-1 text-xs font-bold text-white">Call</button>}
                  </li>
                ))}
              </ul>
              {error && <p role="alert" className="mt-2 text-xs text-[#c8322d]">{error}</p>}
            </section>
          )}
        </div>
      </HudSlot>

      {ringing && (
        <HudSlot area="tc" order={2}>
          <div role="alertdialog" aria-label="Incoming call" className="flex items-center gap-3 rounded-full bg-[#1c1c1e]/95 py-2 pr-2 pl-4 text-white shadow-2xl">
            <Phone className="size-4 animate-pulse text-[#30d158]" />
            <span className="text-sm"><b>@{ringing.username}</b> is calling</span>
            <button type="button" aria-label="Decline" onClick={() => { void ring(ringing, "answer", { ok: false }); setRinging(null); }} className="gloss-off grid size-9 place-items-center rounded-full bg-[#ff3b30]"><PhoneOff className="size-4" /></button>
            <button type="button" aria-label="Accept" onClick={() => { const f = ringing; setRinging(null); void ensureMedia(false).then(s => { if (!s) return; void connect(f.id, "call").then(() => ring(f, "answer", { ok: true })); }); }} className="gloss-off grid size-9 place-items-center rounded-full bg-[#30d158]"><Phone className="size-4" /></button>
          </div>
        </HudSlot>
      )}

      {(peerIds.length > 0 || camOn) && (
        <HudSlot area="tr" order={65}>
          <div className="flex flex-wrap justify-end gap-2" aria-label="Voice and video">
            {camOn && <MediaTile stream={local.current} label="You" muted mirror />}
            {peerIds.map(id => <MediaTile key={id} stream={peers[id].stream} label={`@${name(id)}${peers[id].reason === "near" ? " · nearby" : ""}`} onEnd={() => hangUp(id)} />)}
          </div>
        </HudSlot>
      )}
    </>
  );
}

function MediaTile({ stream, label, muted = false, mirror = false, onEnd }: { stream: MediaStream | null; label: string; muted?: boolean; mirror?: boolean; onEnd?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream; }, [stream]);
  const hasVideo = !!stream?.getVideoTracks().some(t => t.enabled && t.readyState === "live");
  return (
    <figure className="relative h-20 w-28 overflow-hidden rounded-2xl border-2 border-white/70 bg-[#13203a] shadow-lg">
      <video ref={ref} autoPlay playsInline muted={muted} className={cn("size-full object-cover", !hasVideo && "opacity-0", mirror && "-scale-x-100")} />
      {!hasVideo && <Mic className="absolute top-1/2 left-1/2 size-6 -translate-1/2 text-white/70" aria-hidden />}
      <figcaption className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[10px] font-bold text-white">{label}</figcaption>
      {onEnd && <button type="button" onClick={onEnd} aria-label={`End call with ${label}`} className="gloss-off absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-[#ff3b30] text-white"><PhoneOff className="size-3" /></button>}
    </figure>
  );
}
