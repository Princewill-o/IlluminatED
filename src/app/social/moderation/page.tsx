import Link from "next/link";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { moderate } from "@/app/social/actions";
import { timeAgo } from "@/components/social/util";
import { REPORT_REASONS } from "@/lib/social/config";
import { moderationQueue } from "@/lib/social/data";
import { getViewer } from "@/lib/social/server";

export const metadata: Metadata = { title: "Moderation" };

const reasonLabel = (r: string) =>
  REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

export default async function ModerationPage() {
  const viewer = await getViewer();
  if (viewer?.profile?.role !== "moderator") redirect("/social");
  const items = await moderationQueue();
  return (
    <div className="container max-w-4xl py-10 lg:py-14">
      <h1 className="text-4xl tracking-tight">Moderation</h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        Reported and hidden content. Items with 3 or more reports are hidden
        automatically. Restoring or hiding an item closes its reports.
      </p>
      {items.length === 0 ? (
        <p className="text-muted-foreground mt-10">Nothing needs reviewing.</p>
      ) : (
        <ul className="mt-10 border-t">
          {items.map((i) => (
            <li key={`${i.kind}${i.id}`} className="border-b py-6">
              <p className="text-muted-foreground text-xs">
                {i.kind === "thread" ? "Thread" : "Reply"} ·{" "}
                {i.author?.username ?? "deleted user"} · {timeAgo(i.createdAt)}{" "}
                · {i.reportCount} {i.reportCount === 1 ? "report" : "reports"}{" "}
                {i.hidden && <span className="text-destructive">· hidden</span>}
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
                        a === "delete" || a === "ban"
                          ? "text-destructive text-sm font-medium"
                          : "text-primary text-sm font-medium"
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
    </div>
  );
}
