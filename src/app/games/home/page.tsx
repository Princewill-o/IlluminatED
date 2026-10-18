import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your home" };

export default function HomePage() {
  redirect("/games/world?map=home&build=1");
}
