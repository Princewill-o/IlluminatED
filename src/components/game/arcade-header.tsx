"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/games/world", label: "Worlds" },
  { href: "/games/careers", label: "Careers" },
  { href: "/games/home", label: "Home" },
  { href: "/games", label: "Promotion Panic" },
  { href: "/games/locker", label: "Locker" },
];

/** Sub-tabs inside the Play tab of the app. Stats live in the app's top bar and side rail. */
export function ArcadeHeader() {
  const path = usePathname();
  if (path.startsWith("/games/challenge/") || path.startsWith("/games/promotion-panic/") || path.startsWith("/games/world"))
    return null;
  return (
    <nav aria-label="Play" className="mx-auto max-w-6xl px-4 pt-4 md:pt-8">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {TABS.map((t) => {
          const on = t.href === "/games" ? path === "/games" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-block rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition active:scale-95",
                  on ? "bg-foreground text-background" : "bg-secondary text-foreground/80 hover:bg-accent",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Parody disclaimer under game screens (not over the full-screen world). */
export function ArcadeFooter() {
  const path = usePathname();
  if (path.startsWith("/games/world")) return null;
  return (
    <p className="mx-auto max-w-6xl px-4 pt-2 pb-6 text-xs leading-6 text-muted-foreground">
      Every company in IlluminatED City is a made-up parody. Any resemblance to real businesses is for laughs only, and none of
      them endorse IlluminatED. The questions are real revision, though.
    </p>
  );
}
