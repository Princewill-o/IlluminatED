"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogOut } from "lucide-react";

import { socialConfigured } from "@/lib/social/config";
import { browserSupabase } from "@/lib/supabase-browser";
import { useSignedIn } from "@/lib/use-signed-in";
import { cn } from "@/lib/utils";

/** "Sign in" or "Dashboard", depending on whether there's a session in this browser. */
export function AccountButton({ className }: { className?: string }) {
  const signedIn = useSignedIn();
  const [admin, setAdmin] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    if (!signedIn) return setAdmin(false);
    let active = true;
    void browserSupabase()?.rpc("platform_admin_status").then(({ data }) => {
      if (active) setAdmin(data === true);
    });
    return () => { active = false; };
  }, [signedIn]);

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
    <div
      className={cn(
        "flex items-center gap-2",
        className?.includes("w-full") && "w-full",
      )}
    >
      <Link
        href="/dashboard"
        aria-current={pathname.startsWith("/dashboard") ? "page" : undefined}
        className={cn(base, "hover:bg-muted border", className)}
      >
        Dashboard
      </Link>
      {admin && <Link href="/admin" aria-current={pathname.startsWith("/admin") ? "page" : undefined} className={cn(base, "hover:bg-muted border")}>Admin</Link>}
      <button
        type="button"
        onClick={async () => {
          await browserSupabase()?.auth.signOut();
          window.location.assign("/");
        }}
        className={cn(
          base,
          "bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5",
          className,
        )}
      >
        <LogOut className="size-4" aria-hidden />
        Log out
      </button>
    </div>
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
