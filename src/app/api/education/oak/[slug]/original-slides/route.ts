import { publicLessonDeck } from "@/lib/server/lesson-materials";
import { oakLesson } from "@/lib/server/oak-library";

export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}) {
  const lesson=await oakLesson((await params).slug);
  if(!lesson)return Response.json({error:"lesson_not_found"},{status:404});
  if(lesson.restricted)return Response.json({error:"restricted_lesson"},{status:403});
  const deck=await publicLessonDeck(lesson);
  if(!deck)return Response.json({error:"original_deck_unavailable",message:"Use the IllumED Slides download, or check access on the source lesson page.",source:lesson.source_url},{status:404});
  return Response.redirect(deck,302);
}
