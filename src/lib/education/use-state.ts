"use client";
import { useEffect, useRef, useState } from "react";

import { normaliseState, validStateItem, type EducationState } from "./state";

import { readStore, writeStore } from "@/lib/storage";
import { browserSupabase } from "@/lib/supabase-browser";
type Status = "loading" | "device" | "saved" | "saving" | "offline";
/** Durable local outbox + atomic item writes. Account IDs never come from a request body. */
export function useEducationState(
  namespace: string,
  defaults: EducationState = {},
) {
  const [state, setState] = useState<EducationState>(defaults);
  const [status, setStatus] = useState<Status>("loading");
  const [refresh, setRefresh] = useState(0);
  const scope = useRef("guest");
  const generation = useRef(0);
  const pending = useRef(new Map<string, string | boolean>());
  const queue = useRef(Promise.resolve());
  const localKey = () => `education:${scope.current}:${namespace}`;
  const storePending = () =>
    writeStore(localKey() + ":pending", Object.fromEntries(pending.current));
  const enqueue = (item: string, value: string | boolean, revision: number) => {
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (generation.current !== revision) return;
        try {
          const r = await fetch("/api/education/state", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ namespace, item, value }),
          });
          if (!r.ok) throw new Error("Not saved");
          const result = await r.json();
          if (generation.current !== revision) return;
          if (pending.current.get(item) === value) pending.current.delete(item);
          storePending();
          const merged = {
            ...defaults,
            ...normaliseState(namespace, result.value),
            ...Object.fromEntries(pending.current),
          };
          setState(merged);
          writeStore(localKey(), merged);
          setStatus(pending.current.size ? "saving" : "saved");
        } catch {
          if (generation.current === revision) setStatus("offline");
        }
      });
  };
  useEffect(() => {
    const sb = browserSupabase();
    const { data } = sb?.auth.onAuthStateChange(() =>
      setRefresh((n) => n + 1),
    ) ?? { data: null };
    const online = () => setRefresh((n) => n + 1);
    window.addEventListener("online", online);
    return () => {
      data?.subscription.unsubscribe();
      window.removeEventListener("online", online);
    };
  }, []);
  useEffect(() => {
    const revision = ++generation.current;
    const ctrl = new AbortController();
    setStatus("loading");
    async function load() {
      const sb = browserSupabase();
      const session = sb ? await sb.auth.getSession() : null;
      if (ctrl.signal.aborted) return;
      scope.current = session?.data.session?.user.id ?? "guest";
      const local = normaliseState(namespace, readStore(localKey(), {}));
      // Keep older device-only choices for guests. Never copy shared guest data into an account.
      if (scope.current === "guest" && !Object.keys(local).length) {
        if (namespace === "career")
          local.route = readStore("next-steps:guest", "unsure");
        if (namespace === "saved-opportunities")
          for (const id of readStore<string[]>("saved-opportunities:guest", []))
            local[id] = true;
        if (namespace.startsWith("syllabus:"))
          for (const [key, value] of Object.entries(
            readStore<Record<string, boolean>>("syllabus-checks", {}),
          ))
            if (key.startsWith(namespace.slice(9) + ":")) local[key] = value;
      }
      pending.current = new Map(
        Object.entries(
          normaliseState(namespace, readStore(localKey() + ":pending", {})),
        ),
      );
      setState({
        ...defaults,
        ...normaliseState(namespace, local),
        ...Object.fromEntries(pending.current),
      });
      if (scope.current === "guest") {
        setStatus("device");
        return;
      }
      try {
        const r = await fetch(
          `/api/education/state?namespace=${encodeURIComponent(namespace)}`,
          { cache: "no-store", signal: ctrl.signal },
        );
        if (!r.ok) throw new Error("Not saved");
        const result = await r.json();
        if (generation.current !== revision || ctrl.signal.aborted) return;
        const merged = {
          ...defaults,
          ...normaliseState(namespace, result.value),
          ...Object.fromEntries(pending.current),
        };
        setState(merged);
        writeStore(localKey(), merged);
        setStatus(pending.current.size ? "saving" : "saved");
        for (const [item, value] of pending.current)
          enqueue(item, value, revision);
      } catch {
        if (!ctrl.signal.aborted) setStatus("offline");
      }
    }
    void load();
    return () => {
      ctrl.abort();
      // This is a request-generation counter, not a DOM ref; invalidate queued work on cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++generation.current;
    };
    // Defaults and helpers use this load's namespace; reload only on namespace/auth/retry changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, refresh]);
  const setItem = (item: string, value: string | boolean) => {
    if (status === "loading" || !validStateItem(namespace, item, value)) return;
    const revision = generation.current;
    const storageKey = localKey();
    setState((prev) => {
      const next = { ...prev, [item]: value };
      writeStore(storageKey, next);
      return next;
    });
    if (scope.current === "guest") {
      setStatus("device");
      return;
    }
    pending.current.set(item, value);
    storePending();
    setStatus("saving");
    enqueue(item, value, revision);
  };
  const message = {
    loading: "Loading saved choices…",
    device: "Saved on this device. Sign in to save across devices.",
    saved: "Saved to your account.",
    saving: "Saving to your account…",
    offline:
      "Saved on this device. Account sync is unavailable; your changes will retry when connected.",
  }[status];
  return {
    state,
    setItem,
    status,
    message,
    retry: () => setRefresh((n) => n + 1),
  };
}
