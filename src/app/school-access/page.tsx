import Link from "next/link";
import { redirect } from "next/navigation";

import { getSchoolAccess } from "@/lib/school/access";
import { getViewer } from "@/lib/social/server";

export const metadata={title:"School access",robots:{index:false,follow:false}};
export default async function SchoolAccessPage(){
 const viewer=await getViewer();if(!viewer)redirect("/sign-in");
 const school=await getSchoolAccess();
 if(school?.active)redirect(school.role==="teacher"?"/teacher":"/dashboard");
 return <main className="mx-auto max-w-2xl px-4 py-16"><p className="font-bold text-primary">IlluminatED for schools</p><h1 className="mt-3 text-4xl font-bold">Your school access needs attention</h1><p className="mt-5">{school?`${school.name}: ${school.status==="full"?"all learner seats are in use":school.status==="verify-email"?"verify your email to accept your invitation":"the licence is pending, expired or suspended"}.`:"Ask your school to invite this email as a student or teacher."}</p><p className="mt-3 text-muted-foreground">Your school needs an approved paid licence and an available learner seat. Contact your school administrator or IlluminatED support. Your learning records are kept private.</p><Link href="/contact" className="mt-6 inline-block rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground">Contact support</Link></main>;
}
