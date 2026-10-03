/** Shared validation for the account state API and client. */
export type EducationState = Record<string, string | boolean>;
export const CAREER_ROUTES = [
  "university",
  "apprenticeship",
  "both",
  "unsure",
] as const;
export const CAREER_YEARS = [
  "year-9",
  "year-10",
  "year-11",
  "year-12",
  "year-13",
  "college",
  "adult",
  "other",
] as const;
export function validNamespace(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(career|saved-opportunities|syllabus:[a-z0-9-]{1,80})$/.test(value)
  );
}
export function validStateItem(
  namespace: string,
  item: unknown,
  value: unknown,
) {
  if (
    !validNamespace(namespace) ||
    typeof item !== "string" ||
    item.length < 1 ||
    item.length > 1200
  )
    return false;
  if (namespace === "career") {
    return item === "route"
      ? CAREER_ROUTES.some((x) => x === value)
      : item === "year" && CAREER_YEARS.some((x) => x === value);
  }
  return typeof value === "boolean";
}
export function normaliseState(
  namespace: string,
  input: unknown,
): EducationState {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return Object.fromEntries(
    Object.entries(input).filter(([k, v]) => validStateItem(namespace, k, v)),
  );
}
