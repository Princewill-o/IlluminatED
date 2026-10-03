import { NextResponse } from "next/server";

import {
  normaliseState,
  validNamespace,
  validStateItem,
} from "@/lib/education/state";
import { getSupabase } from "@/lib/social/server";
export const runtime = "nodejs";
const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
async function session() {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser();
  return !error && data.user ? { sb, user: data.user } : null;
}
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("export") === "1") {
    const s = await session();
    if (!s) return reply({ error: "sign_in_required" }, 401);
    const { data, error } = await s.sb
      .from("education_learner_state")
      .select("namespace,value,updated_at")
      .eq("user_id", s.user.id);
    if (error) return reply({ error: "account_storage_unavailable" }, 503);
    return new Response(JSON.stringify(data ?? [], null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition":
          'attachment; filename="illuminated-study-choices.json"',
        "cache-control": "private, no-store",
      },
    });
  }
  const namespace = new URL(req.url).searchParams.get("namespace");
  if (!validNamespace(namespace))
    return reply({ error: "invalid_namespace" }, 400);
  const s = await session();
  if (!s) return reply({ error: "sign_in_required" }, 401);
  const { data, error } = await s.sb
    .from("education_learner_state")
    .select("value, updated_at")
    .eq("user_id", s.user.id)
    .eq("namespace", namespace)
    .maybeSingle();
  if (error) return reply({ error: "account_storage_unavailable" }, 503);
  return reply({
    value: normaliseState(namespace, data?.value),
    updatedAt: data?.updated_at ?? null,
  });
}
export async function PATCH(req: Request) {
  // Reject cross-site mutations, and never trust a supplied user ID.
  if (req.headers.get("sec-fetch-site") === "cross-site")
    return reply({ error: "cross_site_request" }, 403);
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    return reply({ error: "invalid_origin" }, 403);
  const text = await req.text();
  if (text.length > 6000) return reply({ error: "payload_too_large" }, 413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return reply({ error: "invalid_json" }, 400);
  }
  if (!body || !validStateItem(body.namespace, body.item, body.value))
    return reply({ error: "invalid_state" }, 400);
  const s = await session();
  if (!s) return reply({ error: "sign_in_required" }, 401);
  const { data, error } = await s.sb.rpc("set_education_state_item", {
    p_namespace: body.namespace,
    p_item: body.item,
    p_value: body.value,
  });
  if (error) return reply({ error: "account_storage_unavailable" }, 503);
  return reply({ value: normaliseState(body.namespace, data) });
}

export async function DELETE(req: Request) {
  const origin = req.headers.get("origin");
  if (
    req.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== new URL(req.url).origin)
  )
    return reply({ error: "invalid_origin" }, 403);
  const s = await session();
  if (!s) return reply({ error: "sign_in_required" }, 401);
  const { error } = await s.sb
    .from("education_learner_state")
    .delete()
    .eq("user_id", s.user.id);
  return error
    ? reply({ error: "account_storage_unavailable" }, 503)
    : reply({ ok: true });
}
