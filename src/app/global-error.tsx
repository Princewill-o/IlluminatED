"use client";

import "@/styles/globals.css";

/**
 * Last-resort error page, used when the root layout itself fails.
 * It replaces the whole layout, so it brings its own <html> and <body>
 * and plain links (no navbar, theme provider or custom font).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-GB">
      <body className="bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
          <div className="mb-8 w-32 overflow-hidden rounded-t-3xl bg-[#efe3cc]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/tiggy/wave.webp"
              alt=""
              width={598}
              height={720}
              className="mx-auto mt-3 w-[88%]"
            />
          </div>
          <p className="text-muted-foreground text-sm">Something went wrong</p>
          <h1 className="mt-2 text-4xl tracking-tight md:text-5xl">
            Sorry, IlluminatED didn't load
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            It's not something you did. Try again, and if it keeps happening,
            come back in a few minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium"
            >
              Try again
            </button>
            {/* A full page load, since the app itself may be what broke. */}
            <a
              href="/"
              className="bg-background hover:bg-accent inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium"
            >
              Go to the homepage
            </a>
          </div>
          {error.digest && (
            <p className="text-muted-foreground mt-6 text-xs">
              Error code: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
