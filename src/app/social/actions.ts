"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { categoryBySlug, REPORT_REASONS } from "@/lib/social/config";
import { getSupabase, getViewer } from "@/lib/social/server";

export type FormState = {
  ok?: boolean;
  error?: string;
  message?: string;
} | null;

const NOT_CONNECTED =
  "IlluminatEDSocial isn't connected to its database yet, so this can't be saved.";

/** Turn database errors into plain explanations. */
function explain(err: { message?: string; code?: string } | null): string {
  const m = err?.message ?? "";
  if (m.includes("contact_details"))
    return "Please don't share email addresses or phone numbers. Keep contact details off the forum to stay safe.";
  if (m.includes("blocked_term"))
    return "Your post includes words that aren't allowed here. Please edit it and try again.";
  if (m.includes("rate_limited"))
    return "You're posting very quickly. Wait a minute and try again.";
  if (err?.code === "23505") return "You've already done that.";
  if (m.includes("row-level security"))
    return "You can't do that right now. If your account has been restricted, you won't be able to post.";
  return "Something went wrong. Please try again.";
}

/** Friendly checks before we hit the database (the database enforces them too). */
function checkText(text: string): string | null {
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text))
    return "Please don't share email addresses. Keep contact details off the forum.";
  if (/(\+44|0)7\d{9}/.test(text.replace(/[\s().-]/g, "")))
    return "Please don't share phone numbers. Keep contact details off the forum.";
  return null;
}

export async function createThread(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  const viewer = await getViewer();
  if (!viewer?.profile)
    return { error: "Sign in and choose a username to post." };
  const category = String(fd.get("category") ?? "");
  const title = String(fd.get("title") ?? "").trim();
  const body = String(fd.get("body") ?? "").trim();
  const university = String(fd.get("university") ?? "").trim() || null;
  if (!categoryBySlug(category)) return { error: "Choose a category." };
  if (title.length < 5 || title.length > 120)
    return { error: "Titles need to be between 5 and 120 characters." };
  if (body.length < 10 || body.length > 5000)
    return { error: "Posts need to be between 10 and 5,000 characters." };
  if (university && (university.length < 2 || university.length > 80))
    return { error: "Keep the university name under 80 characters." };
  const bad = checkText(`${title} ${body}`);
  if (bad) return { error: bad };
  const { data, error } = await sb
    .from("threads")
    .insert({ category, title, body, university, author_id: viewer.id })
    .select("id")
    .single();
  if (error || !data) return { error: explain(error) };
  revalidatePath("/social");
  redirect(`/social/t/${data.id}`);
}

export async function createReply(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  const viewer = await getViewer();
  if (!viewer?.profile)
    return { error: "Sign in and choose a username to reply." };
  const threadId = Number(fd.get("threadId"));
  const body = String(fd.get("body") ?? "").trim();
  if (!Number.isInteger(threadId))
    return { error: "Something went wrong. Please refresh." };
  if (body.length < 1 || body.length > 5000)
    return { error: "Replies need to be between 1 and 5,000 characters." };
  const bad = checkText(body);
  if (bad) return { error: bad };
  const { error } = await sb
    .from("posts")
    .insert({ thread_id: threadId, body, author_id: viewer.id });
  if (error) return { error: explain(error) };
  revalidatePath(`/social/t/${threadId}`);
  return { ok: true, message: "Reply posted." };
}

export async function reportContent(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  const viewer = await getViewer();
  if (!viewer?.profile) return { error: "Sign in to report posts." };
  const kind = fd.get("kind");
  const id = Number(fd.get("id"));
  const reason = String(fd.get("reason") ?? "");
  const note =
    String(fd.get("note") ?? "")
      .trim()
      .slice(0, 300) || null;
  if (!REPORT_REASONS.some((r) => r.value === reason))
    return { error: "Choose a reason." };
  if (!Number.isInteger(id) || (kind !== "thread" && kind !== "post"))
    return { error: "Something went wrong. Please refresh." };
  const { error } = await sb.from("reports").insert({
    [kind === "thread" ? "thread_id" : "post_id"]: id,
    reason,
    note,
  });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "You've already reported this. Thanks."
          : explain(error),
    };
  return { ok: true, message: "Thanks. Our moderators will take a look." };
}

export async function deleteOwn(fd: FormData) {
  const sb = await getSupabase();
  if (!sb) return;
  const kind = fd.get("kind");
  const id = Number(fd.get("id"));
  const threadId = Number(fd.get("threadId"));
  if (!Number.isInteger(id)) return;
  await sb
    .from(kind === "thread" ? "threads" : "posts")
    .delete()
    .eq("id", id);
  if (kind === "thread") redirect("/social");
  revalidatePath(`/social/t/${threadId}`);
}

export async function moderate(fd: FormData) {
  const sb = await getSupabase();
  const viewer = await getViewer();
  if (!sb || viewer?.profile?.role !== "moderator") return;
  const kind = fd.get("kind") === "thread" ? "thread" : "post";
  const table = kind === "thread" ? "threads" : "posts";
  const id = Number(fd.get("id"));
  const action = String(fd.get("action"));
  const authorId = String(fd.get("authorId") ?? "");
  if (!Number.isInteger(id)) return;
  if (action === "hide" || action === "restore") {
    await sb
      .from(table)
      .update({ hidden: action === "hide" })
      .eq("id", id);
    await sb
      .from("reports")
      .update({ resolved: true })
      .eq(kind === "thread" ? "thread_id" : "post_id", id);
  } else if (action === "delete") {
    await sb.from(table).delete().eq("id", id);
  } else if ((action === "lock" || action === "unlock") && kind === "thread") {
    await sb
      .from("threads")
      .update({ locked: action === "lock" })
      .eq("id", id);
  } else if (action === "ban" && authorId) {
    await sb.from("profiles").update({ banned: true }).eq("id", authorId);
  }
  revalidatePath("/social", "layout");
}

export async function deleteAccount(
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const sb = await getSupabase();
  if (!sb) return { error: NOT_CONNECTED };
  if (fd.get("confirm") !== "DELETE")
    return { error: "Type DELETE to confirm." };
  const { error } = await sb.rpc("delete_my_account");
  if (error)
    return { error: "We couldn't delete your account. Please try again." };
  await sb.auth.signOut();
  redirect("/?deleted=1");
}
