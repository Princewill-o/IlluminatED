import { NextResponse } from "next/server";

import {
  escoOccupationUrl,
  lookupTrainingContext,
  parseBoardVacancies,
  parseEscoOccupation,
} from "@/lib/illum-world/training-context";

async function readPublicJson(url: URL, seconds: number) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "error",
      credentials: "omit",
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: seconds },
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return null;
    return await response.json() as unknown;
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ role: string }> }) {
  const config = lookupTrainingContext((await params).role);
  if (!config) return NextResponse.json({ error: "Unknown training role." }, { status: 404 });

  const [esco, vacancies] = await Promise.all([
    readPublicJson(escoOccupationUrl(config.occupation), 86_400),
    readPublicJson(new URL(`https://boards-api.greenhouse.io/v1/boards/${config.board}/jobs`), 3600),
  ]);
  return NextResponse.json({
    occupation: parseEscoOccupation(esco, config.occupation),
    board: config.boardName,
    vacancies: parseBoardVacancies(vacancies, config),
  }, {
    headers: {
      "Cache-Control": esco && vacancies ? "public, s-maxage=3600, stale-while-revalidate=300" : "no-store",
    },
  });
}
