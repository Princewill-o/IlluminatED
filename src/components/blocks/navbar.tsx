"use client";

import { usePathname } from "next/navigation";

import { AccountButton } from "@/components/account/account-button";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Navbar1 } from "@/components/ui/navbar-1";
import { NAV } from "@/lib/nav";

/** Site navigation: a floating pill (see components/ui/navbar-1.tsx). */
export const Navbar = () => {
  const pathname = usePathname();
  // IlluminatEDSocial has its own header.
  if (pathname.startsWith("/social")) return null;

  return (
    <Navbar1
      logo={<Logo wordmarkClassName="max-[360px]:hidden" />}
      groups={NAV}
      actions={<ThemeToggle className="rounded-full" />}
      cta={<AccountButton className="rounded-full px-4" />}
      mobileCta={
        <AccountButton className="h-12 w-full justify-center rounded-full text-base" />
      }
    />
  );
};
