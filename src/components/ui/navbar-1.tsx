"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronDown, Menu, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import { cn } from "@/lib/utils";

export interface Navbar1Link {
  title: string;
  href: string;
  description?: string;
}
export interface Navbar1Group {
  label: string;
  items: Navbar1Link[];
}

/**
 * Floating pill navigation, adapted from the Navbar1 component.
 * Each group opens a small panel of links (click, or keyboard); on phones the
 * whole menu slides in from the right.
 */
export function Navbar1({
  logo,
  groups,
  actions,
  cta,
  mobileCta,
}: {
  /** Home link content, usually the logo. */
  logo: React.ReactNode;
  groups: Navbar1Group[];
  /** Small controls shown before the CTA, e.g. a theme toggle. */
  actions?: React.ReactNode;
  cta?: React.ReactNode;
  mobileCta?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = () => setIsOpen((o) => !o);

  // Close everything when the page changes.
  useEffect(() => {
    setIsOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  // Escape closes; clicking outside closes a desktop panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setOpenGroup(null);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node))
        setOpenGroup(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  // Stop the page scrolling behind the open phone menu.
  useEffect(() => {
    document.documentElement.style.overflow = isOpen ? "hidden" : "";
    // Move focus into the menu for keyboard and screen reader users.
    if (isOpen) setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <MotionConfig reducedMotion="user">
      <div className="pointer-events-none sticky top-0 z-50 flex w-full justify-center px-3 pt-3 pb-2 sm:px-4 sm:pt-4">
        <div
          ref={barRef}
          className="bg-background/90 supports-[backdrop-filter]:bg-background/75 pointer-events-auto relative flex w-full max-w-5xl items-center justify-between gap-3 rounded-full border py-2 pr-2 pl-3 shadow-[0_8px_30px_-12px_rgb(15_23_42/0.25)] backdrop-blur sm:pl-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex shrink-0 items-center"
          >
            <Link
              href="/"
              aria-label="IlluminatED home"
              className="flex items-center rounded-full"
            >
              {logo}
            </Link>
          </motion.div>

          {/* Desktop navigation */}
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {groups.map((group, i) => {
              const active = group.items.some((it) => isActive(it.href));
              const open = openGroup === group.label;
              const panelId = `nav-panel-${i}`;
              return (
                <motion.div
                  key={group.label}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="relative"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenGroup(open ? null : group.label)}
                    className={cn(
                      "hover:bg-muted flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                      (active || open) && "text-primary",
                      open && "bg-muted",
                    )}
                  >
                    {group.label}
                    <ChevronDown
                      className={cn(
                        "size-3.5 opacity-60 transition-transform",
                        open && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  <AnimatePresence>
                    {open && (
                      <div className="absolute top-[calc(100%+14px)] left-1/2 w-[480px] -translate-x-1/2">
                        <motion.div
                          id={panelId}
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.16 }}
                          className="bg-popover rounded-2xl border p-2 shadow-xl"
                        >
                          <ul className="grid grid-cols-2 gap-1">
                            {group.items.map((item) => (
                              <li key={item.href}>
                                <Link
                                  href={item.href}
                                  aria-current={
                                    isActive(item.href) ? "page" : undefined
                                  }
                                  className="hover:bg-muted aria-[current=page]:bg-muted block rounded-xl px-3 py-2.5"
                                >
                                  <span className="block text-sm font-semibold">
                                    {item.title}
                                  </span>
                                  {item.description && (
                                    <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                                      {item.description}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {cta && (
              <motion.div
                className={cn(groups.length ? "hidden sm:block" : "block")}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                {cta}
              </motion.div>
            )}
            {/* Phone and tablet menu button */}
            <motion.button
              type="button"
              className={cn(
                "hover:bg-muted flex size-9 items-center justify-center rounded-full lg:hidden",
                !groups.length && "hidden",
              )}
              onClick={toggleMenu}
              whileTap={{ scale: 0.9 }}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              aria-label="Open menu"
            >
              <Menu className="size-5" aria-hidden />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Phone and tablet menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="bg-background fixed inset-0 z-[60] overflow-y-auto px-6 pt-20 pb-10 lg:hidden"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            <motion.button
              type="button"
              className="hover:bg-muted absolute top-5 right-5 flex size-10 items-center justify-center rounded-full"
              onClick={toggleMenu}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              aria-label="Close menu"
              ref={closeRef}
            >
              <X className="size-6" aria-hidden />
            </motion.button>
            <nav aria-label="Mobile" className="mx-auto max-w-md space-y-7">
              {groups.map((group, i) => (
                <motion.div
                  key={group.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 + 0.08 }}
                >
                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                    {group.label}
                  </p>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={toggleMenu}
                          aria-current={
                            isActive(item.href) ? "page" : undefined
                          }
                          className="aria-[current=page]:text-primary block py-1.5 text-base font-medium"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
              {mobileCta && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="border-t pt-6"
                >
                  {mobileCta}
                </motion.div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
