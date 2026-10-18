import type { SupabaseClient } from "@supabase/supabase-js";

export interface WorldLease {
  accepted: boolean;
  reason?: "room_full" | "service_busy" | "already_connected";
  topic?: string;
  capacity?: number;
  expiresAt?: number;
  rotateAt?: number;
}
const TAB_LEASE_KEY = "illuminated-world-lease";
let previousClientId: string | null = null;
let claimQueue: Promise<void> = Promise.resolve();

/** Fail closed on missing migration, expired leases or unavailable admission. */
export async function claimWorld(
  client: SupabaseClient,
  map: string,
  server: string,
  clientId: string,
): Promise<WorldLease> {
  const prior = claimQueue;
  let unlock!: () => void;
  claimQueue = new Promise<void>((resolve) => {
    unlock = resolve;
  });
  await prior;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    try {
      if (!previousClientId && typeof sessionStorage !== "undefined")
        previousClientId = sessionStorage.getItem(TAB_LEASE_KEY);
    } catch {
      /* Storage can be disabled. */
    }
    if (previousClientId && !/^[0-9a-f-]{36}$/i.test(previousClientId))
      previousClientId = null;
    const { data, error } = await client
      .rpc("world_claim", {
        p_map: map,
        p_server: server,
        p_client: clientId,
        p_previous: previousClientId,
      })
      .abortSignal(controller.signal);
    if (error || !data || typeof data.accepted !== "boolean")
      throw new Error("admission_unavailable");
    if (
      data.accepted &&
      (typeof data.topic !== "string" ||
        !data.topic.startsWith(`world:room:${map}:${server}:`) ||
        !Number.isFinite(data.expiresAt) ||
        data.expiresAt <= Date.now() ||
        !Number.isFinite(data.rotateAt))
    )
      throw new Error("invalid_lease");
    if (data.accepted) {
      previousClientId = clientId;
      try {
        if (typeof sessionStorage !== "undefined")
          sessionStorage.setItem(TAB_LEASE_KEY, clientId);
      } catch {
        /* In-memory handoff still works. */
      }
    }
    return data as WorldLease;
  } finally {
    clearTimeout(timer);
    unlock();
  }
}

export async function releaseWorld(client: SupabaseClient, clientId: string) {
  try {
    await client.rpc("world_release", { p_client: clientId });
  } catch {
    /* Database expiry recovers abandoned clients. */
  }
}
