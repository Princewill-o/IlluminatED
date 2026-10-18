import "server-only";
import { getSupabase } from "@/lib/social/server";

export interface CityHolding {
  asset_id: string;
  units: number;
  cost: number;
}
export interface CitySnapshot {
  ready: boolean;
  clout: number;
  vip: boolean;
  holdings: CityHolding[];
  quotes: Record<string, number>;
  ledger: {
    id: number;
    asset_id: string;
    units: number;
    amount: number;
    created_at: string;
  }[];
}
export async function loadCity(): Promise<CitySnapshot> {
  const sb = await getSupabase();
  const { data, error } = sb
    ? await sb.rpc("city_snapshot")
    : { data: null, error: true };
  return error || !data
    ? {
        ready: false,
        clout: 0,
        vip: false,
        holdings: [],
        quotes: {},
        ledger: [],
      }
    : { ...data, ready: true };
}
