import Link from "next/link";

import { Check, Clock } from "lucide-react";
import type { Metadata } from "next";

import { Note, PageHeader, Section } from "@/components/kit";
import { Tiggy } from "@/components/tiggy";
import { requireAccount } from "@/lib/account/server";
import { openBillingPortal, startPremiumCheckout } from "@/lib/premium-actions";
import { getSupabase } from "@/lib/social/server";
import { premiumEnabled } from "@/lib/stripe";
import { PREMIUM_PRICE_LABEL, TIGGY_PLANS } from "@/lib/tiggy";
import { getTiggyStatus } from "@/lib/tiggy-server";

export const metadata: Metadata = {
  title: "Premium",
  description:
    "IlluminatED Premium: more Ask Tiggy messages, full worked solutions and Tiggy's stronger model. Cancel any time.",
};
export const dynamic = "force-dynamic";

type Row = {
  label: string;
  free: string | boolean;
  premium: string | boolean;
  soon?: boolean;
};

const ROWS: Row[] = [
  {
    label: "Ask Tiggy messages",
    free: `${TIGGY_PLANS.free.perDay} a day`,
    premium: `${TIGGY_PLANS.premium.perDay} a day`,
  },
  {
    label: "Answers",
    free: "Short answers, hints first",
    premium: "Longer, more detailed answers",
  },
  { label: "Full worked solutions on request", free: false, premium: true },
  { label: "Tiggy's stronger AI model", free: false, premium: true },
  {
    label: "Conversation memory",
    free: `Last ${TIGGY_PLANS.free.history} messages`,
    premium: `Last ${TIGGY_PLANS.premium.history} messages`,
  },
  {
    label: "Topics, quizzes, flashcards, planner and forum",
    free: true,
    premium: true,
  },
  {
    label: "Personalised revision plan generator",
    free: false,
    premium: "Coming soon",
    soon: true,
  },
  {
    label: "Priority tutor matching",
    free: false,
    premium: "Coming soon",
    soon: true,
  },
];

function Cell({ v, soon }: { v: string | boolean; soon?: boolean }) {
  if (v === true)
    return (
      <>
        <Check className="text-success inline size-4" aria-hidden />
        <span className="sr-only">Included</span>
      </>
    );
  if (v === false)
    return (
      <span className="text-muted-foreground">
        <span aria-hidden>–</span>
        <span className="sr-only">Not included</span>
      </span>
    );
  return soon ? (
    <span className="text-muted-foreground inline-flex items-center gap-1">
      <Clock className="size-3.5" aria-hidden />
      {v}
    </span>
  ) : (
    <>{v}</>
  );
}

const ERRORS: Record<string, string> = {
  permission:
    "Please tick the box to confirm a parent or guardian has agreed before you upgrade.",
  waiver:
    "Please tick the box to confirm you'd like Premium to start straight away.",
  checkout: "We couldn't start the payment. Please try again in a moment.",
  portal:
    "We couldn't open subscription settings. Please try again in a moment.",
};

