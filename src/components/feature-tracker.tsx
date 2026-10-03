"use client";
import {useEffect} from "react";

import {usePathname} from "next/navigation";

import {featureForPath} from "@/lib/feature-usage";
import {browserSupabase} from "@/lib/supabase-browser";
export function FeatureTracker() {
  const path = usePathname();
  useEffect(()=>{
    const feature=featureForPath(path);
    const sb=browserSupabase();
    if(!feature || !sb) return;
    void sb.auth.getUser().then(({data})=>{if(data.user) return sb.rpc("record_feature_use",{p_feature:feature});}).catch(()=>{});
  },[path]);
  return null;
}
