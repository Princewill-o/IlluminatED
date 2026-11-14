import { redirect } from "next/navigation";

/** Existing school links now open the focused Year 10 pilot brief. */
export default function SchoolsPage() {
  redirect("/world/pilot");
}
