"use client";

import { useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { X } from "lucide-react";

/** Shown on the landing page after someone deletes their account (/?deleted=1). */
export function DeletedNotice() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  if (!open || !params.get("deleted")) return null;

  const dismiss = () => {
    setOpen(false);
    // Tidy the address bar so a refresh doesn't bring it back.
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="container pt-6">
      <div
        role="status"
        className="bg-muted/60 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm"
      >
        <p className="font-medium">Your account has been deleted.</p>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground hover:bg-muted -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md"
          aria-label="Dismiss"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
