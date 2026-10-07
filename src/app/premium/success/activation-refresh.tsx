"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

export function ActivationRefresh() {
  const router = useRouter();
  useEffect(() => {
    let attempts = 0;
    const timer = setInterval(() => {
      router.refresh();
      if (++attempts >= 6) clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <p className="mt-4 text-sm text-slate-600" role="status">
      We’re updating your account. This page checks automatically for a short
      time. You can also refresh to check again.
    </p>
  );
}
