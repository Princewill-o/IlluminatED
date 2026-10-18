import { AFFILIATION_ICONS, type WorldAffiliation } from "@/game/core/affiliation";
import { logoFor } from "@/game/core/logos";
/** DOM labels sit above WebGL so names remain readable at every camera angle. */
export function makeNameplate(username: string, affiliation: WorldAffiliation | null | undefined, me = false) {
  const root = document.createElement("div");
  root.className = "pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1 whitespace-nowrap text-[10px] font-black";
  if (affiliation) {
    const row = document.createElement("span");
    row.className = "inline-flex max-w-48 items-center gap-1 rounded-full border border-white/60 bg-[#f7f1e6] px-2 py-1 text-[#13203a] shadow";
    const logo = affiliation.logo ? logoFor(affiliation.logo) : null;
    if (logo) {
      const img = document.createElement("img"); img.width = 17; img.height = 17; img.alt = "";
      img.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${logo.bg}"/>${logo.shapes.map(s => `<path d="${s.d}" fill="${s.fill}"/>`).join("")}</svg>`)}`;
      row.appendChild(img);
    } else { const icon = document.createElement("span"); icon.textContent = AFFILIATION_ICONS[affiliation.icon]; row.appendChild(icon); }
    const text = document.createElement("span"); text.className = "max-w-36 truncate"; text.textContent = affiliation.label;
    row.title = `${affiliation.kind === "work" ? "Works at" : "Studies"} ${affiliation.label}`;
    row.appendChild(text); root.appendChild(row);
  }
  const name = document.createElement("span");
  name.className = `rounded-full px-2 py-1 text-white shadow ${me ? "bg-[#164bc3]" : "bg-[#13203a]/90"}`;
  name.textContent = me ? `@${username} · YOU ↓` : `@${username}`;
  root.appendChild(name);
  return root;
}
