import { notFound } from "next/navigation";

import type { Metadata } from "next";

import { ThreadList } from "@/components/social/thread-list";
import { socialConfigured } from "@/lib/social/config";
import { getProfile } from "@/lib/social/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  return { title: decodeURIComponent((await params).username) };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const username = decodeURIComponent((await params).username);
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) notFound();
  const p = await getProfile(username);
  if (!p) notFound();
  return (
    <div className="container max-w-3xl py-10 lg:py-14">
      <h1 className="text-4xl tracking-tight">{p.username}</h1>
      <p className="text-muted-foreground mt-2">
        {p.role === "moderator" && (
          <span className="text-primary mr-2 font-semibold">Moderator</span>
        )}
        Joined{" "}
        {new Date(p.joined).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })}
      </p>
      <h2 className="mt-10 mb-3 text-lg font-semibold">Threads</h2>
      <ThreadList threads={p.threads} example={!socialConfigured} />
    </div>
  );
}
