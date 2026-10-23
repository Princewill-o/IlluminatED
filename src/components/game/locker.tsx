"use client";

import { useMemo, useState, useTransition } from "react";

import { Eye, Footprints, Hand, RotateCw } from "lucide-react";

import { AvatarFigure } from "./avatar";
import type { Clip, Facing } from "./character";
import { Character3DPreview } from "./character-3d-preview";
import { play, soundOn } from "./sound";

import { buyItem, saveAvatar } from "@/app/games/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { usePass } from "@/components/game/season/pass-store";
import { BRANDS } from "@/game/core/chibi-looks";
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
/** Colour slots show as swatches; each style slot has its colour right underneath. */
const COLOUR_SLOTS = new Set<Slot>(["skin", "hairColor", "topColor", "bottomColor", "shoesColor"]);
const PAIRED: Partial<Record<Slot, Slot>> = { hair: "hairColor", top: "topColor", bottom: "bottomColor", shoes: "shoesColor" };

/** Ready-made looks to start from (all free items). */
const PRESETS: { name: string; look: Partial<Avatar> }[] = [
  { name: "Ama", look: { skin: "skin-5", hair: "hair-buns", hairColor: "haircol-black", top: "top-stripes", topColor: "topcol-yellow", bottom: "bottom-joggers", bottomColor: "botcol-purple", shoes: "shoes-hightops" } },
  { name: "Leo", look: { skin: "skin-2", hair: "hair-spiky", hairColor: "haircol-brown", top: "top-tee", topColor: "topcol-green", bottom: "bottom-jeans", shoes: "shoes-trainers" } },
  { name: "Priya", look: { skin: "skin-4", hair: "hair-long", hairColor: "haircol-black", top: "top-hoodie", topColor: "topcol-teal", bottom: "bottom-skirt", bottomColor: "botcol-navy", shoes: "shoes-trainers", shoesColor: "shoecol-white" } },
  { name: "Kai", look: { skin: "skin-6", hair: "hair-buzz", hairColor: "haircol-black", top: "top-stripes", topColor: "topcol-red", bottom: "bottom-shorts", bottomColor: "botcol-beige", shoes: "shoes-hightops", shoesColor: "shoecol-red" } },
  { name: "Mia", look: { skin: "skin-1", hair: "hair-ponytail", hairColor: "haircol-blonde", top: "top-tee", topColor: "topcol-pink", bottom: "bottom-jeans", bottomColor: "botcol-sky", shoes: "shoes-trainers" } },
  { name: "Tunde", look: { skin: "skin-8", hair: "hair-short", hairColor: "haircol-black", top: "top-hoodie", topColor: "topcol-orange", bottom: "bottom-joggers", bottomColor: "botcol-black", shoes: "shoes-trainers", shoesColor: "shoecol-white" } },
];
const setName = (id: string) => SETS[id] ?? (companyById(id) ? `${companyById(id)!.name} uniform` : id);

