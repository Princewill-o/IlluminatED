import Link from "next/link";

import type { Metadata } from "next";

import { respondAsGuardian } from "./actions";

import { getSupabase } from "@/lib/social/server";
import { formatPrice, helpLabel, speedLabel } from "@/lib/tutoring";

export const metadata: Metadata = {
  title: "Parent or guardian consent",
  robots: { index: false, follow: false },
  // Keep the token in the address bar from leaking to other sites.
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

const RESULTS: Record<string, { title: string; text: string }> = {
  accepted: {
    title: "Thank you",
    text: "You've given consent. A checked tutor can now take on the request. All contact happens on IlluminatED, and our team can review messages if there's a concern.",
  },
  declined: {
    title: "Request cancelled",
    text: "You didn't give consent, so we've cancelled the request. No tutor will contact the learner about it.",
  },
  expired: {
    title: "This link has expired",
    text: "Consent links last 7 days. The learner can send a new request, or you can contact us.",
  },
  closed: {
    title: "This request is closed",
    text: "The request has already been cancelled or finished, so there's nothing to do.",
  },
  invalid: {
    title: "This link doesn't work",
    text: "It may have been used already. Each link works once.",
  },
  error: {
    title: "Something went wrong",
    text: "We couldn't record your answer. Please try the link in the email again.",
  },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container max-w-2xl py-16">
      {children}
      <p className="text-muted-foreground mt-10 text-sm leading-relaxed">
        Questions or worries? Read how we keep learners{" "}
        <Link
          href="/safeguarding"
          className="text-primary underline underline-offset-4"
        >
          safe on IlluminatED
        </Link>
        .
      </p>
    </div>
  );
}

export default async function GuardianConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; result?: string }>;
}) {
  const sp = await searchParams;

  if (sp.result) {
    const r = RESULTS[sp.result] ?? RESULTS.error;
    return (
      <Shell>
        <h1 className="text-3xl tracking-tight">{r.title}</h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">{r.text}</p>
      </Shell>
    );
  }

  const token = sp.token ?? "";
  const sb = await getSupabase();
  const { data } =
    sb && token.length >= 32 && token.length <= 200
      ? await sb.rpc("guardian_request_summary", { token })
      : { data: null };
  const req = Array.isArray(data) ? data[0] : null;

  if (!req) {
    const r = RESULTS.invalid;
    return (
      <Shell>
        <h1 className="text-3xl tracking-tight">{r.title}</h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">{r.text}</p>
      </Shell>
    );
  }
  if (req.expired || req.request_status !== "open" || req.guardian_ok) {
    const r = req.expired
      ? RESULTS.expired
      : req.guardian_ok
        ? RESULTS.accepted
        : RESULTS.closed;
    return (
      <Shell>
        <h1 className="text-3xl tracking-tight">{r.title}</h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">{r.text}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-3xl tracking-tight">
        Consent for tutoring on IlluminatED
      </h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        A learner under 18 gave your email as their parent or guardian when
        asking for help from a tutor. A tutor can't take the request on until
        you agree.
      </p>
      <dl className="mt-8 grid border-y text-sm">
        {[
          ["Subject", req.subject],
          ["Type of help", helpLabel(req.help_type)],
          ["Speed", speedLabel(req.speed)],
          ["Price", formatPrice(Number(req.price_pence))],
        ].map(([k, v]) => (
          <div
            key={k}
            className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[9rem_1fr]"
          >
            <dt className="text-muted-foreground">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <ul className="text-muted-foreground mt-6 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
        <li>
          Tutors are checked by our team, including an enhanced DBS check.
        </li>
        <li>
          All contact happens in messages on IlluminatED. Email addresses and
          phone numbers are blocked.
        </li>
        <li>Our team can review messages if there's a concern.</li>
      </ul>
      <form action={respondAsGuardian} className="mt-8 flex flex-wrap gap-3">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          name="answer"
          value="yes"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold"
        >
          I give consent
        </button>
        <button
          type="submit"
          name="answer"
          value="no"
          className="border-destructive/40 text-destructive hover:bg-destructive/5 inline-flex h-11 items-center rounded-md border px-5 text-sm font-medium"
        >
          I don't consent
        </button>
      </form>
    </Shell>
  );
}
