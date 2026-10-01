import Link from "next/link";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { moderate } from "@/app/social/actions";
import {
  addBlockedTerm,
  dismissReport,
  removeBlockedTerm,
  setContactStatus,
  unbanMember,
} from "@/app/social/moderation/actions";
import { timeAgo } from "@/components/social/util";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/site";
import { REPORT_REASONS } from "@/lib/social/config";
import { moderationQueue } from "@/lib/social/data";
import {
  bannedMembers,
  blockedTerms,
  contactMessages,
  topicLabel,
  urgentReports,
} from "@/lib/social/moderation";
import { getViewer } from "@/lib/social/server";

export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false },
};

const reasonLabel = (r: string) =>
  REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

// Safeguarding first in the topic filter.
const TOPIC_ORDER: ContactTopic[] = [
  "safeguarding",
  ...CONTACT_TOPICS.map((t) => t.value).filter((t) => t !== "safeguarding"),
];

const linkBtn = "text-primary text-sm font-medium";
const dangerBtn = "text-destructive text-sm font-medium";

function Heading({
  id,
  children,
  count,
}: {
  id: string;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <h2
      id={id}
      className="flex scroll-mt-24 items-baseline gap-3 text-2xl tracking-tight"
    >
      {children}
      {count !== undefined && (
        <span className="text-muted-foreground text-base tabular-nums">
          {count}
        </span>
      )}
    </h2>
  );
}

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; show?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer?.profile?.role !== "moderator") redirect("/social");
  const sp = await searchParams;
  const topic = CONTACT_TOPICS.find((t) => t.value === sp.topic)?.value;
  const status = sp.show === "handled" ? "handled" : "new";

  const [items, urgent, inbox, terms, banned] = await Promise.all([
    moderationQueue(),
    urgentReports(),
    contactMessages({ topic, status }),
    blockedTerms(),
    bannedMembers(),
  ]);
  const inboxHref = (t?: string, s?: string) => {
    const q = new URLSearchParams();
    if (t) q.set("topic", t);
    if (s === "handled") q.set("show", "handled");
    const qs = q.toString();
    return `/social/moderation${qs ? `?${qs}` : ""}#inbox`;
  };
  const openTotal = Object.values(inbox.counts).reduce((a, b) => a + b, 0);

  return (
    <div className="container max-w-4xl py-10 lg:py-14">
      <h1 className="text-4xl tracking-tight">Moderation</h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        Urgent reports first, then everything else that's reported or hidden.
        Items with 3 or more reports are hidden automatically. Restoring or
        hiding an item closes its reports.
      </p>
      <nav
        aria-label="Moderation sections"
        className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm"
      >
        <a href="#urgent" className={linkBtn}>
          Urgent ({urgent.length})
        </a>
        <a href="#queue" className={linkBtn}>
          Reported and hidden ({items.length})
        </a>
        <a href="#inbox" className={linkBtn}>
          Messages ({openTotal})
        </a>
        <a href="#terms" className={linkBtn}>
          Blocked terms
        </a>
        <a href="#banned" className={linkBtn}>
          Banned members ({banned.length})
        </a>
      </nav>

      {/* Urgent */}
      <section aria-labelledby="urgent" className="mt-12">
        <Heading id="urgent" count={urgent.length}>
          Urgent
        </Heading>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Open reports that someone may be at risk, or that personal information
          was shared. Deal with these first. If someone may be in danger, follow
          the safeguarding procedure and contact the Designated Safeguarding
          Lead.
        </p>
        {urgent.length === 0 ? (
          <p className="text-muted-foreground mt-6 text-sm">
            No urgent reports.
          </p>
        ) : (
          <ul className="mt-6 border-t">
            {urgent.map((r) => (
              <li key={r.id} className="border-b py-6">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="bg-destructive text-destructive-foreground rounded px-2 py-0.5 font-semibold">
                    {reasonLabel(r.reason)}
                  </span>
                  <span className="text-muted-foreground">
                    {r.kind === "thread" ? "Thread" : "Reply"} by{" "}
                    {r.author ?? "deleted user"} · reported{" "}
                    {timeAgo(r.createdAt)}
                    {r.hidden && " · hidden"}
                  </span>
                </p>
                {r.threadId > 0 ? (
                  <Link
                    href={`/social/t/${r.threadId}${r.kind === "post" ? `#r${r.contentId}` : ""}`}
                    className="mt-2 block font-semibold hover:underline"
                  >
                    {r.title}
                  </Link>
                ) : (
                  <p className="mt-2 font-semibold">{r.title}</p>
                )}
                <p className="text-muted-foreground mt-1 line-clamp-4 text-sm whitespace-pre-line">
                  {r.body}
                </p>
                {r.note && (
                  <p className="mt-2 text-sm">
                    <span className="font-medium">Reporter's note:</span>{" "}
                    {r.note}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-4">
                  {(["hide", "restore"] as const).map((a) => (
                    <form key={a} action={moderate}>
                      <input type="hidden" name="kind" value={r.kind} />
                      <input type="hidden" name="id" value={r.contentId} />
                      <input
                        type="hidden"
                        name="authorId"
                        value={r.authorId ?? ""}
                      />
                      <input type="hidden" name="action" value={a} />
                      <button type="submit" className={linkBtn}>
                        {a === "hide" ? "Hide and close" : "Leave up and close"}
                      </button>
                    </form>
                  ))}
                  <form action={dismissReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className={linkBtn}>
                      Close this report only
                    </button>
                  </form>
                  {r.authorId && (
                    <form action={moderate}>
                      <input type="hidden" name="kind" value={r.kind} />
                      <input type="hidden" name="id" value={r.contentId} />
                      <input type="hidden" name="authorId" value={r.authorId} />
                      <input type="hidden" name="action" value="ban" />
                      <button type="submit" className={dangerBtn}>
                        Ban author
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Existing queue */}
      <section aria-labelledby="queue" className="mt-16">
        <Heading id="queue" count={items.length}>
          Reported and hidden
        </Heading>
        {items.length === 0 ? (
          <p className="text-muted-foreground mt-6 text-sm">
            Nothing needs reviewing.
          </p>
        ) : (
          <ul className="mt-6 border-t">
            {items.map((i) => (
              <li key={`${i.kind}${i.id}`} className="border-b py-6">
                <p className="text-muted-foreground text-xs">
                  {i.kind === "thread" ? "Thread" : "Reply"} ·{" "}
                  {i.author?.username ?? "deleted user"} ·{" "}
                  {timeAgo(i.createdAt)} · {i.reportCount}{" "}
                  {i.reportCount === 1 ? "report" : "reports"}{" "}
                  {i.hidden && (
                    <span className="text-destructive">· hidden</span>
                  )}
                </p>
                <Link
                  href={`/social/t/${i.threadId}${i.kind === "post" ? `#r${i.id}` : ""}`}
                  className="mt-1 block font-semibold hover:underline"
                >
                  {i.title}
                </Link>
                <p className="text-muted-foreground mt-1 line-clamp-3 text-sm whitespace-pre-line">
                  {i.body}
                </p>
                {i.reasons.length > 0 && (
                  <p className="mt-2 text-sm">
                    Reported for:{" "}
                    {[...new Set(i.reasons)].map(reasonLabel).join(", ")}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-4">
                  {(["restore", "hide", "delete", "ban"] as const).map((a) => (
                    <form key={a} action={moderate}>
                      <input type="hidden" name="kind" value={i.kind} />
                      <input type="hidden" name="id" value={i.id} />
                      <input
                        type="hidden"
                        name="authorId"
                        value={i.authorId ?? ""}
                      />
                      <input type="hidden" name="action" value={a} />
                      <button
                        type="submit"
                        className={
                          a === "delete" || a === "ban" ? dangerBtn : linkBtn
                        }
                      >
                        {a === "restore"
                          ? "Restore"
                          : a === "hide"
                            ? "Keep hidden"
                            : a === "delete"
                              ? "Delete"
                              : "Ban author"}
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Contact inbox */}
      <section aria-labelledby="inbox" className="mt-16">
        <Heading id="inbox" count={openTotal}>
          Contact messages
        </Heading>
        <p className="text-muted-foreground mt-2 text-sm">
          From the contact form. Reply by email, then mark the message handled.
        </p>
        <nav
          aria-label="Filter messages"
          className="mt-5 flex flex-wrap gap-2 text-sm"
        >
          {[undefined, ...TOPIC_ORDER].map((t) => {
            const active = t === topic;
            const n = t
              ? (inbox.counts[t] ?? 0)
              : Object.values(inbox.counts).reduce((a, b) => a + b, 0);
            return (
              <Link
                key={t ?? "all"}
                href={inboxHref(t, status)}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "bg-primary text-primary-foreground rounded-md px-3 py-1.5 font-medium"
                    : t === "safeguarding" && n > 0
                      ? "border-destructive text-destructive rounded-md border px-3 py-1.5 font-medium"
                      : "hover:bg-muted rounded-md border px-3 py-1.5"
                }
              >
                {t ? topicLabel(t) : "All"}{" "}
                <span className="tabular-nums opacity-80">{n}</span>
              </Link>
            );
          })}
        </nav>
        <p className="mt-3 text-sm">
          {status === "new" ? (
            <Link href={inboxHref(topic, "handled")} className={linkBtn}>
              Show handled messages
            </Link>
          ) : (
            <Link href={inboxHref(topic)} className={linkBtn}>
              Show new messages
            </Link>
          )}
        </p>
        {inbox.messages.length === 0 ? (
          <p className="text-muted-foreground mt-6 text-sm">
            {status === "new" ? "No new messages." : "No handled messages."}
          </p>
        ) : (
          <ul className="mt-6 border-t">
            {inbox.messages.map((m) => (
              <li key={m.id} className="border-b py-6">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span
                    className={
                      m.topic === "safeguarding"
                        ? "bg-destructive text-destructive-foreground rounded px-2 py-0.5 font-semibold"
                        : "rounded border px-2 py-0.5 font-medium"
                    }
                  >
                    {topicLabel(m.topic)}
                  </span>
                  <span className="text-muted-foreground">
                    {m.name ?? "No name"} ·{" "}
                    <a
                      href={`mailto:${m.email}`}
                      className="underline underline-offset-4"
                    >
                      {m.email}
                    </a>{" "}
                    · {m.signedIn ? "signed in" : "not signed in"} ·{" "}
                    {timeAgo(m.createdAt)}
                  </span>
                </p>
                <p className="mt-3 text-sm leading-relaxed break-words whitespace-pre-line">
                  {m.message}
                </p>
                <form action={setContactStatus} className="mt-3">
                  <input type="hidden" name="id" value={m.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={m.status === "new" ? "handled" : "new"}
                  />
                  <button type="submit" className={linkBtn}>
                    {m.status === "new" ? "Mark handled" : "Mark as new"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Blocked terms */}
      <section aria-labelledby="terms" className="mt-16">
        <Heading id="terms" count={terms.length}>
          Blocked terms
        </Heading>
        <p className="text-muted-foreground mt-2 text-sm">
          New threads and replies containing any of these (in any case) are
          rejected. Between 2 and 60 characters.
        </p>
        <form action={addBlockedTerm} className="mt-5 flex max-w-md gap-2">
          <label htmlFor="new-term" className="sr-only">
            Word or phrase to block
          </label>
          <input
            id="new-term"
            name="term"
            required
            minLength={2}
            maxLength={60}
            placeholder="Word or phrase"
            className="bg-card border-input focus-visible:ring-ring h-10 flex-1 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded-md px-4 text-sm font-semibold"
          >
            Add
          </button>
        </form>
        {terms.length === 0 ? (
          <p className="text-muted-foreground mt-6 text-sm">
            No blocked terms yet.
          </p>
        ) : (
          <ul className="mt-6 flex flex-wrap gap-2">
            {terms.map((t) => (
              <li
                key={t}
                className="flex items-center gap-2 rounded-md border py-1 pr-1 pl-3 text-sm"
              >
                <span className="font-mono">{t}</span>
                <form action={removeBlockedTerm}>
                  <input type="hidden" name="term" value={t} />
                  <button
                    type="submit"
                    className="text-destructive hover:bg-danger-soft rounded px-2 py-0.5 text-xs font-medium"
                    aria-label={`Remove ${t}`}
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Banned members */}
      <section aria-labelledby="banned" className="mt-16">
        <Heading id="banned" count={banned.length}>
          Banned members
        </Heading>
        <p className="text-muted-foreground mt-2 text-sm">
          Banned members can still sign in and read, but can't post, reply,
          report or message tutors.
        </p>
        {banned.length === 0 ? (
          <p className="text-muted-foreground mt-6 text-sm">
            Nobody is banned.
          </p>
        ) : (
          <ul className="mt-6 border-t">
            {banned.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b py-4"
              >
                <div>
                  <Link
                    href={`/social/u/${b.username}`}
                    className="font-semibold hover:underline"
                  >
                    {b.username}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    Joined{" "}
                    {new Date(b.joined).toLocaleDateString("en-GB", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <form action={unbanMember}>
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className={linkBtn}>
                    Unban
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
