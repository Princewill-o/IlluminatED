import { roleOf, workplaceById } from "./careers";
import { logoFor } from "./logos";

export const AFFILIATION_ICONS = { work: "💼", maths: "🧮", science: "🧪", computing: "💻", english: "📚", business: "📈", engineering: "🛠️", study: "🎓" } as const;
export interface WorldAffiliation { kind: "work" | "study"; label: string; icon: keyof typeof AFFILIATION_ICONS; logo: string | null }
export interface Occupation { workplace: string; role: string }
export function affiliationFor(job: Occupation | null, subject: string | null, employer: { name: string; slug: string } | null = null): WorldAffiliation | null {
  const workplace = job ? workplaceById(job.workplace) : null;
  if (workplace && job && roleOf(job.workplace, job.role)) return { kind: "work", label: workplace.name, icon: "work", logo: workplace.companyId ?? workplace.id };
  if (employer) return { kind: "work", label: employer.name.slice(0, 60), icon: "work", logo: logoFor(employer.slug) ? employer.slug : null };
  if (!subject) return null;
  const icon = /math|numeracy/i.test(subject) ? "maths" : /biology|chemistry|physics|science/i.test(subject) ? "science" : /comput|digital|software/i.test(subject) ? "computing" : /english|literature|language/i.test(subject) ? "english" : /business|econom|account|finance/i.test(subject) ? "business" : /engineer|construction/i.test(subject) ? "engineering" : "study";
  return { kind: "study", label: subject.slice(0, 60), icon, logo: null };
}
export function readAffiliation(value: unknown): WorldAffiliation | null {
  if (!value || typeof value !== "object") return null;
  const a = value as Record<string, unknown>;
  if ((a.kind !== "work" && a.kind !== "study") || typeof a.label !== "string" || !a.label.trim() || typeof a.icon !== "string" || !Object.hasOwn(AFFILIATION_ICONS, a.icon)) return null;
  return { kind: a.kind, label: a.label.slice(0, 60), icon: a.icon as WorldAffiliation["icon"], logo: typeof a.logo === "string" && logoFor(a.logo) ? a.logo : null };
}
