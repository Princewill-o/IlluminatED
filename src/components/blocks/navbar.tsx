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

/** Who it's for and what it costs: the same for everyone. */
const PLANS_GROUP = { label: "Plans", items: [
  { title: "Plans and pricing", href: "/pricing", description: "Free to revise · Plus from £5.99 a month" },
  { title: "For parents", href: "/#parents", description: "One clear price, cancel any time" },
  { title: "For schools & colleges", href: "/schools", description: "Paid one-term pilots and the data pack" },
  { title: "Safety and your data", href: "/safeguarding", description: "Safeguarding, privacy and AI use" },
] };

/** Signed out: what you can revise, then what it costs. Three choices, no maze. */
const PUBLIC_NAV = [
  { label: "Revise", items: [
    { title: "GCSE", href: "/gcse", description: "Years 10–11 by subject and exam board" },
    { title: "A level", href: "/a-level", description: "Years 12–13 subject routes" },
    { title: "BTEC and T Levels", href: "/btec", description: "Vocational and technical routes" },
    { title: "Free lesson slides", href: "/curriculum", description: "Years 1–11 · no account needed" },
  ] },
  PLANS_GROUP,
];

/** Site navigation: a floating pill (see components/ui/navbar-1.tsx). Menus only appear once signed in. */
export const Navbar = () => {
  const pathname = usePathname();
  const signedIn = useSignedIn();
  // IlluminatEDSocial has its own header. (Signed-in pages use the app shell instead of this navbar.)
  if (pathname.startsWith("/social")) return null;

  return (
    <Navbar1
      logo={<span className="inline-flex items-center"><Logo wordmarkClassName="max-[480px]:hidden" /><PlanBadge className="ml-2" /></span>}
      groups={signedIn ? NAV.filter((g) => g.label === "Learn" || g.label === "Practise").concat(PLANS_GROUP) : PUBLIC_NAV}
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
              href="/sign-in?mode=sign-up"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold"
            >
              Sign up free
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
