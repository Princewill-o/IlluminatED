import type { Metadata } from "next";

export const metadata: Metadata = { icons: { icon: "/brand/products/world.svg" } };

export default function WorldLayout({ children }: { children: React.ReactNode }) {
  return children;
}
