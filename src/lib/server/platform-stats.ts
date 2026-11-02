import "server-only";

import { normalisePlatformStats, STATS_FALLBACK, type PlatformStats } from "@/lib/education/platform-stats";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/social/config";

export async function platformStats(): Promise<PlatformStats> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return STATS_FALLBACK;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/platform_stats`, { method:"POST",
      headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:"{}",
      next:{revalidate:300},signal:AbortSignal.timeout(8000) });
    return response.ok ? normalisePlatformStats(await response.json()) : STATS_FALLBACK;
  } catch { return STATS_FALLBACK; }
}
