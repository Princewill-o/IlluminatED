"use server";

import { notifyModerators } from "@/lib/email";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/site";
import { getSupabase } from "@/lib/social/server";

export type ContactState = {
  ok?: boolean;
  error?: string;
  topic?: ContactTopic;
} | null;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function sendContactMessage(
  _: ContactState,
  fd: FormData,
): Promise<ContactState> {
  // Hidden field that people never see. Bots fill it in; pretend it worked.
  if (String(fd.get("website") ?? "").trim()) return { ok: true };

  const name = String(fd.get("name") ?? "").trim() || null;
  const email = String(fd.get("email") ?? "").trim();
  const topic = String(fd.get("topic") ?? "") as ContactTopic;
  const message = String(fd.get("message") ?? "").trim();

  if (!CONTACT_TOPICS.some((t) => t.value === topic))
    return { error: "Choose what your message is about." };
  if (name && name.length > 80)
    return { error: "Keep your name under 80 characters." };
  if (!EMAIL.test(email) || email.length > 200)
    return { error: "Enter an email address we can reply to." };
  if (message.length < 10)
    return { error: "Your message needs to be at least 10 characters." };
  if (message.length > 4000)
    return { error: "Keep your message under 4,000 characters." };

  const sb = await getSupabase();
  if (!sb)
    return {
      error:
        "Messages can't be sent from this preview. Please try again on the live site.",
    };

  const { error } = await sb
    .from("contact_messages")
    .insert({ name, email, topic, message });
  if (error) {
    if (error.message?.includes("rate_limited"))
      return {
        error:
          "You've sent a few messages already. Please wait an hour and try again.",
      };
    return { error: "We couldn't send your message. Please try again." };
  }
  if (topic === "safeguarding")
    await notifyModerators(
      "Urgent: new safeguarding contact",
      "Someone has sent a safeguarding or safety concern through the contact form.",
      "/social/moderation",
    ).catch(() => false);
  return { ok: true, topic };
}
