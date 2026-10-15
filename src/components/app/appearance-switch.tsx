"use client";

import { useEffect, useState } from "react";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "Auto", icon: Monitor },
] as const;

/** Light / Dark / Auto (follows the phone or computer). Same choice as the website's toggle. */
export function AppearanceSwitch({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? (theme ?? "system") : null;

  return (
    <div role="radiogroup" aria-label="Appearance" className={cn("grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1", className)}>
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const on = current === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(id)}
            title={label}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl font-bold transition",
              compact ? "py-1.5 text-xs" : "py-2.5 text-sm",
              on ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className={compact ? "size-3.5" : "size-4"} aria-hidden />
            <span className={compact ? "sr-only xl:not-sr-only" : undefined}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
