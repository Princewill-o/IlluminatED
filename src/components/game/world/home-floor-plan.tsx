import { furnitureById, isFloorFurniture } from "@/game/core/homes";
import type { WorldMap } from "@/game/core/world";

/** Complete low-cost fallback, including furniture added after the old atlases. */
export function HomeFloorPlan({ map }: { map: WorldMap }) {
  return <svg viewBox={`0 0 ${map.cols} ${map.rows}`} width={map.width} height={map.height} className="absolute inset-0" aria-label="Your furnished room">
    <rect width={map.cols} height={map.rows} fill="#e5dbc8" />
    <rect x="1" y="2" width="18" height="11" fill="#c4a47e" stroke="#9a866a" strokeWidth=".1" />
    <rect x="1" y="7" width="4" height="4" fill="#c1d0c7" />
    {[...(map.layout ?? [])].sort((a,b) => Number(!isFloorFurniture(a.item))-Number(!isFloorFurniture(b.item))).map(p => {
      const f = furnitureById(p.item);
      if (!f) return null;
      const type = f.design ?? f.id;
      return <g key={p.key}>
        <rect x={p.x + .07} y={p.y + .07} width={f.w - .14} height={f.h - .14} rx=".12" fill={isFloorFurniture(f.id) ? "#c8bcaa" : ["bed","sofa","armchair"].includes(type) ? "#607e73" : ["shower","bath","sink","toilet"].includes(type) ? "#e9f1e8" : "#997750"} stroke="#344e46" strokeWidth=".04" />
        <text x={p.x + f.w/2} y={p.y + f.h/2 + .09} textAnchor="middle" fontSize=".2" fill="#fff" textLength={Math.min(f.w - .25, f.name.length * .12)} lengthAdjust="spacingAndGlyphs">{f.name}</text>
      </g>;
    })}
    <rect x="9" y="13" width="2" height="1" fill="#c4a47e" />
  </svg>;
}
