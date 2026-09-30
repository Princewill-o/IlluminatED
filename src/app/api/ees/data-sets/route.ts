import { NextResponse } from "next/server";

import { proxyGet } from "@/lib/server/proxy";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("publicationId") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json(
      { error: "invalid_publication_id" },
      { status: 400 },
    );
  return proxyGet(
    req,
    `https://api.education.gov.uk/statistics/v1/publications/${id}/data-sets`,
    { page: 4, pageSize: 2 },
    { revalidate: 21600 },
  );
}
