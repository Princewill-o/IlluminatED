import Image from "next/image";

import { Building2 } from "lucide-react";

export type CutsceneBrandKind =
  "city" | "underground" | "rail" | "hospital" | "police" | "court" | "prison";
const BRANDS = {
  city: { name: "IlluminatED City", asset: null, colour: "#2b5fd9" },
  underground: {
    name: "London Underground",
    asset: "transportforlondon.svg",
    colour: "#d32b30",
  },
  rail: { name: "National Rail", asset: "nationalrail.svg", colour: "#d32b30" },
  hospital: {
    name: "NHS · hospital care",
    asset: "nhs.svg",
    colour: "#005eb8",
  },
  police: {
    name: "Police response",
    asset: "metropolitan-police.png",
    colour: "#0055a4",
  },
  court: {
    name: "HM Courts & Tribunals Service",
    asset: "uk-crest.png",
    colour: "#231f20",
  },
  prison: {
    name: "HMP Thames · fictional prison",
    asset: "uk-crest.png",
    colour: "#231f20",
  },
} satisfies Record<
  CutsceneBrandKind,
  { name: string; asset: string | null; colour: string }
>;
/** Location identifiers inside a fictional educational game; no affiliation is implied. */
export function CutsceneBrand({
  kind,
  compact = false,
}: {
  kind: CutsceneBrandKind;
  compact?: boolean;
}) {
  const brand = BRANDS[kind];
  const wide = kind === "police" || kind === "hospital";
  return (
    <span className="inline-flex items-center gap-3" aria-label={brand.name}>
      <span
        className={`grid shrink-0 place-items-center rounded-lg bg-white p-1 ${wide ? (compact ? "h-9 w-24" : "h-12 w-32") : compact ? "size-9" : "size-12"}`}
      >
        {brand.asset ? (
          kind === "underground" || kind === "rail" ? (
            <span
              aria-hidden
              className="size-full"
              style={{
                background: brand.colour,
                mask: `url(/brand-marks/${brand.asset}) center/contain no-repeat`,
              }}
            />
          ) : (
            <Image
              src={`/brand-marks/${brand.asset}`}
              alt=""
              width={wide ? 132 : 40}
              height={40}
              className="max-h-full w-full object-contain"
              unoptimized
            />
          )
        ) : (
          <Building2
            aria-hidden
            style={{ color: brand.colour }}
            className="size-7"
          />
        )}
      </span>
      <span className="text-left">
        <span className="block text-[9px] font-bold tracking-[.16em] uppercase opacity-60">
          In-game location
        </span>
        <span className="block text-sm font-black">{brand.name}</span>
      </span>
    </span>
  );
}
export function sceneBrandFor(label: string): CutsceneBrandKind {
  const name = label.toLowerCase();
  if (/hospital|ambulance|nhs/.test(name)) return "hospital";
  if (/prison|hmp|cell/.test(name)) return "prison";
  if (name.includes("court")) return "court";
  if (/police|arrest/.test(name)) return "police";
  if (/national rail|railway/.test(name)) return "rail";
  if (/station|underground|tube/.test(name)) return "underground";
  return "city";
}
