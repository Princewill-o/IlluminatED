import Link from "next/link";

import { timeAgo } from "./util";

import { categoryBySlug } from "@/lib/social/config";
import type { ThreadSummary } from "@/lib/social/data";

export function ThreadList({
  threads,
  showCategory = true,
  example = false,
}: {
  threads: ThreadSummary[];
  showCategory?: boolean;
  example?: boolean;
}) {
  if (!threads.length)
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="font-semibold">No threads here yet</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Be the first to start one.
        </p>
      </div>
    );
  return (
    <ul className="border-t">
      {threads.map((t) => (
        <li key={t.id} className="border-b">
          <Link
            href={`/social/t/${t.id}`}
            className="group hover:bg-muted -mx-3 flex gap-4 rounded-md px-3 py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="group-hover:text-primary leading-snug font-semibold">
                {t.title}
              </p>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-relaxed">
                {t.excerpt}
              </p>
              <p className="text-muted-foreground mt-2 flex flex-wrap gap-x-2 text-xs">
                {example && (
                  <span className="text-primary font-medium">Example</span>
                )}
                {showCategory && (
                  <span>{categoryBySlug(t.category)?.name}</span>
                )}
                {t.university && (
                  <span className="text-foreground/80">· {t.university}</span>
                )}
                <span>· {t.author ? t.author.username : "deleted user"}</span>
                <span>· {timeAgo(t.lastActivityAt)}</span>
                {t.locked && <span>· Locked</span>}
              </p>
            </div>
            <div className="w-16 shrink-0 text-right">
              <p className="font-semibold tabular-nums">{t.replyCount}</p>
              <p className="text-muted-foreground text-xs">
                {t.replyCount === 1 ? "reply" : "replies"}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Pager({
  page,
  total,
  pageSize,
  base,
}: {
  page: number;
  total: number;
  pageSize: number;
  base: string;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const href = (p: number) =>
    `${base}${base.includes("?") ? "&" : "?"}page=${p}`;
  return (
    <nav
      aria-label="Pages"
      className="mt-6 flex items-center justify-between text-sm"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} className="text-primary font-medium">
          Newer
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="text-primary font-medium">
          Older
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
