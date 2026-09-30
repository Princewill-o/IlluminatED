"use client";

import { useEffect, useState } from "react";

import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      role="status"
      className="bg-accent text-accent-foreground fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-lg items-center gap-2 rounded-2xl px-4 py-3 text-sm shadow-lg"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      You're offline. Pages you've opened and your saved progress still work;
      live searches will resume when you reconnect.
    </div>
  );
}
