import { redirect } from "next/navigation";

export default async function StudyPage({searchParams}:{searchParams:Promise<{subject?:string}>}) {
  const {subject}=await searchParams;
  const query=subject&&/^[a-z0-9-]{2,80}$/.test(subject)?`&subject=${subject}`:"";
  redirect(`/games/world?activity=study${query}`);
}
