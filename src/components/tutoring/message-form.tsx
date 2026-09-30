"use client";

import { useActionState, useEffect, useRef } from "react";

import { Status, Submit } from "@/components/account/forms-common";
import { fieldCls, labelCls } from "@/components/kit";
import { sendTutorMessage } from "@/lib/tutor-actions";
import { cn } from "@/lib/utils";

export function MessageForm({ requestId }: { requestId: number }) {
  const [state, action] = useActionState(sendTutorMessage, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor="msg" className={labelCls}>
        Write a message
      </label>
      <textarea
        id="msg"
        name="body"
        required
        maxLength={4000}
        rows={4}
        className={cn(fieldCls, "h-auto py-2.5 leading-relaxed")}
      />
      <div className="flex flex-wrap items-center gap-4">
        <Submit pendingLabel="Sending…">Send</Submit>
        <Status state={state} />
      </div>
    </form>
  );
}
