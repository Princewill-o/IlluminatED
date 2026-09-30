"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountButton } from "@/components/account/account-button";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Navbar1 } from "@/components/ui/navbar-1";
import { NAV } from "@/lib/nav";
import { useSignedIn } from "@/lib/use-signed-in";

/** Site navigation: a floating pill (see components/ui/navbar-1.tsx). Menus only appear once signed in. */
export const Navbar = () => {
  const pathname = usePathname();
  const signedIn = useSignedIn();
  // IlluminatEDSocial has its own header.
  if (pathname.startsWith("/social")) return null;

  return (
    <Navbar1
      logo={<Logo wordmarkClassName="max-[380px]:hidden" />}
      groups={signedIn ? NAV : []}
      actions={<ThemeToggle className="rounded-full" />}
      cta={
        signedIn === false ? (
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="hover:bg-muted hidden h-9 items-center rounded-full px-4 text-sm font-semibold sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/sign-in?mode=sign-up"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold"
            >
              <span className="sm:hidden">Join free</span>
              <span className="hidden sm:inline">Create free account</span>
            </Link>
          </div>
        ) : (
          <AccountButton className="rounded-full px-4" />
        )
      }
      mobileCta={
        <AccountButton className="h-12 w-full justify-center rounded-full text-base" />
      }
    />
  );
};
