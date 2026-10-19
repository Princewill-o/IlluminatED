"use client";

import { useEffect, useState } from "react";

import { AvatarFigure } from "@/components/game/avatar";
import type { Workplace } from "@/game/core/careers";
import type { Avatar } from "@/game/core/cosmetics";

const STANDARDS: Record<string, { code: string; title: string; url: string }> = {
  pizzazz: { code: "ST1488", title: "Food and beverage team member", url: "https://skillsengland.education.gov.uk/apprenticeships/st1488" },
  tescow: { code: "ST0327", title: "Retailer", url: "https://skillsengland.education.gov.uk/apprenticeships/st0327" },
  goggle: { code: "ST0116", title: "Software developer", url: "https://skillsengland.education.gov.uk/apprenticeships/st0116" },
  macrosoft: { code: "ST0120", title: "Digital support technician", url: "https://skillsengland.education.gov.uk/apprenticeships/st0120" },
  barklays: { code: "ST0185", title: "Financial services customer adviser", url: "https://skillsengland.education.gov.uk/apprenticeships/st0185" },
  "st-plasters": { code: "ST0216", title: "Healthcare support worker", url: "https://skillsengland.education.gov.uk/apprenticeships/st0216" },
  lawz: { code: "ST0245", title: "Paralegal", url: "https://skillsengland.education.gov.uk/apprenticeships/st0245" },
  netflics: { code: "ST0122", title: "Digital marketer", url: "https://skillsengland.education.gov.uk/apprenticeship-standards/st0122-v1-0" },
};

const TOOLS: Record<string, { icon: string; label: string }> = {
  pizzazz: { icon: "🍕", label: "Order pass" }, tescow: { icon: "🛒", label: "Till & stock" },
  goggle: { icon: "💻", label: "Developer workstation" }, macrosoft: { icon: "🖥️", label: "Support desk" },
  barklays: { icon: "🏦", label: "Service counter" }, "st-plasters": { icon: "🩺", label: "Care station" },
  lawz: { icon: "📄", label: "Case file" }, netflics: { icon: "📱", label: "Campaign studio" },
};

/** Animated role scene shown during a simulated shift. */
export function ShiftStage({ workplace, avatar, progress }: { workplace: Workplace; avatar: Avatar; progress: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((n) => n + 1), 1200);
    return () => window.clearInterval(timer);
  }, []);
  const standard = STANDARDS[workplace.id];
  const tool = TOOLS[workplace.id] ?? { icon: "🗂️", label: "Work station" };
  return (
    <section aria-label={`${workplace.name} work floor`} className="relative mb-4 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#182541] via-[#23395a] to-[#315174] p-4 text-white">
      <div className="absolute inset-x-0 bottom-0 h-5 bg-[#f2d9a6]/90" />
      <div className="relative z-10 flex min-h-36 items-end justify-between gap-3">
        <div className="flex items-end gap-2">
          <div className="shift-bob"><AvatarFigure avatar={avatar} size={112} showPet={false} logo={workplace.companyId ?? undefined} /></div>
          <div className="mb-2 flex min-w-20 flex-col items-center rounded-xl border border-white/20 bg-white/10 px-2 py-1" aria-hidden="true"><span className="animate-pulse text-3xl">{tool.icon}</span><small className="text-center text-[9px] text-white/80">{tool.label}</small></div>
        </div>
        <div className="self-start text-right">
          <p className="inline-flex items-center gap-1 rounded-full bg-emerald-300/20 px-3 py-1 text-xs font-black text-emerald-100"><span className="size-2 animate-pulse rounded-full bg-emerald-300" /> ON SHIFT</p>
          <p className="mt-2 text-xs text-white/75">Work cycle {elapsed + 1}</p>
        </div>
      </div>
      <div className="relative z-10 mt-4 flex items-center justify-between text-xs font-bold">
        <span>Shift progress</span><span>{progress}/5 tasks</span>
      </div>
      <div className="relative z-10 mt-1 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[#f2d9a6] transition-all duration-500" style={{ width: `${progress * 20}%` }} /></div>
      {standard && <p className="relative z-10 mt-3 text-[11px] leading-4 text-white/75">Practice activities reference <a className="font-bold text-white underline" href={standard.url} target="_blank" rel="noreferrer">{standard.code} · {standard.title}</a>. Simulated practice; not an accredited qualification or assessment.</p>}
    </section>
  );
}
