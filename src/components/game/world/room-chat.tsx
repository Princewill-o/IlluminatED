"use client";
import { useEffect, useRef, useState } from "react";

import { MessageCircle, Send, X } from "lucide-react";

import { CHAT_LIMIT, type RoomMessage } from "@/game/core/room-chat";

export function RoomChat({messages, connected, onSend, hidden, room}:{messages:RoomMessage[]; connected:boolean; onSend:(text:string)=>Promise<string|null>; hidden:Set<string>; room:string}) {
  const [open,setOpen]=useState(false), [draft,setDraft]=useState(""), [error,setError]=useState<string|null>(null), [busy,setBusy]=useState(false);
  const end=useRef<HTMLDivElement>(null), seen=useRef(0);
  const visible=messages.filter(m=>!hidden.has(m.userId));
  useEffect(()=>{if(open){end.current?.scrollIntoView({block:"nearest"});seen.current=messages.length;}},[open,messages]);
  const unread=open?0:Math.max(0,messages.length-seen.current);
  return <div className="absolute bottom-24 left-3 z-[100002] pointer-events-auto max-w-[calc(100%-1.5rem)]" onKeyDown={e=>e.stopPropagation()} onKeyUp={e=>e.stopPropagation()}>
    {open && <section aria-label="In-game chat" className="mb-2 flex max-h-[55dvh] w-80 flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#102434]/95 text-white shadow-xl">
      <header className="flex items-center justify-between gap-2 border-b border-white/15 px-3 py-2"><div><h2 className="text-sm font-bold">Room chat · {room}</h2><p className="text-[10px] text-white/70">{connected?"Live · players in this map and server":"Disconnected · sending unavailable"}</p></div><button type="button" aria-label="Close chat" onClick={()=>setOpen(false)} className="grid size-9 place-items-center"><X className="size-4"/></button></header>
      <div role="log" aria-label="Room messages" aria-live="polite" aria-relevant="additions" className="min-h-24 overflow-y-auto p-3 text-xs select-text">
        {!visible.length && <p className="text-white/60">No messages yet. Say hello to other players here.</p>}
        {visible.map(m=><p key={m.id} className="mb-2 break-words"><span className="font-bold text-[#efd2a0]">{m.username}: </span>{m.text}</p>)}<div ref={end}/>
      </div>
      <form className="border-t border-white/15 p-2" onSubmit={async e=>{e.preventDefault();if(busy||!draft.trim()||!connected)return;setBusy(true);setError(null);try {const failure=await onSend(draft);if(failure)setError(failure);else setDraft("");}finally{setBusy(false);}}}>
        <div className="flex gap-1"><input aria-label="Chat message" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={CHAT_LIMIT} disabled={!connected||busy} placeholder={connected?"Say something…":"Connect to chat"} className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#efd2a0] disabled:opacity-50"/><button type="submit" aria-label="Send chat message" disabled={!connected||busy||!draft.trim()} className="grid size-10 place-items-center rounded-xl bg-[#efd2a0] text-[#102434] disabled:opacity-40"><Send className="size-4"/></button></div>
        <p className="mt-1 text-[10px] text-white/60">{draft.length}/{CHAT_LIMIT} · Be kind. Keep personal details private.</p>
        {error&&<p role="alert" className="mt-1 text-xs text-[#ffc6b8]">{error}</p>}
      </form>
    </section>}
    <button type="button" aria-label="Open room chat" aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="flex min-h-10 items-center gap-2 rounded-full border border-white/25 bg-[#102434] px-3 text-xs font-bold text-white shadow-lg"><MessageCircle className="size-4"/>Chat {unread>0&&<span className="rounded-full bg-[#efd2a0] px-1.5 text-[#102434]">{unread}</span>}</button>
  </div>;
}
