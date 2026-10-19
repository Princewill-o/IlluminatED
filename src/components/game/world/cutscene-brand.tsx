import { Building2, Landmark, Scale, ShieldAlert, TrainFront } from "lucide-react";

export type CutsceneBrandKind = "city" | "underground" | "police" | "court" | "prison";

const BRANDS = {
  city: { name: "IlluminatED City", Icon: Building2, colour: "#2b5fd9" },
  underground: { name: "IlluminatED Underground", Icon: TrainFront, colour: "#2b5fd9" },
  police: { name: "City Police", Icon: ShieldAlert, colour: "#1765a8" },
  court: { name: "Crown Court", Icon: Scale, colour: "#765532" },
  prison: { name: "HMP Thames", Icon: Landmark, colour: "#9d5636" },
} satisfies Record<CutsceneBrandKind, { name: string; Icon: typeof Building2; colour: string }>;

export function CutsceneBrand({ kind, compact = false }: { kind: CutsceneBrandKind; compact?: boolean }) {
  const brand = BRANDS[kind];
  const Icon = brand.Icon;
  return <span className="inline-flex items-center gap-2" aria-label={brand.name}>
    <span className={`grid shrink-0 place-items-center rounded-xl text-white shadow-md ${compact ? "size-9" : "size-12"}`} style={{ backgroundColor: brand.colour }}>
      <Icon className={compact ? "size-5" : "size-7"} strokeWidth={2.4} aria-hidden />
    </span>
    <span className="text-left"><span className="block text-[9px] font-bold uppercase tracking-[0.18em] opacity-60">Official scene</span><span className="block text-sm font-black">{brand.name}</span></span>
  </span>;
}

export function sceneBrandFor(label: string): CutsceneBrandKind {
  const name = label.toLowerCase();
  if (name.includes("prison") || name.includes("hmp")) return "prison";
  if (name.includes("court")) return "court";
  if (name.includes("police") || name.includes("arrest")) return "police";
  if (name.includes("station") || name.includes("underground") || name.includes("tube")) return "underground";
  return "city";
}
