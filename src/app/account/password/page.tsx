import { redirect } from "next/navigation";

import type { Metadata } from "next";

import { PasswordForm } from "@/components/account/password-form";
import { PageHeader, Section } from "@/components/kit";
import { getViewer } from "@/lib/social/server";

export const metadata: Metadata = {
  title: "Change your password",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** Password reset links sign people in and land here, via /auth/callback. */
export default async function PasswordPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=%2Faccount%2Fpassword");
  return (
    <>
      <PageHeader
        title="Choose a new password"
        intro="Pick something you haven't used anywhere else. You'll use it next time you sign in."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Your details", href: "/dashboard/settings" },
          { label: "Password" },
        ]}
      />
      <Section rule={false} className="pb-20">
        <div className="max-w-sm">
          {viewer.email && (
            <p className="text-muted-foreground mb-6 text-sm">
              Signed in as{" "}
              <span className="text-foreground font-medium">
                {viewer.email}
              </span>
            </p>
          )}
          <PasswordForm />
        </div>
      </Section>
    </>
  );
}
