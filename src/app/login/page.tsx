import { redirect } from "next/navigation";

// Left over from the original template. Accounts now live at /sign-in.
export default function OldAuthPage() {
  redirect("/sign-in");
}
