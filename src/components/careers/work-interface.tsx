"use client";

import type { ReactNode } from "react";

import { Activity, Bug, Database, FileText, Inbox, Mail, MonitorSmartphone, Receipt, ScanLine, Send, Star, Ticket, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The tool a task happens in. A cashier works the till, a chef reads the ticket rail, IT support
 * works the helpdesk queue, a doctor reads the patient monitor. The task itself (question and
 * answers) sits inside, so every job looks and feels like the real workplace.
 */
type Kind = "computer" | "till" | "kitchen" | "monitor" | "tablet" | "clipboard";

const KIND_OF: Record<string, Kind> = {
  basket: "till", change: "till",
  pizzaOrder: "kitchen", foodSafety: "kitchen", menuAllergy: "kitchen",
  vitals: "monitor", triage: "monitor", treatment: "monitor",
  inbox: "computer", email: "computer", booking: "computer", gdpr: "computer", bugfix: "computer", trace: "computer", sql: "computer",
  itTicket: "computer", interest: "computer", fraud: "computer", headline: "computer", ctr: "computer", clause: "computer", reception: "computer",
  witness: "computer", passCheck: "computer",
  mechFault: "tablet", toolPick: "tablet", parcelAddress: "tablet", stock: "tablet", busTimetable: "tablet", taxiFare: "tablet",
  cleanProduct: "clipboard", haircutMatch: "clipboard", markWork: "clipboard", plantCare: "clipboard", fishLimit: "clipboard", extinguisher: "clipboard", bricksNeeded: "clipboard",
};

/** Workplace-branded apps (parody names, no real logos). */
const APPS: Record<string, { name: string; colour: string }> = {
  macrosoft: { name: "Helpdesk 365", colour: "#2b6fd6" },
  goggle: { name: "CodeSpace", colour: "#1a8f5a" },
  barklays: { name: "TellerDesk", colour: "#0b6fa4" },
  "st-plasters": { name: "WardView", colour: "#c8322d" },
  tescow: { name: "StoreHub", colour: "#2b5fd9" },
  lawz: { name: "CaseFile", colour: "#4b3f8f" },
  netflics: { name: "Studio Dashboard", colour: "#d1242f" },
  pizzazz: { name: "PizzaPOS", colour: "#e4572e" },
  police: { name: "Incident Log", colour: "#22408a" },
  security: { name: "Gatehouse", colour: "#343a40" },
};

/** Sidebar for computer apps, by task: a ticket queue, mail folders, a file tree, tables. */
function Sidebar({ kind }: { kind: string }) {
  const item = (icon: ReactNode, label: string, on = false, badge?: string) => (
    <li className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-xs", on ? "bg-white font-black text-[#13203a] shadow-sm" : "text-[#13203a]/70")}>
      {icon}<span className="min-w-0 flex-1 truncate">{label}</span>{badge && <span className="rounded bg-[#c8322d] px-1 text-[9px] font-black text-white">{badge}</span>}
    </li>
  );
  if (kind === "itTicket") return <ul className="grid gap-1">{item(<Ticket className="size-3.5" />, "INC-2041 · Can't print", true, "P2")}{item(<Ticket className="size-3.5" />, "INC-2042 · Password reset", false, "P3")}{item(<Ticket className="size-3.5" />, "INC-2043 · Wi-Fi drops", false, "P3")}{item(<Star className="size-3.5" />, "Knowledge base")}</ul>;
  if (kind === "inbox" || kind === "email" || kind === "booking" || kind === "headline") return <ul className="grid gap-1">{item(<Inbox className="size-3.5" />, "Inbox", true, "4")}{item(<Send className="size-3.5" />, "Sent")}{item(<FileText className="size-3.5" />, "Drafts")}{item(<Star className="size-3.5" />, "Flagged")}</ul>;
  if (kind === "bugfix" || kind === "trace") return <ul className="grid gap-0.5 font-mono">{item(<FileText className="size-3.5" />, "src/")}{item(<FileText className="size-3.5" />, "  app.js", true)}{item(<FileText className="size-3.5" />, "  utils.js")}{item(<Bug className="size-3.5" />, "1 failing test", false, "!")}</ul>;
  if (kind === "sql") return <ul className="grid gap-1 font-mono">{item(<Database className="size-3.5" />, "customers")}{item(<Database className="size-3.5" />, "orders", true)}{item(<Database className="size-3.5" />, "products")}</ul>;
  return <ul className="grid gap-1">{item(<Mail className="size-3.5" />, "Today", true)}{item(<FileText className="size-3.5" />, "Records")}{item(<Star className="size-3.5" />, "Guidance")}</ul>;
}

export function WorkInterface({ taskKind, place, children }: { taskKind: string; /** Workplace or role id, for the app branding. */ place?: string; children: ReactNode }) {
  const kind = KIND_OF[taskKind] ?? "computer";
  const app = APPS[place ?? ""] ?? { name: "Work", colour: "#13203a" };
  if (kind === "computer")
    return (
      <div className="overflow-hidden rounded-2xl border-4 border-[#1b1f2a] bg-[#1b1f2a] shadow-2xl">
        <div className="flex items-center gap-2 px-3 py-1.5 text-white" style={{ background: app.colour }}>
          <span className="flex gap-1">{["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} className="size-2.5 rounded-full" style={{ background: c }} />)}</span>
          <MonitorSmartphone className="size-3.5" />
          <span className="text-xs font-black">{app.name}</span>
          <span className="ml-auto text-[10px] opacity-80">Signed in · On shift</span>
        </div>
        <div className="grid bg-[#eef1f6] md:grid-cols-[170px_1fr]">
          <aside className="hidden border-r border-black/10 p-2 md:block"><Sidebar kind={taskKind} /></aside>
          <div className="min-w-0 bg-white">{children}</div>
        </div>
      </div>
    );
  if (kind === "till")
    return (
      <div className="rounded-[28px] border-b-8 border-[#0d3a2c] bg-[#14563f] p-3 shadow-2xl">
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#0b1f17] px-3 py-2 font-mono text-[#7ef0b0]">
          <ScanLine className="size-4" /><span className="text-xs">TILL 03 · {app.name === "Work" ? "Checkout" : app.name}</span>
          <span className="ml-auto animate-pulse text-xs">● READY</span>
        </div>
        <div className="rounded-xl bg-[#fffdf6]">{children}</div>
        <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-white/70"><Receipt className="size-3.5" /> Scan · Bag · Pay · Receipt</div>
      </div>
    );
  if (kind === "kitchen")
    return (
      <div className="rounded-2xl bg-[#3a2b22] p-3 shadow-2xl">
        <div className="mb-2 flex gap-2 overflow-hidden">
          {[0, 1, 2].map((i) => <span key={i} className={cn("h-10 w-16 shrink-0 rounded-b-md border-t-4 border-[#9aa0a8] bg-[#fffaf0] shadow", i === 0 ? "rotate-[-2deg]" : "opacity-60")} />)}
          <span className="ml-auto self-center text-xs font-black text-[#ffd166]">ORDERS ON THE RAIL</span>
        </div>
        <div className="rounded-xl bg-[#fffaf0]">{children}</div>
      </div>
    );
  if (kind === "monitor")
    return (
      <div className="rounded-2xl border-4 border-[#2a2f3a] bg-[#0b1018] p-3 shadow-2xl">
        <div className="mb-2 flex items-center gap-3 font-mono text-xs">
          <Activity className="size-4 text-[#4cf08a]" />
          <svg viewBox="0 0 200 30" className="h-7 flex-1"><polyline fill="none" stroke="#4cf08a" strokeWidth="2" points="0,15 40,15 50,15 55,3 60,27 65,15 110,15 120,15 125,5 130,25 135,15 200,15" style={{ strokeDasharray: 260, animation: "ecg 1.6s linear infinite" }} /></svg>
          <span className="text-[#4cf08a]">HR 82</span><span className="text-[#5ec8ff]">SpO₂ 97%</span>
          <style>{"@keyframes ecg{from{stroke-dashoffset:260}to{stroke-dashoffset:0}}"}</style>
        </div>
        <div className="rounded-xl bg-white">{children}</div>
      </div>
    );
  if (kind === "tablet")
    return (
      <div className="rounded-[32px] border-[10px] border-[#1d2027] bg-[#1d2027] shadow-2xl">
        <div className="flex items-center gap-2 rounded-t-2xl bg-[#f2a541] px-3 py-1.5 text-xs font-black text-[#13203a]"><Wrench className="size-3.5" /> {taskKind === "parcelAddress" ? "Parcel scanner" : taskKind === "taxiFare" ? "Meter" : taskKind === "busTimetable" ? "Driver's console" : taskKind === "stock" ? "Stock app" : "Diagnostics"}</div>
        <div className="rounded-b-2xl bg-white">{children}</div>
      </div>
    );
  return (
    <div className="relative rounded-2xl bg-[#a8742b] p-3 pt-6 shadow-2xl">
      <span className="absolute top-0 left-1/2 h-5 w-20 -translate-x-1/2 -translate-y-1/3 rounded-md border-2 border-[#9aa0a8] bg-[#c9ced6]" />
      <div className="rounded-lg bg-[#fffdf6]">{children}</div>
    </div>
  );
}
