import { proxyGet } from "@/lib/server/proxy";

export async function GET(req: Request) {
  return proxyGet(
    req,
    "https://register-api.ofqual.gov.uk/api/Organisations",
    { search: 120, page: 4, limit: 3 },
    { revalidate: 86400 },
  );
}
