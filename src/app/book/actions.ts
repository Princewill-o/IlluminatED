"use server";

import { z } from "zod";

import { sendEmail } from "@/lib/email";
import { getSupabase } from "@/lib/social/server";

const Booking = z.object({
  name: z.string().trim().min(2, "Tell us your name.").max(80),
  email: z.string().trim().toLowerCase().email("Check your email address.").max(200),
  role: z.enum(["student", "parent", "teacher", "leader", "other"]),
  organisationType: z.enum(["individual", "school", "college", "sixth-form", "trust", "other"]),
  organisation: z.string().trim().max(120).optional(),
  learners: z.number().int().min(1).max(100000).optional(),
  times: z.string().trim().max(300).optional(),
  message: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot
});

const LABEL = {
  student: "Student",
  parent: "Parent or carer",
  teacher: "Teacher",
  leader: "School or college leader",
  other: "Other",
  individual: "Just me (individual)",
  school: "School",
  college: "College",
  "sixth-form": "Sixth form",
  trust: "Academy trust or group",
} as const;

/** A demo request: saved for the team and emailed to the inbox. */
export async function requestDemo(input: z.input<typeof Booking>) {
  const p = Booking.safeParse(input);
  if (!p.success) return { ok: false as const, error: p.error.issues[0]?.message ?? "Check the form and try again." };
  if (p.data.website) return { ok: true as const, mailto: null };
  const d = p.data;
  const sb = await getSupabase();
  if (sb) {
    const { error } = await sb.from("demo_requests").insert({
      name: d.name,
      email: d.email,
      role: d.role,
      organisation_type: d.organisationType,
      organisation: d.organisation || null,
      learners: d.learners ?? null,
      times: d.times || null,
      message: d.message || null,
    });
    if (error) return { ok: false as const, error: "That didn't send. Try again in a moment." };
  }
  const body = [
    `New demo request from ${d.name} (${d.email}).`,
    `Role: ${LABEL[d.role]}\nFor: ${LABEL[d.organisationType]}${d.organisation ? ` — ${d.organisation}` : ""}${d.learners ? `\nLearners: ${d.learners}` : ""}`,
    d.times ? `Good times for a call: ${d.times}` : "",
    d.message ? `Message: ${d.message}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const emailed = await sendEmail({ to: "okubep@gmail.com", subject: `Demo request: ${d.name} (${LABEL[d.organisationType]})`, text: body });
  return { ok: true as const, mailto: emailed || sb ? null : `mailto:okubep@gmail.com?subject=${encodeURIComponent(`Demo request: ${d.name}`)}&body=${encodeURIComponent(body)}` };
}
