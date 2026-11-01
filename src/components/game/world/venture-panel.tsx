"use client";
import { useEffect, useState, useTransition } from "react";

import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  Coffee,
  Palette,
  Store,
  Wrench,
  X,
} from "lucide-react";

import { ventureAction } from "@/app/games/venture-actions";
import {
  VENTURE_SECTORS,
  VENTURE_STAFF,
  ventureOrder,
  type Venture,
} from "@/game/core/ventures";
import { browserSupabase } from "@/lib/supabase-browser";
export function VenturePanel({
  meId,
  onClose,
}: {
  meId: string;
  onClose?: () => void;
}) {
  const [v, setV] = useState<Venture | null>(null),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [sector, setSector] = useState("cafe"),
    [name, setName] = useState(""),
    [answer, setAnswer] = useState(""),
    [tab, setTab] = useState("orders"),
    [pending, start] = useTransition();
  useEffect(() => {
    let alive = true;
    const sb = browserSupabase();
    if (!sb) {
      setError("Sign in to open Venture.");
      setLoaded(true);
      return;
    }
    void sb
      .from("city_ventures")
      .select("*")
      .eq("user_id", meId)
      .maybeSingle()
      .then((r) => {
        if (!alive) return;
        setLoaded(true);
        if (r.error)
          setError("Venture could not load. Close and reopen it to retry.");
        else setV(r.data as Venture | null);
      });
    return () => {
      alive = false;
    };
  }, [meId]);
  function act(action: "start" | "hire" | "upgrade" | "order", staff?: string) {
    start(async () => {
      setError("");
      setNotice("");
      try {
        const r = await ventureAction(action, {
          sector,
          name,
          staff,
          answer: answer.trim() ? Number(answer) : undefined,
          revision: v?.revision,
        });
        if (r.error) setError(r.error);
        else if (r.data) {
          const profit =
            action === "order" && v
              ? ventureOrder(v).revenue - ventureOrder(v).cost
              : 0;
          setV(r.data);
          setAnswer("");
          setNotice(
            action === "order"
              ? `Order delivered. +${profit} venture credits profit.`
              : action === "hire"
                ? "Your new teammate is ready for work."
                : action === "upgrade"
                  ? "Workspace upgraded. You can take bigger orders."
                  : "Your business is open. You have 200 starter venture credits.",
          );
        }
      } catch {
        setError(
          "Couldn't connect. Your last saved business is safe. Try again.",
        );
      }
    });
  }
  const order = v ? ventureOrder(v) : null;
  return (
    <section className="overflow-hidden rounded-[1.75rem] bg-[#f7f4ec] text-[#1c3931] [color-scheme:light]">
      <header className="flex items-center gap-3 border-b border-[#ded9c9] px-5 py-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#284e40] text-[#ebd49a]">
          <Store />
        </span>
        <div className="flex-1">
          <p className="text-[10px] font-bold tracking-[0.22em] text-[#786f56] uppercase">
            Venture · City business club
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            {v?.name ?? "Your first business starts here."}
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close Venture"
            className="grid size-11 place-items-center"
          >
            <X />
          </button>
        )}
      </header>
      <div className="p-5">
        <p role="status" aria-live="polite" className="mb-3 text-sm">
          {notice}
        </p>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-[#f7e3df] p-3 text-sm text-[#963d30]"
          >
            {error}
          </p>
        )}
        {!loaded ? (
          <p className="py-12 text-center">Opening your business ledger…</p>
        ) : !v ? (
          <>
            <p className="mb-5 max-w-xl text-sm leading-6 text-[#637068]">
              Start small, hire city characters and work through customer
              orders. Practise pricing, costs and profit with 200 starter
              credits.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {VENTURE_SECTORS.map((s, i) => {
                const Icon = [Coffee, Palette, Wrench][i];
                return (
                  <button
                    key={s.id}
                    onClick={() => setSector(s.id)}
                    aria-pressed={sector === s.id}
                    className={`rounded-2xl border-2 p-5 text-left ${sector === s.id ? "border-[#42745e] bg-[#e4eee6]" : "border-transparent bg-white"}`}
                  >
                    <Icon className="mb-4 size-7" style={{ color: s.colour }} />
                    <p className="font-bold">{s.name}</p>
                    <p className="mt-2 text-xs leading-5 text-[#637068]">
                      {s.description}
                    </p>
                  </button>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act("start");
              }}
              className="mt-5 flex flex-wrap items-end gap-3"
            >
              <label className="min-w-0 flex-1 text-sm font-semibold">
                Business name
                <input
                  required
                  minLength={2}
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 block min-h-12 w-full rounded-xl border border-[#d8d7cd] bg-white px-4"
                  placeholder="Give your business a name"
                />
              </label>
              <button
                disabled={pending}
                className="min-h-12 rounded-full bg-[#284e40] px-6 text-sm font-bold text-white disabled:opacity-50"
              >
                {pending ? "Opening…" : "Open your business"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Venture credits", v.credits],
                ["Revenue", v.revenue],
                ["Costs", v.costs],
                ["Orders delivered", v.orders_completed],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#e1dece] bg-white p-4"
                >
                  <p className="text-[10px] font-bold tracking-wider text-[#786f56] uppercase">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {Number(value).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <nav
              aria-label="Business sections"
              className="my-5 flex gap-2 overflow-x-auto"
            >
              {[
                ["orders", "Customer orders"],
                ["team", "Your team"],
                ["workspace", "Workspace"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  aria-pressed={tab === id}
                  className={`min-h-11 rounded-full px-4 text-sm font-semibold whitespace-nowrap ${tab === id ? "bg-[#284e40] text-white" : "bg-white"}`}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab === "orders" && order && (
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
                <article className="rounded-2xl bg-white p-5">
                  <p className="text-xs font-semibold text-[#786f56]">
                    Order #{v.orders_completed + 1} · {order.sector.customer}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold">
                    “We need {order.quantity} {order.sector.unit}.”
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#637068]">
                    {v.sector === "cafe"
                      ? "Our community group is meeting at Venture Yard. Can your café prepare the lunch boxes?"
                      : v.sector === "studio"
                        ? "We’re organising a local music night. Can your team produce the posters?"
                        : "Our cycling group needs its bikes ready for a weekend ride. Can you take the job?"}
                  </p>
                  <dl className="mt-5 space-y-2 text-sm">
                    {[
                      ["Price per unit", order.sector.price],
                      ["Supply cost per unit", order.sector.cost],
                      ["Team wages this order", order.wages],
                      ["Total supplies + wages", order.cost],
                    ].map(([l, n]) => (
                      <div key={l} className="flex justify-between gap-3">
                        <dt>{l}</dt>
                        <dd className="font-bold">{n} credits</dd>
                      </div>
                    ))}
                  </dl>
                </article>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    act("order");
                  }}
                  className="rounded-2xl bg-[#e4eee6] p-5"
                >
                  <BriefcaseBusiness className="size-7 text-[#42745e]" />
                  <h3 className="mt-3 text-xl font-semibold">
                    Make the numbers work.
                  </h3>
                  <p className="mt-3 text-sm leading-6">
                    Revenue is {order.quantity} × {order.sector.price} ={" "}
                    <strong>{order.revenue} credits</strong>. After supplies and
                    wages, how much profit will this order earn?
                  </p>
                  <label className="mt-4 block text-sm font-bold">
                    Profit in venture credits
                    <input
                      required
                      type="number"
                      min={0}
                      step={1}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      className="mt-2 min-h-12 w-full rounded-xl border border-[#b9cebd] bg-white px-4"
                    />
                  </label>
                  <p className="mt-2 text-xs text-[#637068]">
                    Profit = revenue − supplies − wages. You need {order.cost}{" "}
                    credits available to fulfil this order.
                  </p>
                  <button
                    disabled={
                      pending || !answer.trim() || v.credits < order.cost
                    }
                    className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#284e40] px-5 text-sm font-bold text-white disabled:opacity-40"
                  >
                    {pending ? "Delivering…" : "Fulfil order & save profit"}
                    <ArrowUpRight className="size-4" />
                  </button>
                  <p className="mt-3 text-xs text-[#637068]">
                    Up to 20 customer orders per day.
                  </p>
                </form>
              </div>
            )}
            {tab === "team" && (
              <div className="grid gap-3 sm:grid-cols-3">
                {VENTURE_STAFF.map((s) => (
                  <article key={s.id} className="rounded-2xl bg-white p-5">
                    <span className="grid size-12 place-items-center rounded-full bg-[#e4eee6] text-xl font-bold">
                      {s.name[0]}
                    </span>
                    <h3 className="mt-3 font-bold">{s.name}</h3>
                    <p className="text-xs font-semibold text-[#786f56]">
                      {s.role} · city character
                    </p>
                    <p className="mt-3 text-sm leading-6">{s.description}</p>
                    <p className="mt-2 text-xs text-[#637068]">
                      50 credits to hire · 4 credits per order in wages.
                    </p>
                    <button
                      disabled={
                        pending || v.staff.includes(s.id) || v.credits < 50
                      }
                      onClick={() => act("hire", s.id)}
                      className="mt-4 min-h-11 w-full rounded-full bg-[#284e40] px-3 text-sm font-bold text-white disabled:opacity-40"
                    >
                      {v.staff.includes(s.id) ? (
                        <>
                          <Check className="mr-1 inline size-4" />
                          On your team
                        </>
                      ) : (
                        "Hire teammate"
                      )}
                    </button>
                  </article>
                ))}
              </div>
            )}
            {tab === "workspace" && (
              <article className="rounded-2xl bg-white p-5">
                <h3 className="text-xl font-semibold">
                  Workspace level {v.level}/5
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#637068]">
                  Better equipment lets you handle one more unit in each
                  customer order. Visit the café, studio and repair benches at
                  Venture Yard to meet the team.
                </p>
                <div className="my-4 flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`h-3 flex-1 rounded-full ${n <= v.level ? "bg-[#42745e]" : "bg-[#e5e9e2]"}`}
                    />
                  ))}
                </div>
                <button
                  disabled={
                    pending || v.level >= 5 || v.credits < v.level * 100
                  }
                  onClick={() => act("upgrade")}
                  className="min-h-12 rounded-full bg-[#284e40] px-5 text-sm font-bold text-white disabled:opacity-40"
                >
                  {v.level >= 5
                    ? "Fully upgraded"
                    : `Upgrade · ${v.level * 100} credits`}
                </button>
              </article>
            )}
          </>
        )}
        <p className="mt-6 border-t border-[#ded9c9] pt-4 text-xs leading-5 text-[#786f56]">
          A fictional business simulation. Venture credits have no cash value
          and are separate from your Clout. Your business saves to your
          IlluminatED account.
        </p>
      </div>
    </section>
  );
}
