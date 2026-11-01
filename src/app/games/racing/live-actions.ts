"use server";

import { z } from "zod";

import { replay, trackById, type RaceState } from "@/game/core/maths-racing";
import { getSupabase } from "@/lib/social/server";

export type FriendRoom = { code: string; host: boolean; seed: number; track: string; startsAt: string | null; players: { id: string; name: string; me: boolean; connected: boolean; state: RaceState | null }[] };
const input = z.object({ action: z.enum(["create", "join", "poll", "start", "sync", "leave"]), code: z.string().regex(/^[A-F0-9]{8}$/).optional(), track: z.string().optional(), t: z.number().int().min(0).max(600000).optional(), events: z.array(z.union([z.object({ t: z.number().int().min(0).max(600000), kind: z.literal("answer"), choice: z.number().int().min(0).max(3) }), z.object({ t: z.number().int().min(0).max(600000), kind: z.literal("lane"), dir: z.union([z.literal(-1), z.literal(1)]) })])).max(1500).optional() });

export async function friendRace(args: z.input<typeof input>): Promise<{ room: FriendRoom | null; error: string }> {
  const parsed = input.safeParse(args);
  if (!parsed.success) return { room: null, error: "Check the room code and try again." };
  const a = parsed.data;
  if (a.action === "create" && !trackById(a.track ?? "")) return { room: null, error: "Choose a track first." };
  const sb = await getSupabase();
  if (!sb) return { room: null, error: "Sign in to race friends." };
  let state: RaceState | null = null;
  if (a.action === "sync") {
    const previous = await sb.rpc("friend_race", { p_action: "poll", p_code: a.code });
    const room = previous.data as FriendRoom | null;
    const track = room && trackById(room.track);
    if (previous.error || !room?.startsAt || !track || a.t === undefined) return { room: null, error: "This race is unavailable." };
    if (a.t > Date.now() - Date.parse(room.startsAt) + 2000) return { room: null, error: "Race clock is out of sync." };
    const elapsed = a.t;
    state = replay(track, room.seed, (a.events ?? []).filter(e => e.t <= elapsed), elapsed);
  }
  const { data, error } = await sb.rpc("friend_race", { p_action: a.action, p_code: a.code ?? null, p_track: a.track ?? null, p_state: state });
  return { room: error ? null : data as FriendRoom | null, error: error ? "Room unavailable, full, or not ready. The host needs 2–6 connected players to start. Rejoin or create a new room." : "" };
}
