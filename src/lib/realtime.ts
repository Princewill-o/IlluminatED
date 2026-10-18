"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/** Bind private room joins to the current account before opening the channel. */
export async function joinGameChannel(
  client: SupabaseClient,
  channel: RealtimeChannel,
  userId: string,
  onStatus: (status: string) => void,
  cancelled: () => boolean,
) {
  try {
    const { data, error } = await client.auth.getSession();
    if (cancelled()) return;
    if (error || !data.session || data.session.user.id !== userId) {
      onStatus("AUTH_ERROR");
      return;
    }
    await client.realtime.setAuth(data.session.access_token);
    if (!cancelled()) channel.subscribe(onStatus);
  } catch {
    if (!cancelled()) onStatus("AUTH_ERROR");
  }
}
