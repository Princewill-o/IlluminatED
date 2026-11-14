"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { LearningFooter, LearningHeader } from "@/components/products/learning-chrome";
import { isAppPath } from "@/lib/app-shell";
import { isLearningDestination, type ProductId } from "@/lib/learning/products";

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
  initialProduct,
}: {
  navbar: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  initialProduct?: ProductId;
}) {
  const path = usePathname();
  if (path === "/" || isLearningDestination(path) || path.startsWith("/learning-resources/")) return <>
    <LearningHeader initialProduct={initialProduct} />
    <main key={path} id="main" tabIndex={-1} className="min-h-[65vh] outline-none">{children}</main>
    <LearningFooter />
  </>;
  if (isAppPath(path)) return <AppShell>{children}</AppShell>;
  return (
    <>
      {navbar}
      <main key={path} id="main" tabIndex={-1} className="platform-page-enter min-h-[60vh] outline-none">
        {children}
      </main>
      {footer}
    </>
  );
}
