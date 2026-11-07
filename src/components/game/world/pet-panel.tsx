"use client";

import { useEffect, useState, useTransition } from "react";

import { Bath, Bone, Droplets, Gamepad, Heart, Moon, PawPrint, X } from "lucide-react";

import { PET } from "./art";

import { adoptPet, carePet, loadPets, updatePet } from "@/app/games/world/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { PETS, type Pet, type PetAccessory, type PetAction, type PetKind, petInfo, petNeeds, petTag } from "@/game/core/pets";
import { cn } from "@/lib/utils";

/** Keeps the 3D world and the room in step with whichever pet is out with you. */
export function syncPet(pets: Pet[]) {
  const out = pets.find((p) => p.equipped);
  PET.tag = out ? petTag(out) : null;
}

const ACTIONS: { id: PetAction; label: string; Icon: typeof Bone; need: "hunger" | "thirst" | "clean" | "energy" | "fun" }[] = [
  { id: "feed", label: "Feed", Icon: Bone, need: "hunger" },
  { id: "water", label: "Water", Icon: Droplets, need: "thirst" },
  { id: "wash", label: "Bath", Icon: Bath, need: "clean" },
  { id: "sleep", label: "Nap", Icon: Moon, need: "energy" },
  { id: "play", label: "Play", Icon: Gamepad, need: "fun" },
];

/** A flat portrait of a pet (the 3D one follows you in the world). */
function PetFace({ kind, colour, size = 56 }: { kind: PetKind; colour: string; size?: number }) {
  const ink = "#141020", main = kind === "panda" ? "#f2efe6" : colour;
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} aria-hidden>
      {kind === "rabbit" && <><rect x="16" y="2" width="9" height="24" rx="4" fill={main} stroke={ink} strokeWidth="2.5" /><rect x="35" y="2" width="9" height="24" rx="4" fill={main} stroke={ink} strokeWidth="2.5" /></>}
      {(kind === "cat" || kind === "fox") && <><path d="M12 22 L16 6 L27 18Z" fill={main} stroke={ink} strokeWidth="2.5" /><path d="M48 22 L44 6 L33 18Z" fill={main} stroke={ink} strokeWidth="2.5" /></>}
      {kind === "panda" && <><circle cx="14" cy="16" r="7" fill="#22262e" /><circle cx="46" cy="16" r="7" fill="#22262e" /></>}
      {kind === "dog" && <><rect x="6" y="18" width="12" height="22" rx="5" fill={`#${parseInt(main.slice(1), 16) > 0x777777 ? "8a5a1f" : "444444"}`} stroke={ink} strokeWidth="2.5" /><rect x="42" y="18" width="12" height="22" rx="5" fill="#8a5a1f" stroke={ink} strokeWidth="2.5" /></>}
      <rect x="10" y="16" width="40" height="36" rx="10" fill={kind === "penguin" ? colour : main} stroke={ink} strokeWidth="3" />
      {kind === "penguin" && <rect x="18" y="26" width="24" height="24" rx="8" fill="#f7f3ea" />}
      {kind === "fox" && <path d="M14 40 L30 52 L46 40 L30 44Z" fill="#f7f3ea" />}
      {kind === "panda" && <><ellipse cx="22" cy="32" rx="6" ry="7" fill="#22262e" /><ellipse cx="38" cy="32" rx="6" ry="7" fill="#22262e" /></>}
      <circle cx="22" cy="32" r="3" fill={kind === "panda" ? "#fff" : ink} /><circle cx="38" cy="32" r="3" fill={kind === "panda" ? "#fff" : ink} />
      {kind === "penguin" ? <path d="M26 38 L34 38 L30 44Z" fill="#f2a541" stroke={ink} strokeWidth="1.5" /> : <rect x="27" y="38" width="6" height="4" rx="2" fill={ink} />}
    </svg>
  );
}

