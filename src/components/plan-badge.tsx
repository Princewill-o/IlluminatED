"use client";
import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { browserSupabase } from "@/lib/supabase-browser";

export function PlanBadge() {
  const path = usePathname();
  const [plan,setPlan] = useState<string | null>(null);
  useEffect(() => {
    const sb = browserSupabase();
    if (!sb) return;
    let alive = true;
    const refresh = async () => {
      const {data:{user}} = await sb.auth.getUser();
      if (!alive) return;
      if (!user) { setPlan(null); return; }
      const {data,error} = await sb.rpc("tiggy_status");
      if (alive) setPlan(error ? null : data?.plan === "premium" ? "Premium" : "Free");
    };
    void refresh();
    const auth = sb.auth.onAuthStateChange(() => { setPlan(null); setTimeout(() => void refresh(),0); });
    window.addEventListener("focus",refresh);
    return () => { alive=false; auth.data.subscription.unsubscribe(); window.removeEventListener("focus",refresh); };
  },[path]);
  return plan ? <span className={`ml-2 rounded-full px-2 py-1 text-[10px] font-bold sm:text-xs ${plan === "Premium" ? "bg-blue-600 text-white shadow-sm" : "bg-muted text-muted-foreground"}`}>{plan}</span> : null;
}
