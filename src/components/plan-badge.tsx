"use client";
import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { browserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

export type PlanId = "free" | "plus" | "plus_experience" | "schools";

export const PLAN_LABEL: Record<PlanId, string> = {
  free: "Free",
  plus: "Plus",
  plus_experience: "Plus+ Experience",
  schools: "Schools",
};

/** Short labels for tight spaces (narrow side rail, phone header). */
export const PLAN_SHORT: Record<PlanId, string> = { free: "Free", plus: "Plus", plus_experience: "Plus+", schools: "School" };

const PLAN_STYLE: Record<PlanId, string> = {
  free: "bg-muted text-muted-foreground ring-1 ring-border",
  plus: "bg-[#2b5fd9] text-white",
  plus_experience: "bg-gradient-to-r from-[#6b55e0] to-[#2b5fd9] text-white",
  schools: "bg-[#0f7a52] text-white",
};

/** The signed-in learner's plan (from public.my_plan), refreshed on navigation, focus and sign-in changes. */
export function usePlan() {
  const path = usePathname();
  const [plan, setPlan] = useState<PlanId | null>(null);
  useEffect(() => {
    const sb = browserSupabase();
    if (!sb) return;
    let alive = true;
    const refresh = async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!alive) return;
      if (!user) { setPlan(null); return; }
      const { data, error } = await sb.rpc("my_plan");
      if (alive) setPlan(!error && typeof data === "string" && data in PLAN_LABEL ? (data as PlanId) : null);
    };
    void refresh();
    const auth = sb.auth.onAuthStateChange(() => { setPlan(null); setTimeout(() => void refresh(), 0); });
    window.addEventListener("focus", refresh);
    return () => { alive = false; auth.data.subscription.unsubscribe(); window.removeEventListener("focus", refresh); };
  }, [path]);
  return plan;
}

/**
 * Plan pill shown next to the IlluminatED logo. Free accounts get an upgrade link
 * straight to the plans; paid and school accounts link to billing.
 */
export function PlanBadge({ className, compact = false, short = false }: { className?: string; compact?: boolean; short?: boolean }) {
  const plan = usePlan();
  if (!plan) return null;
  const free = plan === "free";
  return (
    <Link
      prefetch={false}
      href={free ? "/pricing#plans" : plan === "schools" ? "/account" : "/billing"}
      title={free ? "You're on the Free plan. See plans to upgrade." : `Your plan: ${PLAN_LABEL[plan]}`}
      aria-label={free ? "Free plan. Upgrade" : `Your plan: ${PLAN_LABEL[plan]}`}
      className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] leading-5 font-black whitespace-nowrap shadow-sm sm:text-xs", PLAN_STYLE[plan], className)}
    >
      {short ? PLAN_SHORT[plan] : PLAN_LABEL[plan]}
      {free && !compact && <span className="rounded-full bg-[#2b5fd9] px-1.5 text-white">Upgrade</span>}
    </Link>
  );
}
