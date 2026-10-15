import type { Metadata } from "next";

import { WorldApp } from "@/components/game/world/world-app";
import { requireAccount } from "@/lib/account/server";
import { listOrgs, myMembership, staffFor } from "@/lib/employers/server";
import { loadPlayer } from "@/lib/game/server";

export const metadata: Metadata = { title: "Worlds" };

export default async function WorldPage({ searchParams }: { searchParams: Promise<{ map?: string; server?: string }> }) {
  const { map, server } = await searchParams;
  const account = await requireAccount("/games/world");
  const [player, orgs, membership] = await Promise.all([loadPlayer(account.id), listOrgs(), myMembership(account.id)]);
  const staff = await staffFor(orgs.map((o) => o.id));
  const bySlug = Object.fromEntries(orgs.map((o) => [o.slug, (staff[o.id] ?? []).map(({ userId, username, title }) => ({ userId, username, title }))]));

  return (
    <WorldApp
      me={{ id: account.id, username: account.profile.username, avatar: player.avatar, org: membership?.org.name ?? null }}
      offices={orgs.map(({ slug, name, sector, accent }) => ({ slug, name, sector, accent }))}
      staff={bySlug}
      initialMap={map ?? "city"}
      initialServer={server ?? null}
    />
  );
}
