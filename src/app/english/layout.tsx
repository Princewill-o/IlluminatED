import type { Metadata } from "next";

export const metadata: Metadata = { icons: { icon: "/brand/products/english.svg" } };

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return children;
}
