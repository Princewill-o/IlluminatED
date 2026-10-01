import Link from "next/link";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { loadPayments } from "../_lib/flow";

import { Empty, PageHeader, Section } from "@/components/kit";
import { timeAgo } from "@/components/social/util";
import { ActionButton } from "@/components/tutoring/action-button";
import { getAccount, isTutor } from "@/lib/account/server";
import { paymentsEnabled } from "@/lib/stripe";
import {
  STATUS_LABELS,
  formatPrice,
  helpLabel,
  speedLabel,
} from "@/lib/tutoring";
import { type TutorRequest, loadDesk } from "@/lib/tutoring-server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tutor desk" };
export const dynamic = "force-dynamic";

function due(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { text: "Overdue", late: true };
  const h = Math.round(ms / 36e5);
  return {
    text:
      h < 1
        ? "Due within the hour"
        : h < 48
          ? `Due in ${h}h`
          : `Due in ${Math.round(h / 24)} days`,
    late: h < 2,
  };
}

function Row({ r, children }: { r: TutorRequest; children?: React.ReactNode }) {
  const d = due(r.matchBy);
  return (
    <li className="grid gap-x-6 gap-y-2 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <Link
          href={`/tutors/requests/${r.id}`}
          className="hover:text-primary font-semibold"
        >
          {helpLabel(r.helpType)}: {r.subject}
          {r.topic && <span className="font-normal"> · {r.topic}</span>}
        </Link>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {r.student ?? "Learner"} · {speedLabel(r.speed)} ·{" "}
          {formatPrice(r.pricePence)} ·{" "}
          {r.status === "open" ? (
            <span className={cn(d.late && "text-destructive font-medium")}>
              {d.text}
            </span>
          ) : (
            <>
              {STATUS_LABELS[r.status]} · last message{" "}
              {timeAgo(r.lastMessageAt)}
            </>
          )}
        </p>
        <p className="text-muted-foreground mt-1 line-clamp-2 max-w-2xl text-sm">
          {r.details}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </li>
  );
}

export default async function DeskPage() {
  const account = await getAccount();
  if (!account?.profile) redirect("/sign-in?next=/tutors/desk");
  if (!isTutor(account))
    return (
      <div className="container max-w-2xl py-16">
        <h1 className="text-3xl tracking-tight">Tutor desk</h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          This page is for IlluminatED tutors. If you'd like to tutor with us,{" "}
          <Link
            href="/tutors/apply"
            className="text-primary underline underline-offset-4"
          >
            apply to become a tutor
          </Link>
          .
        </p>
      </div>
    );
  const moderator = account.profile.role === "moderator";
  const { open, mine, guardians } = await loadDesk(account.id, moderator);
  const claimable = open.filter((r) => r.studentId !== account.id);
  const active = mine.filter((r) => r.status === "matched");
  const done = mine.filter((r) => r.status === "completed");
  const payments = paymentsEnabled
    ? await loadPayments(claimable.map((r) => r.id))
    : new Map<number, { paidAt: string | null; refundedAt: string | null }>();
  const unpaid = (id: number) => {
    const p = payments.get(id);
    return paymentsEnabled && (!p?.paidAt || Boolean(p.refundedAt));
  };

  return (
    <>
      <PageHeader
        title="Tutor desk"
        intro="Take requests that match your subjects, keep to the reply times, and keep all contact on IlluminatED."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Tutor desk" },
        ]}
      >
        {moderator && (
          <Link
            href="/tutors/applications"
            className="hover:bg-muted inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
          >
            Tutor applications
          </Link>
        )}
      </PageHeader>
      {moderator && (
        <Section
          id="guardians"
          title="Waiting for a parent or guardian"
          intro="We email each parent or guardian a consent link. If they don't respond, contact them yourself and confirm here. Tutors can't see these requests until consent is given."
          rule={false}
        >
          {guardians.length ? (
            <ul className="divide-y border-y">
              {guardians.map(({ request, email }) => (
                <Row key={request.id} r={request}>
                  <span className="text-sm">{email ?? "No email saved"}</span>
                  <ActionButton
                    id={request.id}
                    action="confirm-guardian"
                    back="/tutors/desk"
                    primary
                  >
                    Confirm
                  </ActionButton>
                </Row>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Nothing waiting.</p>
          )}
        </Section>
      )}
      <Section id="active" title="Your learners" rule={moderator}>
        {active.length ? (
          <ul className="divide-y border-y">
            {active.map((r) => (
              <Row key={r.id} r={r}>
                <Link
                  href={`/tutors/requests/${r.id}`}
                  className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-semibold"
                >
                  Open
                </Link>
              </Row>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            You haven't taken any requests yet.
          </p>
        )}
      </Section>
      <Section id="open" title="Open requests" intro="Most urgent first.">
        {claimable.length ? (
          <ul className="divide-y border-y">
            {claimable.map((r) => (
              <Row key={r.id} r={r}>
                {r.needsGuardian && !r.guardianOk ? (
                  <span className="text-muted-foreground text-sm">
                    Waiting for guardian
                  </span>
                ) : unpaid(r.id) ? (
                  <span className="text-muted-foreground text-sm">
                    Waiting for payment
                  </span>
                ) : (
                  <ActionButton
                    id={r.id}
                    action="claim"
                    back={`/tutors/requests/${r.id}`}
                    primary
                  >
                    Take it
                  </ActionButton>
                )}
              </Row>
            ))}
          </ul>
        ) : (
          <Empty title="No open requests">New requests will appear here.</Empty>
        )}
      </Section>
      {done.length > 0 && (
        <Section id="done" title="Completed" className="pb-20">
          <ul className="divide-y border-y">
            {done.slice(0, 20).map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
