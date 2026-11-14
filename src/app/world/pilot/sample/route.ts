import { makeCertificatePdf } from "@/lib/illum-world/pdf";

export const runtime = "nodejs";
export async function GET() {
  const bytes = await makeCertificatePdf(null, "[Learner username]", true);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        "attachment; filename=IllumWorld-SAMPLE-certificate-not-awarded.pdf",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
