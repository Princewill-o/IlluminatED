import type { Metadata } from "next";

import { WorldApp } from "@/components/game/world/world-app";
import { requireAccount } from "@/lib/account/server";
import { listOrgs, myMembership, staffFor } from "@/lib/employers/server";
import { loadPlayer } from "@/lib/game/server";
import { worldPass } from "@/lib/game/world-pass";

export const metadata: Metadata = { title: "Worlds" };

export default async function WorldPage({ searchParams }: { searchParams: Promise<{ map?: string; server?: string }> }) {
  const { map, server } = await searchParams;
  const account = await requireAccount("/games/world");
  const [player, orgs, membership] = await Promise.all([loadPlayer(account.id), listOrgs(), myMembership(account.id)]);
  const staff = await staffFor(orgs.map((o) => o.id));
  const bySlug = Object.fromEntries(orgs.map((o) => [o.slug, (staff[o.id] ?? []).map(({ userId, username, title }) => ({ userId, username, title }))]));

  // The logo on your back: the company where you've climbed highest (then best score).
  const badge =
    Object.entries(player.companies)
      .filter(([, c]) => c.shifts > 0)
      .sort(([, a], [, b]) => b.bestRank - a.bestRank || b.bestScore - a.bestScore)[0]?.[0] ?? null;
  const org = membership?.org.name ?? null;
  const { pass, publicKey } = worldPass({ id: account.id, username: account.profile.username, org, badge });

  return (
    <WorldApp
      me={{ id: account.id, username: account.profile.username, avatar: player.avatar, org, badge, pass, publicKey }}
      offices={orgs.map(({ slug, name, sector, accent }) => ({ slug, name, sector, accent }))}
      staff={bySlug}
      initialMap={map ?? "city"}
      initialServer={server ?? null}
    />
  );
}
