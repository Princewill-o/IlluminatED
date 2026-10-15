"use client";

import { useMemo, useState, useTransition } from "react";

import { AvatarFigure } from "./avatar";
import { play, soundOn } from "./sound";

import { buyItem, saveAvatar } from "@/app/games/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { companyById } from "@/game/core/companies";
import {
  type Avatar,
  COSMETICS,
  type Cosmetic,
  RARITY,
  SETS,
  SLOT_GROUPS,
  SLOTS,
  type Slot,
  isFree,
  unlockLabel,
} from "@/game/core/cosmetics";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("en-GB");
const HEAD_SLOTS = new Set<Slot>(["head", "eyes", "brows", "mouth", "extras", "hair", "hairColor", "hat", "face"]);
const setName = (id: string) => SETS[id] ?? (companyById(id) ? `${companyById(id)!.name} uniform` : id);

export function Locker({
  initialAvatar,
  initialOwned,
  initialClout,
  canSave,
}: {
  initialAvatar: Avatar;
  initialOwned: string[];
  initialClout: number;
  canSave: boolean;
}) {
  const [avatar, setAvatar] = useState(initialAvatar);
  const [saved, setSaved] = useState(initialAvatar);
  const [owned, setOwned] = useState(() => new Set(initialOwned));
  const [clout, setClout] = useState(initialClout);
  const [group, setGroup] = useState(SLOT_GROUPS[3].group);
  const [slot, setSlot] = useState<Slot>("top");
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = SLOTS.some(({ slot: s }) => avatar[s] !== saved[s]);
  const has = (item: Cosmetic) => isFree(item) || owned.has(item.id);
  const previewing = SLOTS.map(({ slot: s }) => COSMETICS.find((c) => c.id === avatar[s])!).filter(
    (item) => item && !has(item),
  );

  const sets = useMemo(() => {
    const out = new Map<string, { total: number; mine: number }>();
    for (const item of COSMETICS) {
      if (!item.set || !SETS[item.set]) continue;
      const s = out.get(item.set) ?? { total: 0, mine: 0 };
      s.total++;
      if (isFree(item) || owned.has(item.id)) s.mine++;
      out.set(item.set, s);
    }
    return out;
  }, [owned]);

  const wear = (item: Cosmetic) => {
    setAvatar((a) => ({ ...a, [item.slot]: item.id }));
    setMessage(null);
  };

  const randomise = () => {
    const next = { ...avatar };
    for (const { slot: s } of SLOTS) {
      const options = COSMETICS.filter((c) => c.slot === s && has(c));
      next[s] = options[Math.floor(Math.random() * options.length)].id;
    }
    setAvatar(next);
    play("click", soundOn());
  };

  const buy = (item: Cosmetic) =>
    start(async () => {
      const r = await buyItem(item.id);
      if (!r.ok) return setMessage({ tone: "bad", text: r.error });
      setOwned((o) => new Set(o).add(item.id));
      setClout(r.clout);
      wear(item);
      notifyPlayerChanged();
      play("promote", soundOn());
      setMessage({ tone: "ok", text: `Bought ${item.name}! Save your outfit to keep it on.` });
    });

  const save = () =>
    start(async () => {
      const r = await saveAvatar(avatar);
      if (!r.ok) return setMessage({ tone: "bad", text: r.error });
      setSaved(avatar);
      notifyPlayerChanged();
      setMessage({ tone: "ok", text: "Outfit saved. Looking sharp." });
    });

  const slots = SLOT_GROUPS.find((g) => g.group === group)!.slots;
  const items = COSMETICS.filter((c) => c.slot === slot);
  const headView = HEAD_SLOTS.has(slot);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="relative rounded-3xl bg-[#7c4dff] px-6 pt-6 pb-2">
          <AvatarFigure avatar={avatar} size={280} className="arcade-bob mx-auto h-[210px] w-auto lg:h-[280px]" />
          <button
            type="button"
            onClick={randomise}
            className="absolute top-3 right-3 rounded-full bg-[#0b0910] px-3 py-1.5 text-xs font-black text-white transition active:scale-95"
          >
            🎲 Surprise me
          </button>
        </div>
        <p className="mt-4 text-center text-2xl font-black text-[#ffd166]">💰 {fmt(clout)} Clout</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending || !canSave || previewing.length > 0}
            className="arcade-btn flex-1 rounded-full bg-[#c6f36b] py-3 font-black text-[#0b0910] disabled:opacity-40 disabled:shadow-none"
          >
            {dirty ? "Save outfit" : "Outfit saved ✓"}
          </button>
          {dirty && (
            <button type="button" onClick={() => setAvatar(saved)} className="rounded-full border border-white/15 px-4 font-bold">
              Undo
            </button>
          )}
        </div>
        {previewing.length > 0 && (
          <p className="mt-3 text-sm font-bold text-[#ffd166]">
            👀 Previewing {previewing.map((i) => i.name).join(", ")}. Buy it to keep it, or Undo.
          </p>
        )}
        {message && (
          <p role="status" className={cn("mt-3 text-sm font-bold", message.tone === "ok" ? "text-[#5fd3a5]" : "text-[#ff7a6b]")}>
            {message.text}
          </p>
        )}
        {!canSave && <p className="mt-3 text-sm text-[#ffd166]">Saving isn&apos;t switched on yet. You can still try things on.</p>}
        <div className="mt-5 hidden rounded-2xl bg-[#15111f] p-4 lg:block">
          <p className="text-xs font-bold tracking-widest text-[#b3abc4] uppercase">Sets</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {[...sets].map(([id, s]) => (
              <li key={id} className="flex justify-between">
                <span>{SETS[id]}</span>
                <span className={cn("font-bold", s.mine === s.total ? "text-[#c6f36b]" : "text-[#b3abc4]")}>
                  {s.mine === s.total ? "✓ Complete" : `${s.mine}/${s.total}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="min-w-0">
        <div role="tablist" aria-label="Item groups" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {SLOT_GROUPS.map((g) => (
            <button
              key={g.group}
              role="tab"
              aria-selected={group === g.group}
              onClick={() => {
                setGroup(g.group);
                setSlot(g.slots[0].slot);
              }}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition active:scale-95",
                group === g.group ? "bg-[#f4f0ff] text-[#0b0910]" : "bg-[#1f1830] hover:bg-[#2a2040]",
              )}
            >
              {g.group}
            </button>
          ))}
        </div>
        {slots.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label={`${group} categories`}>
            {slots.map((s) => (
              <button
                key={s.slot}
                role="tab"
                aria-selected={slot === s.slot}
                onClick={() => setSlot(s.slot)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold",
                  slot === s.slot ? "border-[#a67fff] bg-[#a67fff]/15 text-white" : "border-white/10 text-[#b3abc4]",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" role="tabpanel">
          {items.map((item) => {
            const mine = has(item);
            const wearing = avatar[item.slot] === item.id;
            const preview = { ...avatar, [item.slot]: item.id };
            const r = RARITY[item.rarity];
            return (
              <li key={item.id}>
                <div className={cn("flex h-full flex-col rounded-2xl border-2 bg-[#15111f] p-2.5", wearing ? "border-[#c6f36b]" : "border-white/10")}>
                  <div
                    className={cn(
                      "relative grid place-items-center overflow-hidden rounded-xl bg-[#1f1830] pt-2",
                      !mine && item.unlock && "opacity-60 grayscale",
                    )}
                  >
                    <span
                      className="absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-black text-[#0b0910]"
                      style={{ background: r.color }}
                    >
                      {r.mark} {r.label}
                    </span>
                    {item.slot === "skin" || item.slot === "hairColor" ? (
                      <span className="my-6 size-20 rounded-full border-4 border-[#1b1622]" style={{ background: item.color }} aria-hidden />
                    ) : (
                      <AvatarFigure
                        avatar={preview}
                        size={headView ? 112 : 130}
                        headOnly={headView}
                        showPet={item.slot === "pet"}
                        title={item.name}
                        className={headView ? "mt-4" : ""}
                      />
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-tight font-bold">{item.name}</p>
                  {item.set && <p className="mt-0.5 text-[11px] text-[#b3abc4]">{setName(item.set)}</p>}
                  <div className="mt-auto pt-2">
                    {wearing ? (
                      <span className="block rounded-full bg-[#c6f36b] py-1.5 text-center text-xs font-black text-[#0b0910]">Wearing ✓</span>
                    ) : mine ? (
                      <button
                        type="button"
                        onClick={() => wear(item)}
                        className="w-full rounded-full bg-[#7c4dff] py-1.5 text-xs font-black text-white transition active:scale-95"
                      >
                        Try on
                      </button>
                    ) : item.unlock ? (
                      <span className="block rounded-full bg-white/5 px-2 py-1.5 text-center text-[11px] leading-tight font-bold text-[#b3abc4]">
                        🔒 {unlockLabel(item.unlock, (id) => companyById(id)?.name ?? id)}
                      </span>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => wear(item)}
                          className="rounded-full border border-white/15 px-2.5 py-1.5 text-xs font-bold"
                          aria-label={`Preview ${item.name}`}
                        >
                          👀
                        </button>
                        <button
                          type="button"
                          onClick={() => buy(item)}
                          disabled={pending || clout < item.price || !canSave}
                          className="flex-1 rounded-full bg-[#ffd166] py-1.5 text-xs font-black text-[#0b0910] transition active:scale-95 disabled:opacity-40"
                        >
                          💰 {fmt(item.price)}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
