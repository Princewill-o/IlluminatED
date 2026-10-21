import type { Metadata } from "next";

import { AgentWorkspace } from "@/components/agent/agent-workspace";
import { requireAccount } from "@/lib/account/server";

export const metadata: Metadata = { title: "Study agent" };

export default async function AgentPage() {
  const account = await requireAccount("/agent");
  return (
    <div className="mx-auto max-w-6xl px-3 pt-4 pb-8 md:px-4 md:pt-6">
      <AgentWorkspace name={account.profile.username} />
    </div>
  );
}
