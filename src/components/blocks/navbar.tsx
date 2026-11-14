"use client";

import { usePathname } from "next/navigation";

import { LearningHeader } from "@/components/products/learning-chrome";

export function Navbar() {
  const path = usePathname();
  return path.startsWith("/social") ? null : <LearningHeader />;
}
