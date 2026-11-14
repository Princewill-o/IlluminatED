import type { Metadata } from "next";

export const metadata: Metadata = { icons: { icon: "/brand/products/science.svg" } };

export default function ScienceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
