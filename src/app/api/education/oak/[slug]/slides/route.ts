import { lessonDownloadHtml } from "@/lib/education/lesson-adaptation";
import { oakLesson } from "@/lib/server/oak-library";

export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}) {
  const lesson=await oakLesson((await params).slug);
  if(!lesson)return Response.json({error:"lesson_not_found"},{status:404});
  if(lesson.restricted)return Response.json({error:"restricted_lesson",source:lesson.source_url},{status:403});
  return new Response(lessonDownloadHtml(lesson),{headers:{"Content-Type":"text/html; charset=utf-8","Content-Disposition":`attachment; filename="${lesson.slug}-illumed-slides.html"`,"Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff"}});
}
