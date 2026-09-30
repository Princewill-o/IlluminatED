import { proxyGet } from "@/lib/server/proxy";

// DfE Explore Education Statistics public API (no key) — https://api.education.gov.uk/statistics/docs/
export async function GET(req: Request) {
  return proxyGet(
    req,
    "https://api.education.gov.uk/statistics/v1/publications",
    { search: 120, page: 4, pageSize: 2 },
    { revalidate: 21600 },
  );
}
