import { NextResponse } from "next/server";

import {
  certificateId,
  makeCertificatePdf,
  makeProjectPdf,
  type CertificateDetails,
} from "@/lib/illum-world/pdf";
import { loadVisibleProject } from "@/lib/illum-world/server";
import { getSupabase } from "@/lib/social/server";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const sb = await getSupabase();
  const project = sb ? await loadVisibleProject(id) : null;
  if (!sb || !project)
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const kind = new URL(request.url).searchParams.get("kind") ?? "project";
  if (!["certificate", "project"].includes(kind))
    return NextResponse.json({ error: "Unknown download." }, { status: 400 });
  if (
    kind === "certificate" &&
    (project.status !== "approved" ||
      !project.approved_at ||
      !project.assignment_id)
  )
    return NextResponse.json(
      {
        error:
          "Teacher approval is required before a certificate is available.",
      },
      { status: 403 },
    );
  if (project.status === "draft")
    return NextResponse.json(
      { error: "Finish and submit the project before downloading it." },
      { status: 409 },
    );
  const { data: profile } = await sb
    .from("profiles")
    .select("username")
    .eq("id", project.user_id)
    .maybeSingle();
  const learner = String(profile?.username ?? "Learner");
  let details: CertificateDetails = {};
  if (kind === "certificate") details = await certificateDetails(sb, project);
  const bytes =
    kind === "certificate"
      ? await makeCertificatePdf(project, learner, false, details)
      : await makeProjectPdf(project, learner);
  const filename =
    kind === "certificate"
      ? `IllumWorld-Tech-Repair-certificate-${certificateId(project.id)}.pdf`
      : `IllumWorld-Tech-Repair-project-v${project.revision}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Teacher and class come from the database record of who approved the
 * project and which class set it. Anything RLS hides is simply omitted. */
async function certificateDetails(
  sb: NonNullable<Awaited<ReturnType<typeof getSupabase>>>,
  project: NonNullable<Awaited<ReturnType<typeof loadVisibleProject>>>,
): Promise<CertificateDetails> {
  const [teacher, assignment] = await Promise.all([
    project.reviewed_by
      ? sb
          .from("profiles")
          .select("username")
          .eq("id", project.reviewed_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    sb
      .from("learning_assignments")
      .select("title,class_id")
      .eq("id", project.assignment_id!)
      .maybeSingle(),
  ]);
  const classId = assignment.data?.class_id;
  const classroom = classId
    ? await sb.from("classes").select("name").eq("id", classId).maybeSingle()
    : { data: null };
  return {
    teacher: teacher.data?.username ? String(teacher.data.username) : null,
    className: classroom.data?.name ? String(classroom.data.name) : null,
    assignmentTitle: assignment.data?.title
      ? String(assignment.data.title)
      : null,
  };
}
