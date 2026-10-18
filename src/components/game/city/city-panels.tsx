"use client";

import { useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowUpRight,
  Check,
  Crown,
  Landmark,
  Plane,
  Sailboat,
  Sparkles,
} from "lucide-react";

import { cityAction } from "@/app/games/city-actions";
import assets from "@/game/core/city-assets.json";
import { EXPANSIONS } from "@/game/core/expansions";
import type { CitySnapshot } from "@/lib/game/city-server";

const fmt = (n: number) => n.toLocaleString("en-GB");
const card = "rounded-3xl border bg-card p-6";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50";
export function CityHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      <p className="text-primary text-sm font-bold tracking-widest uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
        {title}
      </h1>
      <div className="text-muted-foreground mt-4 max-w-2xl leading-7">
        {children}
      </div>
    </header>
  );
}
export function WealthPanel({ state }: { state: CitySnapshot }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("investment");
  const [quantity, setQuantity] = useState(1);
  const value = state.holdings.reduce(
    (sum, h) => sum + h.units * (state.quotes[h.asset_id] ?? 0),
    0,
  );
  const cost = state.holdings.reduce((sum, h) => sum + h.cost, 0);
  function trade(id: string, units: number) {
    start(async () => {
      const result = await cityAction("city_trade", {
        p_asset: id,
        p_units: units,
      });
      setError(result.error);
      if (!result.error) router.refresh();
    });
  }
  return (
    <>
      {!state.ready && (
        <p role="status" className="mb-5 rounded-xl border p-4">
          Portfolio saving is unavailable. Purchases are disabled until the
          service is ready.
        </p>
      )}
      <div className="mb-7 grid gap-3 sm:grid-cols-3">
        {[
          ["Available Clout", state.clout],
          ["Collection value", value],
          ["Unrealised change", value - cost],
        ].map(([label, n]) => (
          <div key={label} className={card}>
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="mt-2 text-3xl font-black">{fmt(Number(n))}</p>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground mb-5 text-sm leading-6">
        Clout is game currency with no cash value. Investments are fictional
        learning simulations. Quotes change each London day and can fall. Sales
        return 95% of the displayed quote. Houses and cars are managed
        separately below.
      </p>
      <div className="mb-6 flex flex-wrap gap-2" aria-label="Asset categories">
        {[
          { id: "investment", label: "Investments", Icon: Landmark },
          { id: "aircraft", label: "Hangar", Icon: Plane },
          { id: "watercraft", label: "Marina", Icon: Sailboat },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`flex min-h-11 items-center gap-2 rounded-full border px-5 font-bold ${tab === id ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>
      {tab === "investment" && (
        <label className="mb-5 flex items-center gap-3 text-sm font-bold">
          Units per trade
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="bg-background rounded-xl border p-3"
          >
            {[1, 5, 10, 25, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      <p
        role="status"
        aria-live="polite"
        className="text-destructive mb-3 text-sm"
      >
        {error}
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {assets
          .filter((a) => a.kind === tab)
          .map((a) => {
            const holding = state.holdings.find((h) => h.asset_id === a.id);
            const price = state.quotes[a.id] ?? a.price;
            const units = a.kind === "investment" ? quantity : 1;
            return (
              <article key={a.id} className={`${card} flex flex-col`}>
                <span className="bg-primary/10 text-primary mb-4 grid size-12 place-items-center rounded-2xl">
                  {tab === "investment" ? (
                    <Landmark />
                  ) : tab === "aircraft" ? (
                    <Plane />
                  ) : (
                    <Sailboat />
                  )}
                </span>
                <h2 className="text-xl font-black">{a.name}</h2>
                <p className="text-muted-foreground mt-2 flex-1 text-sm leading-6">
                  {a.description}
                </p>
                <p className="mt-4 text-2xl font-black">
                  {fmt(price)}{" "}
                  <span className="text-sm">
                    Clout{tab === "investment" ? " / unit" : ""}
                  </span>
                </p>
                <p className="mt-1 text-sm">Owned: {holding?.units ?? 0}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={
                      pending ||
                      !state.ready ||
                      state.clout < price * units ||
                      (a.kind !== "investment" && Boolean(holding))
                    }
                    onClick={() => trade(a.id, units)}
                  >
                    {holding && a.kind !== "investment"
                      ? "Owned"
                      : `Buy${units > 1 ? ` ${units}` : ""}`}
                  </button>
                  {tab === "investment" && (
                    <button
                      className="min-h-11 rounded-xl border px-4 text-sm font-bold disabled:opacity-50"
                      disabled={
                        pending || !state.ready || (holding?.units ?? 0) < units
                      }
                      onClick={() => trade(a.id, -units)}
                    >
                      Sell {units}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
      </div>
      <section className="mt-8">
        <h2 className="text-2xl font-black">Recent transactions</h2>
        {!state.ledger.length ? (
          <p className="text-muted-foreground mt-3">
            Your purchases and sales will appear here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Clout transaction history</caption>
              <thead>
                <tr className="bg-secondary">
                  <th className="p-3">Asset</th>
                  <th className="p-3">Units</th>
                  <th className="p-3">Clout movement</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {state.ledger.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3">
                      {assets.find((a) => a.id === l.asset_id)?.name ??
                        l.asset_id}
                    </td>
                    <td className="p-3">
                      {l.units > 0 ? "+" : ""}
                      {l.units}
                    </td>
                    <td className="p-3">{fmt(l.amount)}</td>
                    <td className="p-3">
                      {new Date(l.created_at).toLocaleDateString("en-GB", {
                        timeZone: "Europe/London",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export interface WeekProgress {
  week: string;
  ends: string;
  sessions: number;
  correct: number;
  weekend: number;
  claims: string[];
}
export function WeeklyPanel({ progress }: { progress: WeekProgress | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <>
      <p className="bg-card mb-6 rounded-2xl border p-5">
        {progress
          ? `This challenge runs ${progress.week} to ${progress.ends} (exclusive), Europe/London. Your study progress is checked on the server.`
          : "Weekly challenges are temporarily unavailable. Your usual study sessions are still available."}
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          {
            id: "weekly",
            title: "Build the habit",
            desc: "Finish 3 study sessions and answer at least 10 questions correctly this week.",
            count: `${progress?.sessions ?? 0}/3 sessions · ${progress?.correct ?? 0}/10 correct`,
            ready: Boolean(
              progress && progress.sessions >= 3 && progress.correct >= 10,
            ),
            reward: 100,
          },
          {
            id: "weekend",
            title: "Weekend discovery",
            desc: "Complete 2 study sessions on Saturday or Sunday this week. Take your time and read the feedback.",
            count: `${progress?.weekend ?? 0}/2 weekend sessions`,
            ready: Boolean(progress && progress.weekend >= 2),
            reward: 75,
          },
        ].map((q) => (
          <article className={card} key={q.id}>
            <span className="text-primary text-sm font-bold">
              {q.reward} bonus Clout + collection stamp
            </span>
            <h2 className="mt-2 text-2xl font-black">{q.title}</h2>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              {q.desc}
            </p>
            <p className="mt-4 font-bold">{q.count}</p>
            <button
              className={`${button} mt-5`}
              disabled={pending || !q.ready || progress?.claims.includes(q.id)}
              onClick={() =>
                start(async () => {
                  const r = await cityAction("city_claim_week", {
                    p_reward: q.id,
                  });
                  setMessage(
                    r.error ?? "Reward collected. Your Clout has been saved.",
                  );
                  router.refresh();
                })
              }
            >
              {progress?.claims.includes(q.id) ? (
                <>
                  <Check className="size-4" />
                  Collected
                </>
              ) : (
                "Collect reward"
              )}
            </button>
          </article>
        ))}
      </div>
      <p role="status" className="mt-4">
        {message}
      </p>
      <Link className={`${button} mt-5`} href="/games/study">
        Start a study session <ArrowUpRight className="size-4" />
      </Link>
    </>
  );
}

export function ExpansionPanel({ state }: { state: CitySnapshot }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, number>>({});
  return (
    <>
      <p className="text-muted-foreground mb-6 text-sm leading-6">
        Original cartoon adventures bought with earned Clout. Each pack adds a
        character story, question-and-answer practice and a collectible badge.
        These activities do not award extra study scores or currency.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        {Object.entries(EXPANSIONS).map(([id, pack]) => {
          const asset = assets.find((a) => a.id === id)!;
          const expired = Boolean(
            asset.availableUntil &&
            Date.now() >= Date.parse(asset.availableUntil),
          );
          const owned = state.holdings.some((h) => h.asset_id === id);
          return (
            <article key={id} className={card}>
              <span className="text-5xl" role="img" aria-label={pack.character}>
                {pack.symbol}
              </span>
              <p className="text-primary mt-4 text-sm font-bold">
                {asset.name}
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Meet {pack.character}
              </h2>
              <p className="text-muted-foreground mt-3 leading-7">
                {pack.story}
              </p>
              <p className="mt-4 font-bold">
                {asset.price} Clout · unlock at {asset.unlockClout} available
                Clout
              </p>
              {asset.availableUntil && (
                <p className="text-primary mt-2 text-xs font-bold">
                  Limited drop · purchases close 1 November 2026, 00:00 GMT.
                  Owned packs stay available.
                </p>
              )}
              {!owned ? (
                <button
                  className={`${button} mt-5`}
                  disabled={
                    !state.ready ||
                    pending ||
                    expired ||
                    state.clout < (asset.unlockClout ?? asset.price)
                  }
                  onClick={() =>
                    start(async () => {
                      const r = await cityAction("city_trade", {
                        p_asset: id,
                        p_units: 1,
                      });
                      setMessage(r.error ?? "Pack unlocked!");
                      router.refresh();
                    })
                  }
                >
                  {expired ? "Purchase window ended" : "Unlock expansion"}
                </button>
              ) : (
                <>
                  <p className="bg-primary/10 mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold">
                    <Sparkles className="size-4" />
                    {pack.badge} badge collected
                  </p>
                  <div className="mt-5 space-y-5">
                    {pack.questions.map((q, i) => {
                      const key = `${id}-${i}`;
                      const picked = choices[key];
                      return (
                        <fieldset key={key} className="rounded-xl border p-4">
                          <legend className="px-1 text-sm font-bold">
                            {i + 1}. {q.prompt}
                          </legend>
                          <div className="space-y-2">
                            {q.options.map((option, index) => (
                              <button
                                key={option}
                                type="button"
                                className={`block min-h-11 w-full rounded-lg border p-3 text-left text-sm ${picked === index ? "border-primary bg-primary/10" : ""}`}
                                onClick={() =>
                                  setChoices((c) => ({ ...c, [key]: index }))
                                }
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                          {picked !== undefined && (
                            <p role="status" className="mt-3 text-sm leading-6">
                              <strong>
                                {picked === q.answer
                                  ? "Correct. "
                                  : `Answer: ${q.options[q.answer]}. `}
                              </strong>
                              {q.explain}
                            </p>
                          )}
                        </fieldset>
                      );
                    })}
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
      <p role="status" className="mt-4">
        {message}
      </p>
    </>
  );
}

export function IllumshipPanel({ state }: { state: CitySnapshot }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);
  const [interaction, setInteraction] = useState("Ready for a study break.");
  return (
    <>
      <div
        className={`${card} mb-6 flex flex-wrap items-center justify-between gap-5`}
      >
        <div>
          <Crown className="text-primary mb-3 size-8" />
          <h2 className="text-2xl font-black">
            {state.vip
              ? "Your Illumship is active"
              : "Illumship uses your existing Premium plan"}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
            Ad-free game screens, exotic companion cards and unlimited companion
            style previews. Tiggy AI keeps its existing 200-message daily
            allowance; style previews run locally and do not use AI credits.
          </p>
        </div>
        <Link className={button} href={state.vip ? "/billing" : "/premium"}>
          {state.vip ? "Manage membership" : "View Premium pricing"}
        </Link>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {assets
          .filter((a) => a.kind === "pet")
          .map((a) => {
            const owned = state.holdings.some((h) => h.asset_id === a.id);
            return (
              <article className={card} key={a.id}>
                <div
                  className="grid h-44 place-items-center rounded-2xl text-7xl transition-colors"
                  style={{
                    backgroundColor: `hsl(${(seed * 47 + (a.id === "moon-fox" ? 220 : 280)) % 360} 65% 88%)`,
                  }}
                >
                  <span
                    className={
                      interaction.includes("celebrates") ? "animate-bounce" : ""
                    }
                  >
                    {a.id === "moon-fox" ? "🦊" : "🐉"}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-black">{a.name}</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  {a.description}
                </p>
                <p className="mt-3 font-bold">
                  {a.price} Clout · Illumship required
                </p>
                {!owned ? (
                  <button
                    className={`${button} mt-4`}
                    disabled={
                      !state.ready ||
                      !state.vip ||
                      pending ||
                      state.clout < a.price
                    }
                    onClick={() =>
                      start(async () => {
                        const r = await cityAction("city_trade", {
                          p_asset: a.id,
                          p_units: 1,
                        });
                        setMessage(
                          r.error ?? "Companion added to your collection.",
                        );
                        router.refresh();
                      })
                    }
                  >
                    Adopt companion
                  </button>
                ) : (
                  <>
                    <p className="mt-3 text-sm font-bold">
                      Owned · companion card
                    </p>
                    {state.vip && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          className={button}
                          onClick={() => setSeed((n) => n + 1)}
                        >
                          Generate a style preview
                        </button>
                        <button
                          className="min-h-11 rounded-xl border px-4 text-sm font-bold"
                          onClick={() =>
                            setInteraction(
                              `${a.name} celebrates your learning!`,
                            )
                          }
                        >
                          Celebrate
                        </button>
                        <button
                          className="min-h-11 rounded-xl border px-4 text-sm font-bold"
                          onClick={() =>
                            setInteraction(
                              `${a.name} says: “One question at a time. You've got this.”`,
                            )
                          }
                        >
                          Study encouragement
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
      </div>
      <p role="status" aria-live="polite" className="mt-4">
        {message ?? interaction}
      </p>
      <p className="text-muted-foreground mt-4 text-xs">
        Companions currently live on these cards; they do not follow your
        character around the 3D world. Preview colours reset when you leave.
      </p>
    </>
  );
}