export function PetPanel({ onClose, onClout, embedded = false }: { onClose: () => void; onClout: (n: number) => void; embedded?: boolean }) {
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [tab, setTab] = useState<"mine" | "adopt">("mine");
  const [pick, setPick] = useState<PetKind>("dog");
  const [colour, setColour] = useState(PETS[0].colours[0]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const refresh = () => loadPets().then((p) => { setPets(p); syncPet(p); if (!p.length) setTab("adopt"); }).catch(() => setPets([]));
  useEffect(() => { void refresh(); }, []);
  const out = pets?.find((p) => p.equipped) ?? pets?.[0] ?? null;

  const care = (pet: Pet, action: PetAction) => start(async () => {
    if (pet.equipped) { PET.action = action; PET.actionAt = performance.now(); }
    const r = await carePet(pet.id, action);
    if (!r.ok) { setMessage(r.error); return; }
    if (r.paid) { onClout(r.paid); notifyPlayerChanged(); window.dispatchEvent(new CustomEvent("illumed:reward", { detail: { clout: r.paid, label: "Daily pet care done", xp: 0, role: "" } })); }
    setMessage(`${pet.name} ${{ feed: "munches happily", water: "laps it up", wash: "is squeaky clean", sleep: "curls up for a nap", play: "bounds after the ball" }[action]}.`);
    await refresh();
  });

  return (
    <div className={embedded ? "h-full" : "fixed inset-0 z-[100010] grid place-items-center bg-black/55 p-3"} role="dialog" aria-label="Pets">
      <section className={embedded ? "flex h-full w-full flex-col overflow-hidden bg-[#f7f1e6] text-[#13203a] [color-scheme:light]" : "flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-b-8 border-black/30 bg-[radial-gradient(circle_at_10%_0%,#fff7e6,#f7e3c4_70%)] text-[#13203a] shadow-2xl [color-scheme:light]"}>
        <header className="flex items-center gap-3 bg-[#8a5a1f] px-5 py-3 text-white">
          <PawPrint className="size-5" />
          <h2 className="text-lg font-black">Pets</h2>
          <div className="ml-4 flex gap-1">
            {(["mine", "adopt"] as const).map((t) => <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-full px-3 py-1 text-xs font-black", tab === t ? "bg-white text-[#8a5a1f]" : "bg-white/15")}>{t === "mine" ? "My pets" : "Adopt"}</button>)}
          </div>
          <button type="button" onClick={onClose} aria-label="Close pets" className="ml-auto grid size-10 place-items-center rounded-full bg-white/15 hover:bg-white/25"><X className="size-5" /></button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">
          {message && <p role="status" className="mb-3 rounded-xl bg-white p-3 text-sm font-bold shadow-sm">{message}</p>}
          {tab === "mine" && (pets === null ? <p>Loading your pets…</p> : !pets.length ? <p className="font-bold">No pets yet. Adopt one to have them follow you around the world.</p> : (
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <ul className="grid gap-2">
                {pets.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => start(async () => { await updatePet(p.id, { equipped: true }); await refresh(); })} className={cn("flex w-full items-center gap-3 rounded-2xl p-2 text-left", p.equipped ? "bg-white shadow ring-2 ring-[#8a5a1f]" : "hover:bg-white/70")}>
                      <PetFace kind={p.kind} colour={p.colour} size={44} />
                      <span className="min-w-0 flex-1"><span className="block truncate font-black">{p.name}</span><span className="block text-xs opacity-70">{petInfo(p.kind).name} · {p.equipped ? "Out with you" : "At home"}</span></span>
                      <span className="flex items-center gap-0.5 text-xs font-black text-[#c8322d]"><Heart className="size-3.5" />{petNeeds(p).happiness}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {out && (() => {
                const n = petNeeds(out);
                const today = out.care_day === new Date().toISOString().slice(0, 10) ? out.care_done : [];
                return (
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <PetFace kind={out.kind} colour={out.colour} size={84} />
                      <div className="min-w-0 flex-1">
                        <input defaultValue={out.name} maxLength={20} aria-label="Pet name" onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== out.name) start(async () => { const r = await updatePet(out.id, { name: v }); if (!r.ok) setMessage(r.error); await refresh(); }); }} className="w-full rounded-lg border-2 border-transparent bg-transparent text-2xl font-black outline-none focus:border-[#8a5a1f]/30" />
                        <p className="text-xs opacity-70">{petInfo(out.kind).blurb}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(["none", "collar", "bow", "bandana", "cap"] as PetAccessory[]).map((a) => <button key={a} type="button" onClick={() => start(async () => { await updatePet(out.id, { accessory: a }); await refresh(); })} className={cn("rounded-full px-2.5 py-1 text-[11px] font-black capitalize", out.accessory === a ? "bg-[#8a5a1f] text-white" : "bg-black/5")}>{a}</button>)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-5">
                      {ACTIONS.map((a) => (
                        <button key={a.id} type="button" disabled={pending} onClick={() => care(out, a.id)} className="jelly flex flex-col items-center gap-1 rounded-2xl border-b-4 border-black/15 bg-[#f7e3c4] p-2 text-xs font-black disabled:opacity-50">
                          <a.Icon className="size-5" />{a.label}
                          <span className="block h-1.5 w-full overflow-hidden rounded-full bg-black/10"><span className="block h-full rounded-full bg-[#6cc04a]" style={{ width: `${n[a.need]}%` }} /></span>
                          {today.includes(a.id) && <span className="text-[9px] text-[#15987f]">done today</span>}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs opacity-70">Daily care round: feed, water and play once today for +10 Clout. Needs never drop below a quarter, so there&apos;s no harm in taking a break.</p>
                    {!out.equipped && <button type="button" onClick={() => start(async () => { await updatePet(out.id, { equipped: true }); await refresh(); })} className="mt-3 rounded-full bg-[#8a5a1f] px-4 py-2 text-sm font-black text-white">Take {out.name} out</button>}
                    {out.equipped && <button type="button" onClick={() => start(async () => { await updatePet(out.id, { equipped: false }); await refresh(); })} className="mt-3 rounded-full bg-black/5 px-4 py-2 text-sm font-black">Leave {out.name} at home</button>}
                  </div>
                );
              })()}
            </div>
          ))}
          {tab === "adopt" && (
            <div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {PETS.map((p) => (
                  <li key={p.kind}>
                    <button type="button" onClick={() => { setPick(p.kind); setColour(p.colours[0]); }} className={cn("flex w-full flex-col items-center gap-1 rounded-2xl border-[3px] border-[#141020] bg-white p-3 shadow-[0_4px_0_#141020] transition hover:-translate-y-0.5", pick === p.kind && "bg-[#fff1d6] ring-4 ring-[#ffd166]")}>
                      <PetFace kind={p.kind} colour={pick === p.kind ? colour : p.colours[0]} size={64} />
                      <span className="font-black">{p.name}</span>
                      <span className="text-center text-[11px] opacity-70">{p.blurb}</span>
                      <span className="text-xs font-black text-[#a8742b]">{p.price} Clout</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex gap-1.5">{petInfo(pick).colours.map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setColour(c)} className={cn("size-8 rounded-full border-2", colour === c ? "border-[#141020] ring-2 ring-[#ffd166]" : "border-white shadow")} style={{ background: c }} />)}</div>
                <input value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} placeholder="Name your pet" className="min-w-0 flex-1 rounded-xl border-2 border-[#141020]/15 px-3 py-2 font-bold" />
                <button type="button" disabled={pending || !name.trim()} onClick={() => start(async () => {
                  const r = await adoptPet(pick, name, colour);
                  if (!r.ok) { setMessage(r.error); return; }
                  onClout(-petInfo(pick).price); notifyPlayerChanged();
                  setMessage(`Welcome home, ${name.trim()}! They'll follow you around the world.`); setName(""); setTab("mine"); await refresh();
                })} className="jelly rounded-full border-b-4 border-black/30 bg-[#8a5a1f] px-5 py-2.5 font-black text-white disabled:opacity-40">Adopt for {petInfo(pick).price} Clout</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
