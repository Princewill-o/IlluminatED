import type { Metadata } from "next";

export const metadata: Metadata = { icons: { icon: "/brand/products/maths.svg" } };

export default function MathsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
