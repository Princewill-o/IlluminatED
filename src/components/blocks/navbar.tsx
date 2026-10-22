"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountButton } from "@/components/account/account-button";
import { Logo } from "@/components/brand";
import { PlanBadge } from "@/components/plan-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Navbar1 } from "@/components/ui/navbar-1";
import { NAV } from "@/lib/nav";
import { useSignedIn } from "@/lib/use-signed-in";

/** Site navigation: a floating pill (see components/ui/navbar-1.tsx). Menus only appear once signed in. */
export const Navbar = () => {
  const pathname = usePathname();
  const signedIn = useSignedIn();
  // IlluminatEDSocial has its own header. (Signed-in pages use the app shell instead of this navbar.)
  if (pathname.startsWith("/social")) return null;

  return (
    <Navbar1
      logo={<span className="inline-flex items-center"><Logo wordmarkClassName="max-[480px]:hidden" /><PlanBadge className="ml-2" /></span>}
      groups={signedIn ? NAV : []}
      actions={<ThemeToggle className="rounded-full" />}
      cta={
        signedIn === false ? (
          <div className="flex items-center gap-2">
            <Link prefetch={false}
              href="/sign-in"
              className="hover:bg-muted inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold"
            >
              Log in
            </Link>
            <Link prefetch={false}
              href="/book"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold"
            >
              Request access
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
