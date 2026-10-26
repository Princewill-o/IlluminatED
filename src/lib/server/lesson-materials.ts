import "server-only";

import type { OakLesson } from "@/lib/education/school-stages";

/** Public resources only. Never fetch restricted, legacy, expired or login-gated lessons. */
export async function publicLessonDeck(lesson: OakLesson): Promise<string | null> {
  if(lesson.restricted)return null;
  try {
    const response=await fetch(`https://www.thenational.academy/teachers/lessons/${encodeURIComponent(lesson.slug)}`,{redirect:"error",next:{revalidate:86400},signal:AbortSignal.timeout(6000)});
    if(!response.ok || Number(response.headers.get("content-length")??0)>5000000)return null;
    const html=await response.text();
    if(html.length>5000000)return null;
    const payload=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    if(!payload)return null;
    const data=JSON.parse(payload).props?.pageProps?.lesson;
    if(!data || data.lessonSlug!==lesson.slug || data.isLegacy!==false || data.geoRestricted || data.loginRequired || data.expired || data.excludedFromTeachingMaterials || data.legacyCopyrightContent)return null;
    const url=new URL(data.presentationUrl);
    const id=url.pathname.match(/^\/presentation\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1];
    return url.protocol==="https:" && url.hostname==="docs.google.com" && id ? `https://docs.google.com/presentation/d/${id}/export/pptx` : null;
  } catch {return null;}
}
