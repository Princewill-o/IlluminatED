import type { Metadata } from "next";

import { SocialFooter, SocialHeader } from "@/components/social/chrome";
import { getViewer } from "@/lib/social/server";

export const metadata: Metadata = {
  title: { absolute: "IlluminatEDSocial", template: "%s | IlluminatEDSocial" },
  description:
    "Talk to students who've been there: sixth form, universities, applying, apprenticeships and student life.",
};

export const dynamic = "force-dynamic";

export default async function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  return (
    <div className="social min-h-screen">
      <SocialHeader viewer={viewer} />
      <div>{children}</div>
      <SocialFooter />
    </div>
  );
}
