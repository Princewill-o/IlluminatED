import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { toggleBlock } from "@/app/social/block-actions";
import { ThreadList } from "@/components/social/thread-list";
import { getBlockState } from "@/lib/social/blocks";
import { socialConfigured } from "@/lib/social/config";
import { getProfile } from "@/lib/social/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  return {
    title: decodeURIComponent((await params).username),
    robots: { index: false },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const username = decodeURIComponent((await params).username);
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) notFound();
  const [p, block] = await Promise.all([
    getProfile(username),
    getBlockState(username),
  ]);
  if (!p) notFound();
  const canBlock = Boolean(
    block?.viewerId && block.viewerId !== block.targetId,
  );
  const blocked = Boolean(block?.blocked);
  return (
    <div className="container max-w-3xl py-10 lg:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl tracking-tight">{p.username}</h1>
          <p className="text-muted-foreground mt-2">
            {p.role === "moderator" && (
              <span className="text-primary mr-2 font-semibold">Moderator</span>
            )}
            Joined{" "}
            {new Date(p.joined).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {canBlock && block && (
          <form action={toggleBlock}>
            <input type="hidden" name="target" value={block.targetId} />
            <input type="hidden" name="username" value={p.username} />
            <input
              type="hidden"
              name="action"
              value={blocked ? "unblock" : "block"}
            />
            <button
              type="submit"
              className={
                blocked
                  ? "hover:bg-muted h-9 rounded-md border px-4 text-sm font-medium"
                  : "border-destructive/40 text-destructive hover:bg-danger-soft h-9 rounded-md border px-4 text-sm font-medium"
              }
            >
              {blocked ? "Unblock" : "Block"}
            </button>
          </form>
        )}
      </div>
      {canBlock && (
        <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-relaxed">
          {blocked
            ? `You've blocked ${p.username}. You won't see their threads or replies. They aren't told.`
            : `Blocking hides ${p.username}'s threads and replies from you. They aren't told. If they've done something wrong, please report it too.`}
        </p>
      )}
      <h2 className="mt-10 mb-3 text-lg font-semibold">Threads</h2>
      {blocked ? (
        <p className="text-muted-foreground text-sm">
          Hidden because you've blocked this member.
        </p>
      ) : (
        <ThreadList threads={p.threads} example={!socialConfigured} />
      )}
    </div>
  );
}
