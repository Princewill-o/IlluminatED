import { NextResponse } from "next/server";

import { getSupabase, getViewer } from "@/lib/social/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const [viewer, sb] = await Promise.all([getViewer(), getSupabase()]);
  if (!viewer || !sb) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const [school, friendSettings, connections, threads, replies, blocks] = await Promise.all([
    sb.from("private_school").select("school_name,updated_at").eq("user_id", viewer.id).maybeSingle(),
    sb.from("social_friend_settings").select("allow_requests").eq("user_id", viewer.id).maybeSingle(),
    sb.from("social_connections").select("requester,recipient,status,created_at").or(`requester.eq.${viewer.id},recipient.eq.${viewer.id}`),
    sb.from("threads").select("id,category,university,title,body,created_at").eq("author_id", viewer.id),
    sb.from("posts").select("id,thread_id,body,created_at").eq("author_id", viewer.id),
    sb.from("user_blocks").select("blocked,created_at").eq("blocker", viewer.id),
  ]);
  if (threads.error || replies.error || blocks.error) return NextResponse.json({ error: "Export unavailable" }, { status: 503 });
  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: viewer.id, email: viewer.email, username: viewer.profile?.username },
    privateSchool: school.error ? "Not available" : school.data,
    friendRequestsAllowed: friendSettings.error ? "Not available" : (friendSettings.data?.allow_requests ?? false),
    connections: connections.error ? "Not available" : connections.data,
    threads: threads.data,
    replies: replies.data,
    blocks: blocks.data,
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": "attachment; filename=illuminated-social-data.json",
      "Cache-Control": "private, no-store",
    },
  });
}
