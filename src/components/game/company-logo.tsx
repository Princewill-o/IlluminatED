import { logoFor } from "@/game/core/logos";

/** A company's parody logo as a rounded badge (falls back to the boss emoji's colour). */
export function CompanyLogo({ id, size = 40, className }: { id: string; size?: number; className?: string }) {
  const logo = logoFor(id);
  if (!logo) return null;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill={logo.bg} />
      {logo.shapes
        .filter((s) => s.fill !== "none")
        .map((s, i) => (
          <path key={i} d={s.d} fill={s.fill} />
        ))}
    </svg>
  );
}
