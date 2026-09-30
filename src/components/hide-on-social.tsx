"use client";

import { usePathname } from "next/navigation";

/** IlluminatEDSocial has its own header and footer, so the main site chrome steps aside there. */
export function HideOnSocial({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith("/social") ? null : <>{children}</>;
}
