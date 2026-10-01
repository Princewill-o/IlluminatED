"use client";

import { useEffect, useState } from "react";

import { ExternalLink, Note } from "@/components/kit";
import { isObj } from "@/lib/api-client";
import {
  SET_TEXTS,
  type SetTextLinks,
  fallbackLinks,
} from "@/lib/data/set-texts";

/** "Read the set texts free": Project Gutenberg links, refreshed from Gutendex via our server. */
export function SetTexts() {
  const [links, setLinks] = useState<Map<number, SetTextLinks>>(
    () => new Map(SET_TEXTS.map((t) => [t.id, fallbackLinks(t.id)])),
  );

  useEffect(() => {
    const c = new AbortController();
    fetch("/api/set-texts", { signal: c.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: unknown) => {
        if (!isObj(j) || !Array.isArray(j.books)) return;
        const books: unknown[] = j.books;
        setLinks((prev) => {
          const next = new Map(prev);
          for (const b of books)
            if (
              isObj(b) &&
              typeof b.id === "number" &&
              next.has(b.id) &&
              typeof b.html === "string" &&
              typeof b.epub === "string" &&
              typeof b.page === "string" &&
              [b.html, b.epub, b.page].every((u) =>
                u.startsWith("https://www.gutenberg.org/"),
              )
            )
              next.set(b.id, {
                id: b.id,
                html: b.html,
                epub: b.epub,
                page: b.page,
              });
          return next;
        });
      })
      .catch(() => {
        // Keep the standard Gutenberg links.
      });
    return () => c.abort();
  }, []);

  return (
    <div className="bg-card rounded-xl border p-5 md:p-6">
      <h3 className="font-semibold">Read the set texts free</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        These texts are out of copyright, so Project Gutenberg publishes them
        free to read online or download.
      </p>
      <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {SET_TEXTS.map((t) => {
          const l = links.get(t.id) ?? fallbackLinks(t.id);
          return (
            <li key={t.id} className="text-sm">
              <span className="font-medium">{t.title}</span>
              <span className="text-muted-foreground"> by {t.author}</span>
              <span className="mt-0.5 flex flex-wrap gap-x-4">
                <ExternalLink href={l.html} className="text-sm">
                  Read online
                </ExternalLink>
                <ExternalLink href={l.epub} className="text-sm">
                  EPUB
                </ExternalLink>
                <ExternalLink href={l.page} className="text-sm">
                  All formats
                </ExternalLink>
              </span>
            </li>
          );
        })}
      </ul>
      <Note tone="warn" className="mt-5">
        Check your exam board&apos;s set text list and edition. Gutenberg
        editions may differ from the one your class uses, for example in page
        numbers or play line numbers.
      </Note>
      <p className="text-muted-foreground mt-3 text-xs">
        Texts from{" "}
        <ExternalLink href="https://www.gutenberg.org/" className="text-xs">
          Project Gutenberg
        </ExternalLink>{" "}
        (public domain in the UK and US), found with{" "}
        <ExternalLink href="https://gutendex.com/" className="text-xs">
          Gutendex
        </ExternalLink>
        .
      </p>
    </div>
  );
}
