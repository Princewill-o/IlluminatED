export type ProductId = "world" | "maths" | "science" | "english";

export const PRODUCTS = [
  { id: "world", name: "IllumWorld", path: "/world", host: "world.illumed.co.uk", label: "The city-life game", description: "Create your character, explore the city and try short in-game role contracts.", colour: "#6d5ce7", symbol: "W" },
  { id: "maths", name: "IllumMaths", path: "/maths", host: "maths.illumed.co.uk", label: "Years 7–11 · Maths", description: "Choose your year group, understand the method and practise with explanations and support.", colour: "#087f72", symbol: "÷" },
  { id: "science", name: "IllumScience", path: "/science", host: "science.illumed.co.uk", label: "Years 7–11 · Science", description: "Explore biology, chemistry, physics and working scientifically through lessons, evidence and practice.", colour: "#2864c4", symbol: "Sc" },
  { id: "english", name: "IllumEnglish", path: "/english", host: "english.illumed.co.uk", label: "Years 7–11 · English Language & Literature", description: "Read closely, explore literature and build confident analysis and writing for your year group.", colour: "#b34461", symbol: "Aa" },
] as const;

export function productForPath(path: string) {
  return PRODUCTS.find(p => path === p.path || path.startsWith(`${p.path}/`)) ?? null;
}

export function productForHost(host: string) {
  const clean = host.toLowerCase().replace(/:\d+$/, "");
  return PRODUCTS.find(p => p.host === clean) ?? null;
}

export function isLearningDestination(path: string) {
  const clean = path.split("?")[0];
  return Boolean(productForPath(clean)) || clean === "/dashboard" || clean === "/school" || clean.startsWith("/school/");
}

export function sharedCookieOptions(host: string) {
  const clean = host.toLowerCase().replace(/:\d+$/, "");
  return clean === "illumed.co.uk" || clean === "www.illumed.co.uk" || productForHost(clean)
    ? { domain: ".illumed.co.uk", path: "/", sameSite: "lax" as const, secure: true }
    : { path: "/", sameSite: "lax" as const };
}

/** Keep explicit product paths, legacy URLs and auth callbacks on the same app. */
export function productRewrite(host: string, path: string): string | null {
  const product = productForHost(host);
  return product && path === "/" ? product.path : null;
}

export function umbrellaHref(host: string) {
  return productForHost(host) ? "https://illumed.co.uk/" : "/";
}
