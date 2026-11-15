import contexts from "./company-contexts.json";

export function companyContext(sectorId: string) {
  const context = (contexts as Record<string, string[]>)[sectorId];
  return context ? { name: context[0], url: context[1] } : null;
}
