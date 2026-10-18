import { furnitureById } from "@/game/core/homes";

/** Small vector product cards, with no extra images or WebGL contexts. */
export function FurnitureThumbnail({ item }: { item: string }) {
  const f = furnitureById(item);
  const type = f?.design ?? item;
  const cloth = f?.starter ? "#8a9f9c" : "#43665c";
  return <svg viewBox="0 0 140 100" aria-hidden className="h-24 w-full rounded-xl bg-[#eee7d9]">
    <ellipse cx="72" cy="82" rx="46" ry="8" fill="#203b38" opacity=".1" />
    {type === "bed" ? <g><path d="M22 45 70 25 121 48 72 73Z" fill="#ba956c" /><path d="m22 45 50 23 49-20v19L72 89 22 65Z" fill="#8c6e50" /><path d="M25 45 70 29 116 48 72 68Z" fill="#fff7e9" /><path d="m26 49 44-10 44 13-42 20Z" fill={cloth} /><path d="m27 42 16-6 18 7-17 6Zm40-10 15 5 16 7-15 6-17-8Z" fill="#fff7e9" /></g>
      : ["shower", "bath", "toilet", "sink"].includes(type) ? <g><path d="m39 27 35-12 29 16v46L70 88 39 72Z" fill="#9bbbbb" /><path d="m42 31 30-10v55L42 66Z" fill="#cde1df" /><path d="m42 71 30-11 29 16-31 10Z" fill="#fff9ed" /><path d="M73 22v30m0-24 17 6" fill="none" stroke="#bc9c63" strokeWidth="4" /><path d="m85 40-1 17m8-15-1 17" stroke="#fff" strokeWidth="2" opacity=".8" /></g>
        : ["sofa", "armchair", "beanbag"].includes(type) ? <g><path d="m25 39 48-15 44 20v29L70 88 25 67Z" fill={cloth} /><path d="m31 51 41-12 38 17-40 15Z" fill="#91a99a" /><path d="m28 43 8 4v22l-8-4Zm77 7 9-4v26l-9 3Z" fill="#254e46" /><path d="m42 40 12-4 11 8-12 4Z" fill="#dfc6a0" /><path d="M32 70v10m69-2v10" stroke="#b79a62" strokeWidth="3" /></g>
          : ["tv", "arcade", "gaming"].includes(type) ? <g><path d="m28 58 43-11 43 19-45 15-41-16Z" fill="#a88762" /><path d="M29 28 99 21v39l-70 7Z" fill="#243c3c" /><path d="m34 32 59-6v29l-59 7Z" fill="#80b7bb" /><path d="m36 53 17-16 17 10 20-15v20l-54 6Z" fill="#b8d4c4" /></g>
            : ["plant", "lamp", "sculpture", "telescope"].includes(type) ? <g><path d="M53 63h35l-6 22H59Z" fill="#d0b38a" /><path d="M70 64V26" stroke="#b89d65" strokeWidth="4" />{type === "plant" ? <g fill="#527b60"><ellipse cx="57" cy="39" rx="17" ry="9" transform="rotate(30 57 39)" /><ellipse cx="84" cy="31" rx="18" ry="9" transform="rotate(-30 84 31)" /><ellipse cx="57" cy="53" rx="15" ry="8" /></g> : <circle cx="70" cy="30" r="18" fill="#f2dba9" />}</g>
              : <g><path d="m25 38 46-15 45 22-47 15Z" fill="#c5a17a" /><path d="m25 39 44 21 47-15v12L69 73 25 51Z" fill="#937252" /><path d="M32 52v26m37-10v21m38-29v19" stroke="#b79a62" strokeWidth="4" /><path d="m46 34 27-8 24 12-28 8Z" fill={cloth} /></g>}
  </svg>;
}
