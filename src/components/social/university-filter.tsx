"use client";

import { useState } from "react";

import Link from "next/link";

export function UniversityFilter({
  unis,
}: {
  unis: { university: string; count: number }[];
}) {
  const [q, setQ] = useState("");
  const list = unis.filter((u) =>
    u.university.toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <div>
      <label htmlFor="uq" className="sr-only">
        Find a university
      </label>
      <input
        id="uq"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Find a university"
        className="bg-card border-input focus-visible:ring-ring h-11 w-full max-w-md rounded-md border px-3 text-base outline-none focus-visible:ring-2"
      />
      {list.length === 0 ? (
        <p className="text-muted-foreground mt-8 text-sm">
          No threads about {q ? `“${q}”` : "any university"} yet.{" "}
          <Link
            href={`/social/new?category=universities${q ? `&university=${encodeURIComponent(q)}` : ""}`}
            className="text-primary underline underline-offset-4"
          >
            Start one
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 border-t md:grid md:grid-cols-2 md:gap-x-10">
          {list.map((u) => (
            <li key={u.university} className="border-b">
              <Link
                href={`/social/c/universities?u=${encodeURIComponent(u.university)}`}
                className="hover:text-primary flex items-baseline justify-between gap-3 py-3"
              >
                <span className="font-medium">{u.university}</span>
                <span className="text-muted-foreground text-sm">
                  {u.count} {u.count === 1 ? "thread" : "threads"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
