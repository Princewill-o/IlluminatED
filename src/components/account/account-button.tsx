"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { socialConfigured } from "@/lib/social/config";
import { useSignedIn } from "@/lib/use-signed-in";
import { cn } from "@/lib/utils";

/** "Sign in" or "Dashboard", depending on whether there's a session in this browser. */
export function AccountButton({ className }: { className?: string }) {
  const signedIn = useSignedIn();
  const pathname = usePathname();

  if (!socialConfigured) return null;
  // Keep the space stable while we check, so the header doesn't jump.
  if (signedIn === null)
    return (
      <span
        className={cn("inline-block h-9 w-[5.5rem]", className)}
        aria-hidden
      />
    );

  const base =
    "inline-flex h-9 items-center rounded-md px-3.5 text-sm font-semibold transition-colors";
  return signedIn ? (
    <Link
      href="/dashboard"
      aria-current={pathname.startsWith("/dashboard") ? "page" : undefined}
      className={cn(base, "hover:bg-muted border", className)}
    >
      Dashboard
    </Link>
  ) : (
    <Link
      href={`/sign-in?next=${encodeURIComponent(pathname === "/sign-in" || pathname === "/" ? "/dashboard" : pathname)}`}
      className={cn(
        base,
        "bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
    >
      Sign in
    </Link>
  );
}
