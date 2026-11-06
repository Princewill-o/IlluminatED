"use client";

import { useEffect, useState } from "react";

import { Users } from "lucide-react";

import { CREW, CREW_INVITES, PLAYER } from "./art";

import { type CrewStatus, createCrew, crewStatus, joinCrew } from "@/app/games/world/actions";
import { roleById } from "@/game/core/roles";
import { TILE } from "@/game/core/world";

/** Your crew's progress inside a role shift, or a button to start one so nearby players can join. */
export function CrewBar({ role, colour }: { role: string; colour: string }) {
  const [status, setStatus] = useState<CrewStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onUpdate = (e: Event) => setStatus((e as CustomEvent<CrewStatus>).detail);
    window.addEventListener("illumed:crew", onUpdate);
    if (CREW.id && CREW.role === role) void crewStatus(CREW.id).then((r) => { if (r.ok) setStatus(r.status); });
    else { CREW.id = null; CREW.role = null; }
    return () => window.removeEventListener("illumed:crew", onUpdate);
  }, [role]);
  // Keep the bar fresh while teammates work.
  useEffect(() => {
    if (!status || status.paid || !status.open) return;
    const t = setInterval(() => { if (CREW.id) void crewStatus(CREW.id).then((r) => { if (r.ok) setStatus(r.status); }); }, 6000);
    return () => clearInterval(t);
  }, [status]);
  useEffect(() => { if (status && (status.paid || !status.open)) { CREW.id = null; CREW.role = null; } }, [status]);
  const start = async () => {
    setBusy(true); setError("");
    const r = await createCrew(role).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) { setError(r?.error ?? "Couldn't start a crew."); return; }
    CREW.id = r.status.crew; CREW.role = role; setStatus(r.status);
  };
  if (!status) return (
    <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2">
      <button type="button" disabled={busy} onClick={() => void start()} className="flex min-h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-black hover:bg-white/20 disabled:opacity-50"><Users className="size-3.5" /> Start a crew</button>
      <p className="text-[11px] text-white/60">{error || "Players nearby can join. Finish jobs together for a team bonus."}</p>
    </div>
  );
  const pct = Math.min(1, status.jobs / status.target);
  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <p className="flex items-center gap-1.5 text-xs font-black"><Users className="size-3.5" /> Crew of {status.members}
        <span className="ml-auto text-white/70">{status.paid ? (status.bonus ? `Team bonus +${status.bonus} Clout!` : "Crew finished") : `${status.jobs}/${status.target} jobs · you did ${status.mine ?? 0}`}</span></p>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full transition-[width]" style={{ width: `${pct * 100}%`, background: colour }} /></div>
      {status.members < 2 && !status.paid && <p className="mt-1 text-[11px] text-white/60">Waiting for someone nearby to join…</p>}
    </div>
  );
}

/** Crews run by players near you: a small card to join one. */
export function CrewInvites({ busy, onJoin }: { busy: boolean; onJoin: (role: string) => void }) {
  const [near, setNear] = useState<{ id: string; name: string; crew: string; role: string } | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  useEffect(() => {
    const t = setInterval(() => {
      let best: typeof near = null, bestD = 7 * TILE;
      for (const [id, inv] of CREW_INVITES) {
        if (inv.crew === CREW.id || dismissed.has(inv.crew) || !roleById(inv.role)) continue;
        const d = Math.hypot(inv.x - PLAYER.x, inv.y - PLAYER.y);
        if (d < bestD) { bestD = d; best = { id, name: inv.name, crew: inv.crew, role: inv.role }; }
      }
      setNear((n) => (n?.crew === best?.crew ? n : best));
    }, 700);
    return () => clearInterval(t);
  }, [dismissed]);
  if (!near || busy) return null;
  const role = roleById(near.role)!;
  const join = async () => {
    setError("");
    const r = await joinCrew(near.crew).catch(() => null);
    if (!r || !r.ok) { setError(r?.error ?? "Couldn't join."); return; }
    CREW.id = near.crew; CREW.role = near.role;
    onJoin(near.role);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent("illumed:crew", { detail: r.status })), 300);
  };
  return (
    <aside className="absolute bottom-28 left-1/2 z-[72] w-[min(340px,calc(100%-24px))] -translate-x-1/2 rounded-2xl border-b-4 border-black/40 bg-[#13203a]/95 p-3 text-white shadow-xl" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-black"><Users className="size-4 text-[#ffd166]" /> {near.name} is running a {role.title} crew</p>
      <p className="mt-0.5 text-xs text-white/70">{error || "Join to work side by side and share a team bonus."}</p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => void join()} className="min-h-10 flex-1 rounded-full bg-[#ffd166] px-3 text-sm font-black text-[#13203a]">Join crew</button>
        <button type="button" onClick={() => setDismissed((s) => new Set(s).add(near.crew))} className="min-h-10 rounded-full bg-white/10 px-3 text-sm font-bold">Not now</button>
      </div>
    </aside>
  );
}
