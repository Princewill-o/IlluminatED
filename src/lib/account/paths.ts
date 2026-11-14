/** Only allow same-site paths as redirect targets. */
export function safeNext(value: unknown, fallback = "/dashboard"): string {
  const s = typeof value === "string" ? value : "";
  // URL parsers strip control characters and normalise backslashes, which can
  // turn an apparently local path into an external redirect.
  return s.startsWith("/") && !s.startsWith("//") && s.length <= 2000 &&
    !/[\\\u0000-\u001f\u007f]/.test(s)
    ? s
    : fallback;
}
