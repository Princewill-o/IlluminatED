import "server-only";

import type { RepairProject } from "./repair";

import { getSupabase } from "@/lib/social/server";

export async function loadRepairProject(assignment: string | null) {
  const sb = await getSupabase();
  if (!sb)
    return {
      project: null,
      signedIn: false,
      userId: null,
      error: "Accounts are not configured.",
    };
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user)
    return { project: null, signedIn: false, userId: null, error: null };
  let query = sb
    .from("learning_world_projects")
    .select("*")
    .eq("user_id", auth.user.id);
  query = assignment
    ? query.eq("assignment_id", assignment)
    : query.is("assignment_id", null);
  const { data, error } = await query.maybeSingle();
  let assignmentError: string | null = null;
  if (assignment) {
    const { data: task } = await sb
      .from("learning_assignments")
      .select("id,product,resource_slug")
      .eq("id", assignment)
      .maybeSingle();
    if (
      !task ||
      task.product !== "world" ||
      task.resource_slug !== "tech-repair-trainee"
    )
      assignmentError =
        "This assignment is unavailable. Join the teacher's class before opening their mission link.";
  }
  return {
    project: data as RepairProject | null,
    signedIn: true,
    userId: auth.user.id,
    error:
      assignmentError ??
      (error
        ? "Cloud saving is temporarily unavailable. Keep this tab open; your draft stays on this device."
        : null),
  };
}

/** RLS permits the author and the owner of the assigned class only. */
export async function loadVisibleProject(id: string) {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("learning_world_projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return error ? null : (data as RepairProject | null);
}

export async function loadMyRepairProjects() {
  const sb = await getSupabase();
  if (!sb) return [] as RepairProject[];
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [] as RepairProject[];
  const { data } = await sb
    .from("learning_world_projects")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false });
  return (data ?? []) as RepairProject[];
}

export interface RepairAssignmentChoice {
  id: string;
  title: string;
  className: string;
  dueAt: string | null;
}

/** Only assignments in classes the signed-in pupil has actually joined.
 * Teacher-owned classes are RLS-visible too, but are not pupil assignments.
 */
export async function loadMyRepairAssignments(
  userId: string,
): Promise<{ assignments: RepairAssignmentChoice[]; error: boolean }> {
  const sb = await getSupabase();
  if (!sb) return { assignments: [], error: true };
  const { data: memberships, error: membershipError } = await sb
    .from("class_members")
    .select("class_id")
    .eq("user_id", userId);
  if (membershipError) return { assignments: [], error: true };
  const classIds = (memberships ?? []).map((row) => String(row.class_id));
  if (!classIds.length) return { assignments: [], error: false };
  const [tasks, classes] = await Promise.all([
    sb
      .from("learning_assignments")
      .select("id,title,class_id,due_at")
      .eq("product", "world")
      .eq("resource_slug", "tech-repair-trainee")
      .in("class_id", classIds)
      .order("created_at", { ascending: false })
      .limit(100),
    sb.from("classes").select("id,name").in("id", classIds),
  ]);
  if (tasks.error || classes.error) return { assignments: [], error: true };
  const names = new Map(
    (classes.data ?? []).map((row) => [String(row.id), String(row.name)]),
  );
  return {
    assignments: (tasks.data ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      className: names.get(String(row.class_id)) ?? "Your class",
      dueAt: row.due_at ? String(row.due_at) : null,
    })),
    error: false,
  };
}
