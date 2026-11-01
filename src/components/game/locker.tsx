"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";

import { Eye, Footprints, Hand, RotateCw } from "lucide-react";

import { AvatarFigure } from "./avatar";
import type { Facing } from "./character";
import { Character3DPreview, type CharacterAnimation } from "./character-3d-preview";
import { play, soundOn } from "./sound";

import { buyItem, saveAvatar } from "@/app/games/actions";
import { notifyPlayerChanged } from "@/components/app/app-shell";
import { usePass } from "@/components/game/season/pass-store";
import { ADVENTURERS, adventurerFor } from "@/game/core/adventurers";
import { PREVIEW_AVATAR_KEY, PREVIEW_AVATAR_EVENT, normaliseBlockyAvatar } from "@/game/core/blocky-customization";
import { BLOCKY_OUTFITS, blockyOutfitFor, outfitPerks } from "@/game/core/blocky-outfits";
import { BRANDS } from "@/game/core/chibi-looks";
import { companyById } from "@/game/core/companies";
import {
  type Avatar,
  COSMETICS,
  type Cosmetic,
  RARITY,
  SETS,
  SLOTS,
  type Slot,
  isFree,
  look,
  unlockLabel,
} from "@/game/core/cosmetics";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("en-GB");
const HEAD_SLOTS = new Set<Slot>(["head", "eyes", "brows", "mouth", "extras", "hair", "hairColor", "hat", "face"]);
/** Colour slots show as swatches; each style slot has its colour right underneath. */
const COLOUR_SLOTS = new Set<Slot>(["skin", "hairColor", "topColor", "bottomColor", "shoesColor"]);
const PAIRED: Partial<Record<Slot, Slot>> = { hair: "hairColor", top: "topColor", bottom: "bottomColor", shoes: "shoesColor" };

/** Only controls that affect the supplied character meshes are offered. */
const SLOT_GROUPS: {group:string;slots:{slot:Slot;label:string}[]}[]=[
 {group:'Character',slots:[{slot:'head',label:'Character'}]},
 {group:'Colours',slots:[{slot:'topColor',label:'Outfit'},{slot:'bottomColor',label:'Legwear'},{slot:'shoesColor',label:'Footwear'}]},
 {group:'Wardrobe',slots:[{slot:'top',label:'Outfit sets'},{slot:'cape',label:'Capes'},{slot:'brand',label:'Labels'}]},
 {group:'Accessories',slots:[{slot:'hat',label:'Headwear'},{slot:'face',label:'Eyewear'},{slot:'held',label:'Equipment'}]},
 {group:'Companion',slots:[{slot:'pet',label:'Companion'}]},
];
const MODEL_IDS=new Set<string>(ADVENTURERS.map(m=>m.id));
const allowed=(slot:Slot,id:string)=>(slot!=='head'||MODEL_IDS.has(id))&&(slot!=='top'||id==='top-tee'||!!blockyOutfitFor(id));
const clothingName=(id:string,fallback:string)=>id==='top-tee'?'Original character outfit':fallback;
const setName = (id: string) => SETS[id] ?? (companyById(id) ? `${companyById(id)!.name} uniform` : id);

