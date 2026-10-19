"use client";

import { useState } from "react";

import { Landmark, X } from "lucide-react";

import { worldBankBorrow, worldBankRepay } from "@/app/games/world/actions";

export type BankLoan = { balance: number; principal?: number; due_at?: string; status: string; clout?: number };

export function BankDialog({ loan, clout, gameDate, onClose, onUpdate }: {
  loan: BankLoan; clout: number; gameDate: Date; onClose: () => void;
  onUpdate: (loan: BankLoan, clout?: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remaining = loan.due_at ? Math.max(0, Math.ceil((new Date(loan.due_at).getTime() - Date.now()) / 900_000)) : 0;
  const act = async (amount?: number) => {
    setBusy(true); setError("");
    try {
      const result = amount ? await worldBankBorrow(amount) : await worldBankRepay();
      if (!result.ok) { setError(result.error); return; }
      onUpdate(result.loan, result.loan.clout);
    } catch { setError("Couldn't reach the bank. Try again shortly."); }
    finally { setBusy(false); }
  };
  return <div className="absolute inset-0 z-[100009] grid place-items-center bg-[#101a2b]/70 p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-label="Thames and Co Bank" className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/15 bg-[#f5f0e5] text-[#142039] shadow-2xl">
      <header className="flex items-center gap-4 bg-[#142039] p-5 text-white">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#e4bd76] text-[#142039]"><Landmark size={25}/></span>
        <div className="flex-1"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#e4bd76]">London · Riverside Campus</p><h2 className="text-xl font-black">Thames &amp; Co Bank</h2></div>
        <button onClick={onClose} aria-label="Close bank" className="rounded-full p-2 hover:bg-white/10"><X size={20}/></button>
      </header>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center justify-between rounded-2xl bg-white/75 px-4 py-3"><span className="text-sm font-bold text-slate-600">Game time</span><span className="text-right text-sm font-black">{gameDate.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})} · {gameDate.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span></div>
        {loan.balance > 0 ? <div className="rounded-2xl border border-[#e5d7ba] bg-white p-4">
          <div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Outstanding balance</p><p className="mt-1 text-3xl font-black">{loan.balance.toLocaleString()} <span className="text-base text-slate-500">Clout</span></p></div><span className={`h-fit rounded-full px-3 py-1 text-xs font-black ${loan.status === "court" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>{loan.status === "court" ? "Court appearance due" : `${remaining} game day${remaining === 1 ? "" : "s"} left`}</span></div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">Loan terms: 10% service charge, repay the full balance. One game day lasts 15 real minutes. An unpaid loan is referred to Crown Court after three game days.</p>
          <button disabled={busy || clout < loan.balance} onClick={() => void act()} className="mt-4 w-full rounded-xl bg-[#173e8a] px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Processing…" : `Repay ${loan.balance.toLocaleString()} Clout`}</button>
          {clout < loan.balance && <p className="mt-2 text-xs font-semibold text-rose-700">You need {(loan.balance-clout).toLocaleString()} more Clout to repay.</p>}
        </div> : <div><p className="mb-3 text-sm leading-relaxed text-slate-600">Borrow a small amount of Clout to get started. Your full balance is due in three accelerated game days.</p><div className="grid grid-cols-3 gap-2">{[100,250,500].map(amount=><button key={amount} disabled={busy} onClick={()=>void act(amount)} className="rounded-2xl border border-[#d9c8a9] bg-white p-3 text-left hover:border-[#173e8a] disabled:opacity-50"><span className="block text-lg font-black">{amount}</span><span className="text-[11px] font-semibold text-slate-500">Repay {Math.ceil(amount*1.1)} · due in 3 days</span></button>)}</div></div>}
        {error && <p role="alert" className="rounded-xl bg-rose-100 px-3 py-2 text-sm font-bold text-rose-800">{error}</p>}
        <p className="text-center text-[11px] font-medium text-slate-500">Accelerated game time keeps progress moving while you’re away.</p>
      </div>
    </section>
  </div>;
}