export default async function PremiumPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cancelled?: string }>;
}) {
  const account = await requireAccount("/premium");
  const { error, cancelled } = await searchParams;
  const sb = await getSupabase();
  const [status, subResult] = await Promise.all([
    sb ? getTiggyStatus(sb) : null,
    sb
      ? sb
          .from("subscriptions")
          .select("status, current_period_end, stripe_customer_id")
          .eq("user_id", account.id)
          .maybeSingle()
      : null,
  ]);
  const sub = subResult?.data as {
    status: string;
    current_period_end: string | null;
    stripe_customer_id: string | null;
  } | null;
  const isPremium = status?.plan === "premium";
  const under18 = account.details.ageBand !== "18+";
  const renews = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/London",
      })
    : null;

  return (
    <>
      <PageHeader
        title="IlluminatED Premium"
        intro="Everything on IlluminatED stays free. Premium gives Ask Tiggy more messages, full worked solutions and a stronger model."
        crumbs={[{ label: "Home", href: "/" }, { label: "Premium" }]}
        aside={<Tiggy action="graduate" className="w-32 lg:w-36" />}
      />

      <Section id="plans" title="Free and Premium" rule={false}>
        {(error && ERRORS[error]) || cancelled ? (
          <p
            role="alert"
            className="bg-accent mb-6 max-w-3xl rounded-lg px-4 py-3 text-sm"
          >
            {error && ERRORS[error]
              ? ERRORS[error]
              : "No problem, you haven't been charged. You can upgrade any time."}
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">
              What's included in Free and Premium
            </caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-3 pr-4 font-medium">
                  <span className="sr-only">Feature</span>
                </th>
                <th scope="col" className="w-1/4 px-4 py-3 align-bottom">
                  <span className="block text-base font-semibold">Free</span>
                  <span className="text-muted-foreground font-normal">£0</span>
                </th>
                <th
                  scope="col"
                  className="bg-secondary/60 w-1/4 rounded-t-xl px-4 py-3 align-bottom"
                >
                  <span className="block text-base font-semibold">Premium</span>
                  <span className="text-muted-foreground font-normal">
                    {PREMIUM_PRICE_LABEL}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ROWS.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="py-3 pr-4 font-normal">
                    {r.label}
                  </th>
                  <td className="px-4 py-3">
                    <Cell v={r.free} />
                  </td>
                  <td className="bg-secondary/60 px-4 py-3">
                    <Cell v={r.premium} soon={r.soon} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="upgrade" title={isPremium ? "Your subscription" : "Upgrade"}>
        <div className="max-w-2xl">
          {isPremium ? (
            <>
              <p className="text-sm leading-relaxed">
                You're on <strong>Premium</strong>
                {sub?.status === "past_due"
                  ? ". Your last payment didn't go through, so please update your card."
                  : renews
                    ? `. It renews on ${renews} unless you cancel.`
                    : "."}{" "}
                Thanks for supporting IlluminatED!
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/tiggy"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold"
                >
                  Ask Tiggy
                </Link>
                {premiumEnabled && sub?.stripe_customer_id && (
                  <form action={openBillingPortal}>
                    <button
                      type="submit"
                      className="hover:bg-muted inline-flex h-11 items-center rounded-md border px-5 text-sm font-medium"
                    >
                      Manage subscription
                    </button>
                  </form>
                )}
              </div>
              <Note className="mt-6">
                Cancel any time in Manage subscription. You keep Premium until
                the end of the month you've paid for.
              </Note>
            </>
          ) : premiumEnabled ? (
            <form action={startPremiumCheckout} className="space-y-4">
              <p className="text-sm leading-relaxed">
                Premium is <strong>{PREMIUM_PRICE_LABEL}</strong>, paid monthly
                by card through Stripe. Cancel any time and you keep Premium
                until the end of the month you've paid for.
              </p>
              {under18 && (
                <div className="bg-secondary rounded-lg p-4 text-sm">
                  <p className="font-semibold">
                    Ask a parent or guardian first
                  </p>
                  <p className="text-muted-foreground mt-1">
                    As you're under 18, a parent or guardian should pay, or
                    agree to you paying, before you upgrade.
                  </p>
                  <label className="mt-3 flex items-start gap-2.5 font-medium">
                    <input
                      type="checkbox"
                      name="guardian"
                      required
                      className="accent-primary mt-0.5 size-4 shrink-0"
                    />
                    I have permission from my parent or guardian
                  </label>
                </div>
              )}
              <label className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="waiver"
                  required
                  className="accent-primary mt-0.5 size-4 shrink-0"
                />
                <span>
                  Start Premium straight away. I understand that once it starts
                  I lose my 14-day right to cancel for a refund of this
                  month&apos;s payment, but I can cancel any time to stop future
                  payments. See the{" "}
                  <Link
                    href="/terms#premium"
                    className="text-primary underline underline-offset-4"
                  >
                    Premium terms
                  </Link>
                  .
                </span>
              </label>
              <button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold"
              >
                Upgrade to Premium
              </button>
              {sub?.stripe_customer_id && (
                <p className="text-muted-foreground text-xs">
                  Looking for old invoices?{" "}
                  <button
                    type="submit"
                    formAction={openBillingPortal}
                    formNoValidate
                    className="underline underline-offset-4"
                  >
                    Open billing settings
                  </button>
                </p>
              )}
            </form>
          ) : (
            <p className="text-muted-foreground text-sm leading-relaxed">
              Premium isn't available to buy yet. Everything else on
              IlluminatED, including{" "}
              <Link
                href="/tiggy"
                className="text-primary underline underline-offset-4"
              >
                Ask Tiggy
              </Link>{" "}
              with {TIGGY_PLANS.free.perDay} free messages a day, is free to
              use.
            </p>
          )}
          <Note className="mt-8">
            Tiggy is an AI and can make mistakes. Premium doesn&apos;t change
            that, so check important things with your teacher or the
            specification. Tiggy never writes coursework or NEA for you, on any
            plan.
          </Note>
        </div>
      </Section>
    </>
  );
}