export function Locker({
  initialAvatar,
  initialOwned,
  initialClout,
  canSave,
  userId,
}: {
  initialAvatar: Avatar;
  initialOwned: string[];
  initialClout: number;
  canSave: boolean;
  userId?: string;
}) {
  const [avatar, setAvatar] = useState(initialAvatar);
  const [facing, setFacing] = useState<Facing>("S");
  const [clip, setClip] = useState<Clip>("idle");
  const turn = () => setFacing((f) => ({ S: "W", W: "N", N: "E", E: "S" } as const)[f]);
  const [saved, setSaved] = useState(initialAvatar);
  const [owned, setOwned] = useState(() => new Set(initialOwned));
  const [clout, setClout] = useState(initialClout);
  const [group, setGroup] = useState(SLOT_GROUPS[3].group);
  const [slot, setSlot] = useState<Slot>("top");
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = SLOTS.some(({ slot: s }) => avatar[s] !== saved[s]);
  const { pass } = usePass(userId ?? "guest");
  const has = (item: Cosmetic) => isFree(item) || owned.has(item.id) || pass.items.includes(item.id);
  const previewing = SLOTS.map(({ slot: s }) => COSMETICS.find((c) => c.id === avatar[s])!).filter(
    (item) => item && !has(item),
  );

  const sets = useMemo(() => {
    const out = new Map<string, { total: number; mine: number }>();
    for (const item of COSMETICS) {
      if (!item.set || !SETS[item.set]) continue;
      const s = out.get(item.set) ?? { total: 0, mine: 0 };
      s.total++;
      if (isFree(item) || owned.has(item.id) || pass.items.includes(item.id)) s.mine++;
      out.set(item.set, s);
    }
    return out;
  }, [owned, pass.items]);

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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#8fb4ff] to-[#dde8fd] px-6 pt-8 pb-3 dark:from-[#1b2c48] dark:to-[#14223a]">
          <span aria-hidden className="absolute inset-x-10 bottom-6 h-6 rounded-[50%] bg-black/15" />
          <Character3DPreview avatar={avatar} facing={facing} clip={clip} className="relative mx-auto h-[300px] w-full" />
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            <button type="button" onClick={turn} aria-label="Turn around" title="Turn around" className="jelly grid size-9 place-items-center rounded-full bg-white/90 text-[#0d1726] active:scale-95">
              <RotateCw className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setClip((c) => (c === "walk" ? "idle" : "walk"))}
              aria-pressed={clip === "walk"}
              aria-label="Walk"
              title="Walk"
              className={cn("grid size-9 place-items-center rounded-full active:scale-95", clip === "walk" ? "bg-[#f2d9a6] text-[#0d1726]" : "bg-white/90 text-[#0d1726]")}
            >
              <Footprints className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                setFacing("S");
                setClip((c) => (c === "wave" ? "idle" : "wave"));
              }}
              aria-pressed={clip === "wave"}
              aria-label="Wave"
              title="Wave"
              className={cn("grid size-9 place-items-center rounded-full active:scale-95", clip === "wave" ? "bg-[#f2d9a6] text-[#0d1726]" : "bg-white/90 text-[#0d1726]")}
            >
              <Hand className="size-4" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={randomise}
            className="absolute top-3 right-3 rounded-full bg-foreground px-3 py-1.5 text-xs font-black text-background transition active:scale-95"
          >
            Surprise me
          </button>
        </div>
        <p className="mt-4 text-center text-2xl font-black text-ink-sun">{fmt(clout)} Clout</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending || !canSave || previewing.length > 0}
            className="arcade-btn flex-1 rounded-full bg-[#f2d9a6] py-3 font-black text-[#0d1726] disabled:opacity-40 disabled:shadow-none"
          >
            {dirty ? "Save outfit" : "Outfit saved ✓"}
          </button>
          {dirty && (
            <button type="button" onClick={() => setAvatar(saved)} className="rounded-full border border-border px-4 font-bold">
              Undo
            </button>
          )}
        </div>
        {previewing.length > 0 && (
          <p className="mt-3 text-sm font-bold text-ink-sun">
            Previewing {previewing.map((i) => i.name).join(", ")}. Buy it to keep it, or Undo.
          </p>
        )}
        {message && (
          <p role="status" className={cn("mt-3 text-sm font-bold", message.tone === "ok" ? "text-ink-mint" : "text-ink-coral")}>
            {message.text}
          </p>
        )}
        {!canSave && <p className="mt-3 text-sm text-ink-sun">Saving isn&apos;t switched on yet. You can still try things on.</p>}
        <div className="mt-5 hidden rounded-2xl bg-card p-4 lg:block">
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Sets</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {[...sets].map(([id, s]) => (
              <li key={id} className="flex justify-between">
                <span>{SETS[id]}</span>
                <span className={cn("font-bold", s.mine === s.total ? "text-ink-lime" : "text-muted-foreground")}>
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
                group === g.group ? "bg-foreground text-background" : "bg-secondary hover:bg-accent",
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
                  slot === s.slot ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {group === "Body" && (
          <div className="mt-4">
            <p className="text-xs font-black tracking-widest text-muted-foreground uppercase">Start from a look</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {PRESETS.map((p) => {
                const look = { ...avatar, ...p.look } as Avatar;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setAvatar(look);
                      play("click", soundOn());
                    }}
                    className="shrink-0 rounded-2xl border-2 border-border bg-card px-2 pt-2 pb-1 text-xs font-bold hover:border-primary"
                  >
                    <AvatarFigure avatar={look} still size={92} showPet={false} title={p.name} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(COLOUR_SLOTS.has(slot) || PAIRED[slot]) && (
          <Swatches
            label={COLOUR_SLOTS.has(slot) ? (SLOTS.find((x) => x.slot === slot)?.label ?? "Colour") : "Colour"}
            items={COSMETICS.filter((c) => c.slot === (COLOUR_SLOTS.has(slot) ? slot : PAIRED[slot]))}
            value={avatar[COLOUR_SLOTS.has(slot) ? slot : PAIRED[slot]!]}
            onPick={wear}
          />
        )}

        {!COLOUR_SLOTS.has(slot) && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" role="tabpanel">
          {items.map((item) => {
            const mine = has(item);
            const wearing = avatar[item.slot] === item.id;
            const preview = { ...avatar, [item.slot]: item.id };
            const r = RARITY[item.rarity];
            return (
              <li key={item.id}>
                <div className={cn("flex h-full flex-col rounded-2xl border-2 bg-card p-2.5", wearing ? "border-[#f2d9a6]" : "border-border")}>
                  <div
                    className={cn(
                      "relative grid place-items-center overflow-hidden rounded-xl bg-secondary pt-2",
                      !mine && item.unlock && "opacity-60 grayscale",
                    )}
                  >
                    <span
                      className="absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-black text-[#0d1726]"
                      style={{ background: r.color }}
                    >
                      {r.mark} {r.label}
                    </span>
                    {["hair", "top", "bottom", "shoes"].includes(item.slot) || (item.slot === "back" && item.id !== "back-none") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/characters/chibi/${item.id}.webp`} alt={item.name} width={128} height={152} loading="lazy" className="my-1 h-[152px] w-auto" />
                    ) : item.slot === "brand" ? (
                      BRANDS[item.id] ? (
                        <span className="my-10 inline-flex min-w-24 items-center justify-center rounded-full px-4 py-3 text-lg font-black" style={{ background: BRANDS[item.id].bg, color: BRANDS[item.id].fg, borderRadius: BRANDS[item.id].shape === "square" ? 12 : 999 }}>
                          {BRANDS[item.id].text}
                        </span>
                      ) : (
                        <span className="my-10 text-sm font-bold text-muted-foreground">Plain top</span>
                      )
                    ) : item.slot === "skin" || item.slot === "hairColor" ? (
                      <span className="my-6 size-20 rounded-full border-4 border-[#13203a]" style={{ background: item.color }} aria-hidden />
                    ) : (
                      <AvatarFigure
                        avatar={preview}
                        still
                        size={headView ? 112 : 130}
                        headOnly={headView}
                        showPet={item.slot === "pet"}
                        title={item.name}
                        className={headView ? "mt-4" : ""}
                      />
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-tight font-bold">{item.name}</p>
                  {item.set && <p className="mt-0.5 text-[11px] text-muted-foreground">{setName(item.set)}</p>}
                  <div className="mt-auto pt-2">
                    {wearing ? (
                      <span className="block rounded-full bg-[#f2d9a6] py-1.5 text-center text-xs font-black text-[#0d1726]">Wearing ✓</span>
                    ) : mine ? (
                      <button
                        type="button"
                        onClick={() => wear(item)}
                        className="jelly w-full rounded-full bg-brand py-1.5 text-xs font-black text-white transition active:scale-95"
                      >
                        Try on
                      </button>
                    ) : item.unlock ? (
                      <span className="block rounded-full bg-foreground/[0.05] px-2 py-1.5 text-center text-[11px] leading-tight font-bold text-muted-foreground">
                        {unlockLabel(item.unlock, (id) => companyById(id)?.name ?? id)}
                      </span>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => wear(item)}
                          className="rounded-full border border-border px-2.5 py-1.5 text-xs font-bold"
                          aria-label={`Preview ${item.name}`}
                          title="Preview"
                        >
                          <Eye className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => buy(item)}
                          disabled={pending || clout < item.price || !canSave}
                          className="jelly flex-1 rounded-full bg-[#ffd166] py-1.5 text-xs font-black text-[#0d1726] transition active:scale-95 disabled:opacity-40"
                        >
                          {fmt(item.price)}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        )}
      </div>
    </div>
  );
}

function Swatches({ label, items, value, onPick }: { label: string; items: Cosmetic[]; value: string; onPick: (c: Cosmetic) => void }) {
  return (
    <div className="mt-4 rounded-2xl bg-card p-4">
      <p className="text-xs font-black tracking-widest text-muted-foreground uppercase">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((c) => {
          const on = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              aria-label={c.name}
              aria-pressed={on}
              title={c.name}
              className={cn(
                "grid size-10 place-items-center rounded-full border-[3px] transition active:scale-90",
                on ? "border-foreground ring-2 ring-[#f2d9a6] ring-offset-2 ring-offset-card" : "border-white/70 shadow",
              )}
              style={{ background: c.color ?? "conic-gradient(#c8322d, #ffd166, #4f9a46, #2b5fd9, #7a5ce6, #c8322d)" }}
            >
              {!c.color && <span className="sr-only">{c.name}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
