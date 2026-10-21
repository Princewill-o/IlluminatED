"use client";

import { useEffect, useState } from "react";

import { HudSlot } from "./hud";

export interface CityHeadline { title: string; url: string; published: string | null }
export function useCityNews() {
  const [headlines, setHeadlines] = useState<CityHeadline[]>([]);
  const [updated, setUpdated] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/city-news", { signal: controller.signal });
        if (!response.ok) throw new Error("Unavailable");
        const data = await response.json();
        setHeadlines(Array.isArray(data.headlines) ? data.headlines : []);
        setUpdated(data.updated); setOffline(false);
      } catch { if (!controller.signal.aborted) setOffline(true); }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 900_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return { headlines, updated, offline };
}

export function CityBroadcast({ headlines, updated, offline }: ReturnType<typeof useCityNews>) {
  return <HudSlot area="br" order={40} narrowArea="tl"><details className="w-[min(320px,100%)] rounded-2xl border border-[#c8b182]/50 bg-[#152e35]/95 text-[#fff3d8] shadow-xl">
    <summary className="cursor-pointer px-4 py-3 text-xs font-black">City broadcast · News & announcements</summary>
    <div className="max-h-[40dvh] space-y-3 overflow-y-auto px-4 pb-4 text-xs">
      <p className="text-white/60">{offline ? "Feed unavailable · retrying automatically" : updated ? `Checked ${new Date(updated).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Connecting to the newsroom…"}</p>
      {headlines.map(item => <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg bg-white/5 p-3 hover:bg-white/10">{item.title}<span className="mt-1 block text-[10px] text-white/60">GOV.UK · {item.published ? new Date(item.published).toLocaleDateString("en-GB") : "Announcement"} ↗</span></a>)}
      <p>Visit company offices to start a shift. Walk to a terminal to begin work.</p>
      <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener noreferrer" className="block text-[10px] text-white/60 underline">Contains public sector information licensed under OGL v3.0</a>
    </div>
  </details></HudSlot>;
}
