"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { isAppPath } from "@/lib/app-shell";

const AppShell = dynamic(() => import("./app-shell").then((module) => module.AppShell));

/**
 * Chooses the website chrome (navbar + footer) or the app shell (tabs) for the
 * current path. The navbar and footer are passed in so they can stay server
 * components.
 */
export function SiteChrome({
  navbar,
  footer,
  children,
}: {
  navbar: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const path = usePathname();
  if (isAppPath(path)) return <AppShell>{children}</AppShell>;
  return (
    <>
      {navbar}
      <main id="main" tabIndex={-1} className="min-h-[60vh] outline-none">
        {children}
      </main>
      {footer}
    </>
  );
}
