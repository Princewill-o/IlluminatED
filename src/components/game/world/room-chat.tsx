"use client";
import { useEffect, useRef, useState } from "react";

import { ArrowUp, MessageCircle, X } from "lucide-react";

import { HudSlot } from "./hud";

import { CHAT_LIMIT, type RoomMessage } from "@/game/core/room-chat";

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** In-game room chat, styled like iMessage: blue bubbles for you, grey for everyone else. */
export function RoomChat({messages, connected, onSend, hidden, room, selfId}:{messages:RoomMessage[]; connected:boolean; onSend:(text:string)=>Promise<string|null>; hidden:Set<string>; room:string; selfId?:string}) {
  const [open,setOpen]=useState(false), [draft,setDraft]=useState(""), [error,setError]=useState<string|null>(null), [busy,setBusy]=useState(false);
  const end=useRef<HTMLDivElement>(null), seen=useRef(0);
  const visible=messages.filter(m=>!hidden.has(m.userId));
  useEffect(()=>{if(open){end.current?.scrollIntoView({block:"nearest"});seen.current=messages.length;}},[open,messages]);
  const unread=open?0:Math.max(0,messages.length-seen.current);
  const send=async()=>{if(busy||!draft.trim()||!connected)return;setBusy(true);setError(null);try{const failure=await onSend(draft);if(failure)setError(failure);else setDraft("");}finally{setBusy(false);}};
  return <HudSlot area="bl-row" order={1}><div className="relative" onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()}>
    {open && <section aria-label="In-game chat" className="imsg absolute bottom-full left-0 z-10 mb-2 flex max-h-[min(60dvh,30rem)] w-[22rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[22px] border border-black/10 bg-white/90 text-[#1c1c1e] shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#1c1c1e]/90 dark:text-white">
      <header className="relative flex flex-col items-center gap-0.5 border-b border-black/10 bg-[#f6f6f6]/80 px-3 pt-2 pb-1.5 dark:border-white/10 dark:bg-[#2c2c2e]/80">
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-gradient-to-b from-[#a5abb8] to-[#858994] text-xs font-semibold text-white">{room.slice(0,1).toUpperCase()}</span>
        <h2 className="text-[11px] font-medium">{room}</h2>
        <p className="text-[10px] text-[#8e8e93]">{connected?"Players on this map and server":"Not connected"}</p>
        <button type="button" aria-label="Close chat" onClick={()=>setOpen(false)} className="gloss-off absolute top-2 right-2 grid size-8 place-items-center rounded-full text-[#0a84ff] hover:bg-black/5 dark:hover:bg-white/10"><X className="size-4"/></button>
      </header>
      <div role="log" aria-label="Room messages" aria-live="polite" aria-relevant="additions" className="min-h-28 flex-1 overflow-y-auto px-3 py-2 text-[13px] leading-snug select-text">
        {!visible.length && <p className="py-6 text-center text-xs text-[#8e8e93]">No messages yet. Say hello to other players.</p>}
        {visible.map((m,i)=>{
          const mine=m.userId===selfId, prev=visible[i-1], next=visible[i+1];
          const first=!prev||prev.userId!==m.userId||m.at-prev.at>5*60e3;
          const last=!next||next.userId!==m.userId||next.at-m.at>5*60e3;
          const gap=!prev||m.at-prev.at>10*60e3;
          return <div key={m.id}>
            {gap&&<p className="mt-2 mb-1 text-center text-[10px] text-[#8e8e93]"><span className="font-semibold">Today</span> {time(m.at)}</p>}
            {first&&!mine&&<p className="mt-1.5 ml-3 text-[10px] text-[#8e8e93]">{m.username}</p>}
            <div className={`flex ${mine?"justify-end":"justify-start"} ${last?"mb-1.5":"mb-0.5"}`}>
              <p title={time(m.at)} className={`imsg-bubble relative max-w-[78%] rounded-[18px] px-3 py-1.5 break-words ${mine?"bg-[#0a84ff] text-white":"bg-[#e9e9eb] text-black dark:bg-[#3a3a3c] dark:text-white"} ${last?(mine?"imsg-tail-r rounded-br-[6px]":"imsg-tail-l rounded-bl-[6px]"):""}`}>{m.text}</p>
            </div>
          </div>;
        })}<div ref={end}/>
      </div>
      <form className="px-2 pt-1 pb-2" onSubmit={e=>{e.preventDefault();void send();}}>
        <div className="flex items-end gap-1 rounded-[20px] border border-black/15 bg-white py-1 pr-1 pl-3 dark:border-white/20 dark:bg-[#1c1c1e]">
          <input aria-label="Chat message" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={CHAT_LIMIT} disabled={!connected||busy} placeholder={connected?"iMessage":"Connect to chat"} className="min-w-0 flex-1 bg-transparent py-1 text-[13px] outline-none placeholder:text-[#8e8e93] disabled:opacity-50"/>
          <button type="submit" aria-label="Send chat message" disabled={!connected||busy||!draft.trim()} className="gloss-off grid size-7 shrink-0 place-items-center rounded-full bg-[#0a84ff] text-white transition disabled:bg-[#c7c7cc] dark:disabled:bg-[#48484a]"><ArrowUp className="size-4" strokeWidth={3}/></button>
        </div>
        <p className="mt-1 px-2 text-[10px] text-[#8e8e93]">{draft.length}/{CHAT_LIMIT} · Be kind. Keep personal details private.</p>
        {error&&<p role="alert" className="mt-1 px-2 text-xs text-[#ff3b30]">{error}</p>}
      </form>
    </section>}
    <button type="button" aria-label="Open room chat" aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="jelly flex min-h-10 items-center gap-2 rounded-full border border-white/25 bg-[#0a84ff] px-3 text-xs font-bold text-white shadow-lg"><MessageCircle className="size-4"/>Chat {unread>0&&<span className="rounded-full bg-[#ff3b30] px-1.5 text-white">{unread}</span>}</button>
  </div></HudSlot>;
}