export function Locker({
  initialAvatar,
  initialOwned,
  initialClout,
  canSave,
  userId,
  localPreview = false,
}: {
  initialAvatar: Avatar;
  initialOwned: string[];
  initialClout: number;
  canSave: boolean;
  userId?: string;
  localPreview?: boolean;
}) {
  const [avatar, setAvatar] = useState(() => look(initialAvatar));
  const [facing, setFacing] = useState<Facing>("S");
  const [clip, setClip] = useState<CharacterAnimation>("idle");
  const turn = () => setFacing((f) => ({ S: "W", W: "N", N: "E", E: "S" } as const)[f]);
  const [saved, setSaved] = useState(() => look(initialAvatar));
  const [owned, setOwned] = useState(() => new Set(initialOwned));
  const [clout, setClout] = useState(initialClout);
  const [group, setGroup] = useState(SLOT_GROUPS[0].group);
  const [slot, setSlot] = useState<Slot>("head");
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [collection, setCollection] = useState<'all'|'current'|'classic'>('all');
  const model = adventurerFor(avatar.head);
  const [outfitFamily,setOutfitFamily]=useState('all');
  useEffect(() => {
    if (!localPreview) return;
    try {
      const raw = localStorage.getItem(PREVIEW_AVATAR_KEY);
      if (raw) { const stored = normaliseBlockyAvatar(JSON.parse(raw)); setAvatar(stored); setSaved(stored); }
    } catch { /* Use the free starting character if local settings are unavailable. */ }
  }, [localPreview]);
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
    setAvatar((a) => ({ ...a, [item.slot]: item.id, ...(item.slot==='top'?{topColor:'topcol-auto',bottomColor:'botcol-auto',shoesColor:'shoecol-auto'}:{}) }));
    setMessage(null);
  };

  const randomise = () => {
    const next = { ...avatar };
    for (const { slot: s } of SLOT_GROUPS.flatMap(g=>g.slots)) {
      const options = COSMETICS.filter((c) => c.slot === s && has(c) && allowed(s,c.id));
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
      if (localPreview) {
        try {
          const preview = normaliseBlockyAvatar(avatar);
          localStorage.setItem(PREVIEW_AVATAR_KEY, JSON.stringify(preview));
          window.dispatchEvent(new CustomEvent(PREVIEW_AVATAR_EVENT, { detail: preview }));
          setAvatar(preview); setSaved(preview);
          setMessage({tone:'ok',text:'Character applied. Open the local game to play with this look.'});
        } catch { setMessage({tone:'bad',text:'Your browser could not save this look. Please enable local storage and try again.'}); }
        return;
      }
      const r = await saveAvatar(avatar);
      if (!r.ok) return setMessage({ tone: "bad", text: r.error });
      setSaved(avatar);
      notifyPlayerChanged();
      setMessage({ tone: "ok", text: "Outfit saved. Looking sharp." });
    });

  const slots = SLOT_GROUPS.find((g) => g.group === group)!.slots;
  const items = COSMETICS.filter((c) => c.slot === slot && allowed(slot,c.id) && (slot !== 'head' || collection === 'all' || c.id.includes('-classic-') === (collection === 'classic')) && (slot!=='top'||outfitFamily==='all'||blockyOutfitFor(c.id)?.family===outfitFamily));
  const headView = HEAD_SLOTS.has(slot);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">

      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#8fb4ff] to-[#dde8fd] px-6 pt-8 pb-3 dark:from-[#1b2c48] dark:to-[#14223a]">
          <span aria-hidden className="absolute inset-x-10 bottom-6 h-6 rounded-[50%] bg-black/15" />
          <Character3DPreview avatar={avatar} facing={facing} clip={clip} className="relative mx-auto h-[300px] w-full" />
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            <button type="button" onClick={turn} aria-label="Turn around" title="Turn around" className="jelly grid size-11 place-items-center rounded-full bg-white/90 text-[#0d1726] active:scale-95">
              <RotateCw className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setClip((c) => (c === "walk" ? "idle" : "walk"))}
              aria-pressed={clip === "walk"}
              aria-label="Walk"
              title="Walk"
              className={cn("grid size-11 place-items-center rounded-full active:scale-95", clip === "walk" ? "bg-[#f2d9a6] text-[#0d1726]" : "bg-white/90 text-[#0d1726]")}
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
              className={cn("grid size-11 place-items-center rounded-full active:scale-95", clip === "wave" ? "bg-[#f2d9a6] text-[#0d1726]" : "bg-white/90 text-[#0d1726]")}
            >
              <Hand className="size-4" aria-hidden />
            </button>
          </div>
          <label className="absolute bottom-3 right-3">
            <span className="sr-only">Preview character animation</span>
            <select value={clip} onChange={(event)=>setClip(event.target.value as CharacterAnimation)} className="max-w-36 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-[#0d1726] shadow" aria-label="Preview character animation">
              {(["idle","walk","run","jump","fall","wave","punch","cheer","dance","death"] as const).map((animation)=><option key={animation} value={animation}>{animation[0].toUpperCase()+animation.slice(1)}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={randomise}
            className="absolute top-3 right-3 rounded-full bg-foreground px-3 py-1.5 text-xs font-black text-background transition active:scale-95"
          >
            Surprise me
          </button>
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs font-black uppercase tracking-[.2em] text-muted-foreground">Your character</p>
          <h2 className="mt-1 text-2xl font-black">{model.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{model.description}</p>
          <p className="mt-2 text-xs font-bold text-ink-mint">{outfitPerks(avatar.top).label}</p>
          {!localPreview && <p className="mt-3 text-xl font-black text-ink-sun">{fmt(clout)} Clout</p>}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending || (!canSave && !localPreview) || previewing.length > 0}
            className="arcade-btn flex-1 rounded-full bg-[#f2d9a6] py-3 font-black text-[#0d1726] disabled:opacity-40 disabled:shadow-none"
          >
            {localPreview ? (dirty ? "Apply to local game" : "Applied to local game ✓") : (dirty ? "Save outfit" : "Outfit saved ✓")}
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
        {localPreview ? <Link href="/games/city-showcase?map=city" className="mt-3 block rounded-full border border-primary px-4 py-3 text-center text-sm font-bold hover:bg-primary/10">Play with this character →</Link> : !canSave && <p className="mt-3 text-sm text-ink-sun">Saving isn&apos;t switched on yet. You can still try things on.</p>}
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

        {group === "Character" && <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-widest text-muted-foreground">The Blocky collection</p><h3 className="mt-1 text-lg font-black">16 designs. Make one yours.</h3></div>
            <div className="flex gap-1 rounded-full bg-secondary p-1" aria-label="Character collection">
              {([['all','All'],['current','Current'],['classic','Classic']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={collection===value} onClick={()=>setCollection(value)} className={cn('rounded-full px-3 py-2 text-xs font-bold',collection===value?'bg-primary text-primary-foreground':'hover:bg-accent')}>{label}</button>)}
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Keep the character&apos;s original face and hair, then choose a Blender-made outfit, colours, cape and equipment.</p>
        </div>}
        {slot === 'top' && <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <h3 className="text-lg font-black">120 outfit sets</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">12 clothing styles in 10 palettes, made in Blender for this character rig. Each set includes its jacket or top, legwear, footwear and attached details. Uniforms are costumes; they do not grant powers or authority.</p>
          <label className="mt-3 block text-xs font-bold">Clothing style
            <select aria-label="Clothing style" value={outfitFamily} onChange={e=>setOutfitFamily(e.target.value)} className="ml-3 rounded-full border border-border bg-background px-3 py-2">
              <option value="all">All styles</option>{[...new Set(BLOCKY_OUTFITS.map(o=>o.family))].map(family=><option key={family} value={family}>{family[0].toUpperCase()+family.slice(1)}</option>)}
            </select>
          </label>
        </section>}
        {group === 'Colours' && <p className="mt-4 text-sm leading-6 text-muted-foreground">Choose Original to keep the character&apos;s own palette, or try a new colour below.</p>}

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
            const wearing = item.slot === "head"
              ? avatar.head === item.id
              : avatar[item.slot] === item.id;
            const preview = { ...avatar, [item.slot]: item.id };
            const r = RARITY[item.rarity];
            const outfit = blockyOutfitFor(item.id);
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
                    {item.slot === "head" ? (
                      <CharacterPickerThumb avatar={preview} size={152} label={item.name} />
                    ) : outfit ? (
                      <Image src={`/world3d/blocky-outfits/${outfit.thumbnail}`} alt={`${item.name} garment set`} width={152} height={152} className="size-[152px] object-contain" />
                    ) : item.id==='top-tee' ? <CharacterPickerThumb avatar={preview} size={152} label="Original character outfit" /> : ['top','bottom','shoes'].includes(item.slot) ? (
                      <AvatarFigure avatar={preview} still size={152} showPet={false} title={clothingName(item.id,item.name)} />
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
                  <p className="mt-2 text-sm leading-tight font-bold">{item.id==="hat-none"?"Original headwear":clothingName(item.id,item.name)}</p>
                  {outfit && <><p className="mt-1 text-xs text-muted-foreground">{outfit.description}</p><p className="mt-1 text-[11px] font-bold text-ink-mint">{outfitPerks(item.id).label}</p></>}
                  {item.slot === 'head' && <p className="mt-1 text-xs text-muted-foreground">{item.id.includes('-classic-')?'Classic design':'Current design'} · 10 animations</p>}
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

function CharacterPickerThumb({avatar,size,label}:{avatar:Avatar;size:number;label:string}){
  const model=ADVENTURERS.find((entry)=>entry.id===avatar.head);
  if(model&&'style' in model&&model.style==='blocky')return <div className="grid place-items-center" style={{height:size,width:size}}><Image src={`/world3d/blocky-characters/${model.file}.png`} width={size} height={size} alt={`${label} character preview`} className="h-full w-full object-contain" /></div>;
  return <AvatarFigure avatar={avatar} still size={size} showPet={false} title={label} />;
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
                "grid size-11 place-items-center rounded-full border-[3px] transition active:scale-90",
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
