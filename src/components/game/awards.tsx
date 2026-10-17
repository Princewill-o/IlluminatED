import {
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  Compass,
  Flame,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  type LucideIcon,
} from "lucide-react";

import type { AwardIcon, LearningAward } from "@/game/core/awards";

const ICONS: Record<AwardIcon, LucideIcon> = {
  book: BookOpenCheck,
  flame: Flame,
  star: Star,
  compass: Compass,
  briefcase: BriefcaseBusiness,
  shield: ShieldCheck,
  target: Target,
  building: Building2,
};

/** A compact game medal that can also be displayed in the city interface. */
export function AwardMedal({
  award,
  size = "default",
}: {
  award: LearningAward;
  size?: "default" | "small";
}) {
  const Icon = ICONS[award.icon] ?? Star;
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${size === "small" ? "size-12" : "size-20"}`}
      aria-hidden="true"
    >
      <span
        className={`absolute inset-x-[24%] bottom-0 h-[42%] [clip-path:polygon(0_0,100%_0,100%_100%,50%_74%,0_100%)] ${award.earned ? (award.category === "study" ? "bg-[#2b5fd9]" : "bg-[#15987f]") : "bg-muted-foreground/25"}`}
      />
      <span
        className={`relative grid size-[80%] place-items-center rounded-full border-[3px] shadow-sm ${award.earned ? "border-[#d7ab4c] bg-[#ffedbd] text-[#825d14] shadow-[#d7ab4c]/20" : "border-border bg-muted text-muted-foreground"}`}
      >
        <span
          className={`grid size-[82%] place-items-center rounded-full border ${award.earned ? "border-[#d7ab4c]/55" : "border-muted-foreground/20"}`}
        >
          <Icon
            className={size === "small" ? "size-4" : "size-6"}
            strokeWidth={2}
          />
        </span>
      </span>
      {award.earned && (
        <Sparkles
          className={`absolute top-0 right-0 text-[#d7ab4c] ${size === "small" ? "size-3" : "size-4"}`}
        />
      )}
    </span>
  );
}

export function AwardCollection({
  awards,
  compact = false,
}: {
  awards: LearningAward[];
  compact?: boolean;
}) {
  return (
    <ul
      className={`grid gap-3 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4"}`}
    >
      {awards.map((award) => (
        <li
          key={award.id}
          className={`relative flex min-w-0 flex-col rounded-2xl border p-4 ${award.earned ? "border-[#d7ab4c]/45 bg-[#ffedbd]/15" : "border-border bg-card"}`}
        >
          <div className="flex items-start justify-between gap-2">
            <AwardMedal award={award} size={compact ? "small" : "default"} />
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${award.earned ? "bg-[#15987f]/10 text-[#117561] dark:text-[#69d7bd]" : "bg-muted text-muted-foreground"}`}
            >
              {award.earned ? (
                <Check className="size-3" />
              ) : (
                <LockKeyhole className="size-3" />
              )}
              {award.earned ? "Earned" : "Locked"}
            </span>
          </div>
          <p className="text-muted-foreground mt-3 text-[10px] font-bold tracking-wider uppercase">
            {award.category === "study"
              ? "Study award"
              : "Work experience award"}
          </p>
          <h3 className="mt-1 text-sm leading-snug font-black">
            {award.title}
          </h3>
          <p className="text-muted-foreground mt-1.5 flex-1 text-xs leading-5">
            {award.description}
          </p>
          <div className="text-muted-foreground mt-4 flex items-center justify-between text-[11px] font-bold">
            <span>{award.earned ? "Milestone reached" : "Your progress"}</span>
            <span>
              {award.progress}/{award.target}
            </span>
          </div>
          <div
            className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full"
            role="progressbar"
            aria-label={`${award.title} progress`}
            aria-valuemin={0}
            aria-valuemax={award.target}
            aria-valuenow={award.progress}
          >
            <div
              className={`h-full rounded-full ${award.earned ? "bg-[#d7ab4c]" : award.category === "study" ? "bg-[#2b5fd9]" : "bg-[#15987f]"}`}
              style={{
                width: `${Math.round((award.progress / award.target) * 100)}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
