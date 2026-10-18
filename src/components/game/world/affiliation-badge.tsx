import { CompanyLogo } from "../company-logo";

import { AFFILIATION_ICONS, type WorldAffiliation } from "@/game/core/affiliation";
export function AffiliationBadge({ value }: { value?: WorldAffiliation | null }) {
  if (!value) return null;
  return <span className="mb-1 inline-flex max-w-48 items-center gap-1.5 rounded-full border border-white/50 bg-[#f7f1e6] px-2 py-1 text-[10px] font-black text-[#13203a] shadow-sm" title={`${value.kind === "work" ? "Works at" : "Studies"} ${value.label}`}>{value.logo ? <CompanyLogo id={value.logo} size={17} /> : <span aria-hidden>{AFFILIATION_ICONS[value.icon]}</span>}<span className="truncate">{value.label}</span></span>;
}
