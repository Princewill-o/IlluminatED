import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { deleteOwn, moderate } from "@/app/social/actions";
import { ReplyForm, ReportButton } from "@/components/social/forms";
import { timeAgo } from "@/components/social/util";
import { categoryBySlug, socialConfigured } from "@/lib/social/config";
import { type Author, getThread } from "@/lib/social/data";
import { getViewer } from "@/lib/social/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const t = await getThread(Number((await params).id));
  return t ? { title: t.title, description: t.excerpt } : {};
}

function Byline({ author, at }: { author: Author | null; at: string }) {
  return (
    <p className="text-muted-foreground text-sm">
      {author ? (
        <Link
          href={`/social/u/${author.username}`}
          className="text-foreground font-semibold hover:underline"
        >
          {author.username}
        </Link>
      ) : (
        <span>deleted user</span>
      )}
      {author?.role === "moderator" && (
        <span className="text-primary ml-2 text-xs font-semibold">
          Moderator
        </span>
      )}
      <span> · </span>
      <time dateTime={at}>{timeAgo(at)}</time>
    </p>
  );
}

function ModButtons({
  kind,
  id,
  authorId,
  hidden,
  locked,
}: {
  kind: "thread" | "post";
  id: number;
  authorId: string | null;
  hidden: boolean;
  locked?: boolean;
}) {
  const Btn = ({
    action,
    children,
  }: {
    action: string;
    children: React.ReactNode;
  }) => (
    <form action={moderate}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="authorId" value={authorId ?? ""} />
      <input type="hidden" name="action" value={action} />
      <button type="submit" className="text-primary text-xs font-medium">
        {children}
      </button>
    </form>
  );
  return (
    <div className="flex flex-wrap gap-3">
      {hidden ? (
        <Btn action="restore">Restore</Btn>
      ) : (
        <Btn action="hide">Hide</Btn>
      )}
      {kind === "thread" &&
        (locked ? (
          <Btn action="unlock">Unlock</Btn>
        ) : (
          <Btn action="lock">Lock</Btn>
        ))}
      {authorId && <Btn action="ban">Ban author</Btn>}
    </div>
  );
}

function DeleteOwn({
  kind,
  id,
  threadId,
}: {
  kind: "thread" | "post";
  id: number;
  threadId: number;
}) {
  return (
    <form action={deleteOwn}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="threadId" value={threadId} />
      <button
        type="submit"
        className="text-muted-foreground hover:text-foreground text-xs"
      >
        Delete
      </button>
    </form>
  );
}

const Body = ({ text }: { text: string }) => (
  <div className="mt-3 space-y-3 leading-relaxed break-words whitespace-pre-line">
    {text}
  </div>
);

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [t, viewer] = await Promise.all([getThread(id), getViewer()]);
  if (!t) notFound();
  const cat = categoryBySlug(t.category);
  const isMod = viewer?.profile?.role === "moderator";
  const member = Boolean(viewer?.profile && !viewer.profile.banned);
  const visibleReplies = t.replies.filter(
    (r) => !r.hidden || isMod || r.authorId === viewer?.id,
  );

  return (
    <div className="container max-w-3xl py-10 lg:py-14">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground mb-5 text-sm"
      >
        <Link href="/social" className="hover:text-foreground">
          Forum
        </Link>{" "}
        /{" "}
        <Link
          href={`/social/c/${t.category}`}
          className="hover:text-foreground"
        >
          {cat?.name}
        </Link>
        {t.university && (
          <>
            {" "}
            /{" "}
            <Link
              href={`/social/c/universities?u=${encodeURIComponent(t.university)}`}
              className="hover:text-foreground"
            >
              {t.university}
            </Link>
          </>
        )}
      </nav>

      <article aria-labelledby="thread-title">
        {!socialConfigured && (
          <p className="text-primary mb-2 text-sm font-semibold">
            Example thread (preview only)
          </p>
        )}
        {t.hidden && (
          <p className="bg-danger-soft mb-4 rounded-md px-3 py-2 text-sm">
            This thread is hidden while moderators review it.
          </p>
        )}
        <h1
          id="thread-title"
          className="text-3xl tracking-tight text-balance md:text-4xl"
        >
          {t.title}
        </h1>
        <div className="mt-4">
          <Byline author={t.author} at={t.createdAt} />
        </div>
        <Body text={t.body} />
        <div className="mt-4 flex flex-wrap items-start gap-4">
          {socialConfigured && (
            <ReportButton kind="thread" id={t.id} canReport={member} />
          )}
          {viewer && viewer.id === t.authorId && (
            <DeleteOwn kind="thread" id={t.id} threadId={t.id} />
          )}
          {isMod && (
            <ModButtons
              kind="thread"
              id={t.id}
              authorId={t.authorId}
              hidden={t.hidden}
              locked={t.locked}
            />
          )}
        </div>
      </article>

      <section aria-labelledby="replies" className="mt-12">
        <h2 id="replies" className="border-b pb-3 text-lg font-semibold">
          {t.replyCount} {t.replyCount === 1 ? "reply" : "replies"}
        </h2>
        <ol>
          {visibleReplies.map((r) => (
            <li key={r.id} id={`r${r.id}`} className="border-b py-6">
              {r.hidden && (
                <p className="text-destructive mb-2 text-xs font-medium">
                  Hidden while moderators review it
                </p>
              )}
              <Byline author={r.author} at={r.createdAt} />
              <Body text={r.body} />
              <div className="mt-3 flex flex-wrap items-start gap-4">
                {socialConfigured && (
                  <ReportButton kind="post" id={r.id} canReport={member} />
                )}
                {viewer && viewer.id === r.authorId && (
                  <DeleteOwn kind="post" id={r.id} threadId={t.id} />
                )}
                {isMod && (
                  <ModButtons
                    kind="post"
                    id={r.id}
                    authorId={r.authorId}
                    hidden={r.hidden}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          {!socialConfigured ? (
            <p className="text-muted-foreground text-sm">
              Replies are switched off in the preview.
            </p>
          ) : t.locked ? (
            <p className="text-muted-foreground text-sm">
              This thread is locked, so no new replies can be added.
            </p>
          ) : member ? (
            <ReplyForm threadId={t.id} />
          ) : viewer?.profile?.banned ? (
            <p className="text-muted-foreground text-sm">
              Your account can't post at the moment.
            </p>
          ) : viewer ? (
            <p className="text-sm">
              <Link
                href={`/onboarding?next=/social/t/${t.id}`}
                className="text-primary font-medium underline underline-offset-4"
              >
                Finish setting up
              </Link>{" "}
              to reply.
            </p>
          ) : (
            <p className="text-sm">
              <Link
                href={`/sign-in?next=/social/t/${t.id}`}
                className="text-primary font-medium underline underline-offset-4"
              >
                Sign in
              </Link>{" "}
              to reply.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
