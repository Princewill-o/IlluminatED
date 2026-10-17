import {NextResponse} from "next/server";

import {universityEvents} from "@/lib/server/university-events";
export const revalidate=10800;
export async function GET(){return NextResponse.json(await universityEvents(),{headers:{"cache-control":"public, s-maxage=10800, stale-while-revalidate=86400"}});}
