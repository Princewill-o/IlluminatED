"use client";
import { useEffect, useRef, useState } from "react";

import { MessageCircle, Send, X } from "lucide-react";

import { HudSlot } from "./hud";

import { CHAT_LIMIT, type RoomMessage } from "@/game/core/room-chat";

export function RoomChat({messages, connected, onSend, hidden, room, meId}:{messages:RoomMessage[]; connected:boolean; onSend:(text:string)=>Promise<string|null>; hidden:Set<string>; room:string;meId?:string}) {
  const [open,setOpen]=useState(false), [draft,setDraft]=useState(""), [error,setError]=useState<string|null>(null), [busy,setBusy]=useState(false);
  const end=useRef<HTMLDivElement>(null), seen=useRef(0);
  const visible=messages.filter(m=>!hidden.has(m.userId));
  useEffect(()=>{if(open){end.current?.scrollIntoView({block:"nearest"});seen.current=messages.length;}},[open,messages]);
  const unread=open?0:Math.max(0,messages.length-seen.current);
  return <HudSlot area="bl-row" order={1}><div className="relative" onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()}>
    {open && <section aria-label="In-game chat" className="absolute bottom-full left-0 z-10 mb-2 flex max-h-[min(55dvh,26rem)] w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-[#dce1de] bg-[#f2f2f7]/95 text-[#172b28] [color-scheme:light] shadow-xl">
      <header className="flex items-center justify-between gap-2 border-b border-black/5 bg-white/90 px-3 py-2"><div><h2 className="text-sm font-bold">Room chat · {room}</h2><p className="text-[10px] text-[#63716e]">{connected?"Live · players in this map and server":"Disconnected · sending unavailable"}</p></div><button type="button" aria-label="Close chat" onClick={()=>setOpen(false)} className="grid size-9 place-items-center"><X className="size-4"/></button></header>
      <div role="log" aria-label="Room messages" aria-live="polite" aria-relevant="additions" className="min-h-24 overflow-y-auto p-3 text-xs select-text">
        {!visible.length && <p className="text-[#63716e]">No messages yet. Say hello to other players here.</p>}
        {visible.map(m=><p key={m.id} className={`mb-2 w-fit max-w-[90%] rounded-2xl px-3 py-2 break-words ${m.userId===meId?"ml-auto rounded-br-md bg-[#1675ed] text-white":"rounded-bl-md bg-[#e5e5ea] text-[#172b28]"}`}><span className="mb-1 block text-[10px] font-bold opacity-70">{m.username}</span>{m.text}</p>)}<div ref={end}/>
      </div>
      <form className="border-t border-black/5 p-2" onSubmit={async e=>{e.preventDefault();if(busy||!draft.trim()||!connected)return;setBusy(true);setError(null);try {const failure=await onSend(draft);if(failure)setError(failure);else setDraft("");}finally{setBusy(false);}}}>
        <div className="flex gap-1"><input aria-label="Chat message" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={CHAT_LIMIT} disabled={!connected||busy} placeholder={connected?"Say something…":"Connect to chat"} className="min-w-0 flex-1 rounded-full border border-[#dce1de] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#efd2a0] disabled:opacity-50"/><button type="submit" aria-label="Send chat message" disabled={!connected||busy||!draft.trim()} className="jelly grid size-10 place-items-center rounded-full bg-[#1675ed] text-white disabled:opacity-40"><Send className="size-4"/></button></div>
        <p className="mt-1 text-[10px] text-[#63716e]">{draft.length}/{CHAT_LIMIT} · Be kind. Keep personal details private.</p>
        {error&&<p role="alert" className="mt-1 text-xs text-[#ffc6b8]">{error}</p>}
      </form>
    </section>}
    <button type="button" aria-label="Open room chat" aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="jelly flex min-h-10 items-center gap-2 rounded-full border border-white/25 bg-[#102434] px-3 text-xs font-bold text-white shadow-lg"><MessageCircle className="size-4"/>Chat {unread>0&&<span className="rounded-full bg-[#efd2a0] px-1.5 text-[#102434]">{unread}</span>}</button>
  </div></HudSlot>;
}
