/** Only allow same-site paths as redirect targets. */
export function safeNext(value: unknown, fallback = "/dashboard"): string {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\")
    ? s
    : fallback;
}
