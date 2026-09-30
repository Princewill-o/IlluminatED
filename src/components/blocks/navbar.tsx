"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

import { AccountButton } from "@/components/account/account-button";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>("Learn");
  const pathname = usePathname();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setIsMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  if (pathname.startsWith("/social")) return null;

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-md"
          aria-label="IlluminatED home"
        >
          <Logo />
        </Link>

        <NavigationMenu className="mr-auto max-lg:hidden" aria-label="Main">
          <NavigationMenuList>
            {NAV.map((group) => (
              <NavigationMenuItem key={group.label}>
                <NavigationMenuTrigger
                  className={cn(
                    "bg-transparent! px-2.5",
                    group.items.some((i) => isActive(i.href)) && "text-primary",
                  )}
                >
                  {group.label}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[480px] grid-cols-2 gap-1 p-3">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={item.href}
                            aria-current={
                              isActive(item.href) ? "page" : undefined
                            }
                            className="group hover:bg-muted focus:bg-muted aria-[current=page]:bg-muted block rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
                          >
                            <div className="text-sm leading-none font-semibold">
                              {item.title}
                            </div>
                            <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs leading-snug">
                              {item.description}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AccountButton className="max-sm:hidden" />
          <button
            type="button"
            className="text-foreground relative flex size-9 items-center justify-center rounded-md border lg:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            <span className="sr-only">
              {isMenuOpen ? "Close menu" : "Open menu"}
            </span>
            <span
              className="absolute top-1/2 left-1/2 block w-[16px] -translate-x-1/2 -translate-y-1/2"
              aria-hidden
            >
              <span
                className={`absolute block h-0.5 w-full rounded-full bg-current transition duration-300 ${isMenuOpen ? "rotate-45" : "-translate-y-1.5"}`}
              />
              <span
                className={`absolute block h-0.5 w-full rounded-full bg-current transition duration-300 ${isMenuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`absolute block h-0.5 w-full rounded-full bg-current transition duration-300 ${isMenuOpen ? "-rotate-45" : "translate-y-1.5"}`}
              />
            </span>
          </button>
        </div>
      </div>

      <nav
        id="mobile-menu"
        aria-label="Mobile"
        className={cn(
          "bg-background absolute inset-x-0 top-full max-h-[calc(100vh-4rem)] overflow-y-auto border-b px-6 pb-6 shadow-lg transition-all duration-200 lg:hidden",
          isMenuOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-4 opacity-0",
        )}
      >
        <div className="divide-border flex flex-col divide-y">
          <div className="py-3 sm:hidden">
            <AccountButton className="h-10 w-full justify-center" />
          </div>
          {NAV.map((group) => (
            <div key={group.label} className="py-2">
              <button
                type="button"
                onClick={() =>
                  setOpenGroup(openGroup === group.label ? null : group.label)
                }
                aria-expanded={openGroup === group.label}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-base font-semibold"
              >
                {group.label}
                <ChevronRight
                  className={cn(
                    "size-4 transition-transform",
                    openGroup === group.label && "rotate-90",
                  )}
                  aria-hidden
                />
              </button>
              {openGroup === group.label && (
                <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        className="hover:bg-muted aria-[current=page]:bg-muted block rounded-md px-3 py-2"
                      >
                        <span className="block text-sm font-medium">
                          {item.title}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {item.description}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
};
