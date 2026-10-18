"use client";

import Image from "next/image";
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

  if (pathname === "/") return (
    <header style={{background:"#f8f7f1",color:"#142d32",borderBottom:"1px solid #dce1d8"}}>
      <nav aria-label="Main" className="mx-auto flex max-w-[1256px] flex-wrap items-center justify-between gap-x-4 gap-y-4 px-[22px] py-5 md:px-[30px] lg:px-14">
        <Link href="/" aria-label="IlluminatED home" className="inline-flex items-center gap-2">
          <Image src="/brand/lion-head.webp" alt="" width={36} height={36} className="rounded-full" priority />
          <Image src="/brand/wordmark-navy.webp" alt="IlluminatED" width={118} height={18} priority />
        </Link>
        <div className="order-3 flex w-full justify-center gap-6 text-[11px] font-semibold sm:order-none sm:w-auto">
          <Link href="/#learning" className="hover:underline">How it works</Link>
          <Link href="/schools" className="hover:underline">For schools</Link>
          <Link href="/pricing" className="hover:underline">Pricing</Link>
          <Link href={signedIn ? "/dashboard" : "/sign-in"} className="hover:underline sm:hidden">{signedIn ? "Dashboard" : "Sign in"}</Link>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-bold">
          <Link href={signedIn ? "/dashboard" : "/sign-in"} className="hidden min-h-11 items-center sm:inline-flex">{signedIn ? "My dashboard" : "Sign in"}</Link>
          <Link href="/book" className="inline-flex min-h-11 items-center rounded-md border border-[#b4beb4] px-4">Request access <span className="ml-3" aria-hidden>↗</span></Link>
        </div>
      </nav>
    </header>
  );

  return (
    <Navbar1
      logo={<span className="inline-flex items-center"><Logo wordmarkClassName="max-[480px]:hidden" /><PlanBadge /></span>}
      groups={signedIn ? NAV : []}
      actions={<ThemeToggle className="rounded-full" />}
      cta={
        signedIn === false ? (
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="hover:bg-muted inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold"
            >
              Log in
            </Link>
            <Link
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
