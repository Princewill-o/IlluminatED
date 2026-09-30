import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import type { Metadata } from "next";

import { Crumbs } from "@/components/kit";
import { timeAgo } from "@/components/social/util";
import { ActionButton } from "@/components/tutoring/action-button";
import { MessageForm } from "@/components/tutoring/message-form";
import { getAccount, isTutor } from "@/lib/account/server";
import {
  STATUS_LABELS,
  formatPrice,
  helpLabel,
  hoursLabel,
  speedLabel,
} from "@/lib/tutoring";
import { getRequest } from "@/lib/tutoring-server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tutor request" };
export const dynamic = "force-dynamic";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const account = await getAccount();
  if (!account?.profile)
    redirect(`/sign-in?next=${encodeURIComponent(`/tutors/requests/${id}`)}`);
  const n = Number(id);
  if (!Number.isInteger(n)) notFound();
  const data = await getRequest(n);
  if (!data) notFound();
  const { request: r, messages, guardianEmail } = data;

  const isStudent = r.studentId === account.id;
  const isAssigned = r.tutorId === account.id;
  const moderator = account.profile.role === "moderator";
  const canMessage =
    (isStudent || isAssigned) &&
    (r.status === "open" || r.status === "matched");
  const waitingGuardian =
    r.needsGuardian && !r.guardianOk && r.status === "open";
  const back = `/tutors/requests/${r.id}`;

  return (
    <div className="container py-10 lg:py-14">
      <div className="max-w-4xl">
        <Crumbs
          items={[
            isStudent
              ? { label: "Dashboard", href: "/dashboard" }
              : { label: "Tutor desk", href: "/tutors/desk" },
            { label: `Request ${r.id}` },
          ]}
        />
        {sp.new && isStudent && (
          <p
            role="status"
            className="border-l-success mb-8 border-l-2 py-1 pl-4 text-sm"
          >
            Request sent.{" "}
            {waitingGuardian
              ? "We'll contact your parent or guardian, then a tutor can take it on."
              : `A tutor should take it on by ${when(r.matchBy)}.`}
          </p>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl tracking-tight md:text-4xl">
              {helpLabel(r.helpType)}: {r.subject}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {isStudent ? "You asked" : `Asked by ${r.student ?? "a learner"}`}{" "}
              {timeAgo(r.createdAt)}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              r.status === "matched" && "border-primary text-primary",
              r.status === "completed" && "border-success text-success",
            )}
          >
            {STATUS_LABELS[r.status]}
          </span>
        </div>

        <dl className="mt-8 grid border-y text-sm sm:grid-cols-2">
          {[
            ["Topic", r.topic ?? "Not given"],
            [
              "Speed",
              `${speedLabel(r.speed)} · tutor replies within ${hoursLabel(r.replyHours)}`,
            ],
            ["Price", `${formatPrice(r.pricePence)} (not charged online)`],
            [
              r.status === "open" ? "Tutor by" : "Tutor",
              r.status === "open"
                ? when(r.matchBy)
                : (r.tutor ?? "Not assigned"),
            ],
            ["When they're free", r.availability ?? "Not given"],
            [
              "Parent or guardian",
              !r.needsGuardian
                ? "Not needed (18 or over)"
                : r.guardianOk
                  ? "Confirmed"
                  : "Waiting for our team to contact them",
            ],
          ].map(([k, v]) => (
            <div
              key={k}
              className="grid gap-1 border-b py-3.5 sm:grid-cols-[9rem_1fr] sm:pr-6 sm:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="details-title" className="mt-8">
          <h2 id="details-title" className="sr-only">
            Details
          </h2>
          <p className="leading-relaxed whitespace-pre-line">{r.details}</p>
        </section>

        {moderator && guardianEmail && (
          <div className="bg-muted/50 mt-8 rounded-md border p-4 text-sm">
            <p>
              <span className="font-medium">Guardian email:</span>{" "}
              {guardianEmail}
            </p>
            {waitingGuardian && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <ActionButton
                  id={r.id}
                  action="confirm-guardian"
                  back={back}
                  primary
                >
                  Mark guardian as confirmed
                </ActionButton>
                <span className="text-muted-foreground text-xs">
                  Only after you've contacted them and they've agreed.
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {!isStudent &&
            isTutor(account) &&
            r.status === "open" &&
            (waitingGuardian ? (
              <p className="text-muted-foreground text-sm">
                You can take this on once a parent or guardian is confirmed.
              </p>
            ) : (
              <ActionButton id={r.id} action="claim" back={back} primary>
                Take this request
              </ActionButton>
            ))}
          {(isStudent || isAssigned) && r.status === "matched" && (
            <ActionButton id={r.id} action="complete" back={back}>
              Mark as done
            </ActionButton>
          )}
          {isAssigned && r.status === "matched" && (
            <ActionButton id={r.id} action="release" back="/tutors/desk">
              Hand back to other tutors
            </ActionButton>
          )}
          {isStudent && (r.status === "open" || r.status === "matched") && (
            <ActionButton id={r.id} action="cancel" back={back} danger>
              Cancel request
            </ActionButton>
          )}
        </div>

        <section
          aria-labelledby="msgs-title"
          className="border-foreground/80 mt-12 border-t pt-6"
        >
          <h2 id="msgs-title" className="text-2xl tracking-tight">
            Messages
          </h2>
          {messages.length ? (
            <ol className="mt-6 space-y-6">
              {messages.map((m) => {
                const mine = m.senderId === account.id;
                return (
                  <li key={m.id} className={cn("max-w-2xl", mine && "ml-auto")}>
                    <p className="text-muted-foreground mb-1.5 text-xs">
                      <span className="text-foreground font-medium">
                        {mine ? "You" : (m.sender ?? "Deleted account")}
                      </span>
                      {m.senderRole === "tutor" && !mine && " · Tutor"}
                      {m.senderRole === "moderator" &&
                        " · IlluminatED team"} · {timeAgo(m.createdAt)}
                    </p>
                    <p
                      className={cn(
                        "rounded-lg border px-4 py-3 leading-relaxed whitespace-pre-line",
                        mine && "bg-primary/5 border-primary/20",
                      )}
                    >
                      {m.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-muted-foreground mt-4 text-sm">
              {isStudent
                ? "No messages yet. You can add more detail here while you wait for a tutor."
                : "No messages yet."}
            </p>
          )}
          <div className="mt-8">
            {canMessage ? (
              <MessageForm requestId={r.id} />
            ) : (
              <p className="text-muted-foreground text-sm">
                {r.status === "open" && !isStudent
                  ? "Take the request to message this learner."
                  : "This request is closed, so messages are turned off."}
              </p>
            )}
          </div>
          <p className="text-muted-foreground mt-8 text-xs leading-relaxed">
            Keep all contact on IlluminatED. Email addresses and phone numbers
            are blocked, and our team can review messages if there's a concern.
            If anything makes you uncomfortable, see{" "}
            <Link
              href="/social/guidelines#help"
              className="text-primary underline underline-offset-4"
            >
              who to talk to
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
