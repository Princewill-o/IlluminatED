import { NextResponse } from "next/server";

import { fetchUpstreamJson } from "@/lib/server/proxy";

export async function GET() {
  const params = new URLSearchParams({ count: "6", order: "-public_timestamp", fields: "title,link,public_timestamp" });
  params.append("filter_content_store_document_type", "news_story");
  params.append("filter_content_store_document_type", "press_release");
  try {
    const data = await fetchUpstreamJson(`https://www.gov.uk/api/search.json?${params}`, { revalidate: 900, timeoutMs: 6000 }) as { results?: { title?: unknown; link?: unknown; public_timestamp?: unknown }[] };
    const headlines = (data.results ?? []).flatMap(item => typeof item.title === "string" && typeof item.link === "string" && item.link.startsWith("/government/news/") ? [{ title: item.title.slice(0, 240), url: `https://www.gov.uk${item.link}`, published: typeof item.public_timestamp === "string" ? item.public_timestamp : null }] : []);
    return NextResponse.json({ headlines, source: "GOV.UK", updated: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ headlines: [], source: "GOV.UK", updated: null }, { status: 503 });
  }
}
