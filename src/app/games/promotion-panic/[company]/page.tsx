import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { PromotionPanic } from "@/components/game/promotion-panic";
import { companyById } from "@/game/core/companies";
import { requireAccount } from "@/lib/account/server";
import { gameSources, loadChallenge, loadPlayer } from "@/lib/game/server";

type Params = { company: string };
type Search = { challenge?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const c = companyById((await params).company);
  return { title: c ? `Promotion Panic: ${c.name}` : "Promotion Panic" };
}

export default async function PromotionPanicPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { company: id } = await params;
  const { challenge: code } = await searchParams;
  const company = companyById(id);
  if (!company) notFound();
  const account = await requireAccount(
    `/games/promotion-panic/${id}${code ? `?challenge=${encodeURIComponent(code)}` : ""}`,
  );
  const [player, challenge] = await Promise.all([
    loadPlayer(account.id),
    code ? loadChallenge(code) : Promise.resolve(null),
  ]);
  const matched =
    challenge && challenge.company === company.id ? challenge : null;
  // Challenges use the full company deck so both players get exactly the same tasks.
  const sources = matched
    ? gameSources(company)
    : gameSources(
        company,
        account.details.subjects.map((s) => s.courseId),
      );

  return (
    <div id="game">
      <PromotionPanic
        key={matched?.code ?? company.id}
        companyId={company.id}
        sources={sources}
        avatar={player.avatar}
        dailyBonusReady={player.dailyBonusReady}
        canSave={player.ready}
        previousBest={player.companies[company.id]?.bestScore ?? 0}
        challenge={
          matched
            ? {
                code: matched.code,
                seed: matched.seed,
                score: matched.score,
                rank: matched.rank,
                username: matched.username,
              }
            : null
        }
      />
    </div>
  );
}
