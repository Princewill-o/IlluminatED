import Image from "next/image";
import Link from "next/link";

import { socialConfigured } from "@/lib/social/config";
import type { Viewer } from "@/lib/social/server";

export function SocialLogo() {
  return (
    <span className="flex items-center gap-1.5" aria-label="IlluminatEDSocial">
      <span className="relative block h-[17px] w-[110px]">
        <Image
          src="/brand/wordmark-white.webp"
          alt=""
          fill
          sizes="110px"
          className="object-contain object-left"
          priority
        />
      </span>
      <span className="text-primary text-[1.2rem] leading-none font-bold tracking-tight">
        Social
      </span>
    </span>
  );
}

const LINKS = [
  { href: "/social", label: "Forum" },
  { href: "/social/universities", label: "Universities" },
  { href: "/social/guidelines", label: "Guidelines" },
];

export function SocialHeader({ viewer }: { viewer: Viewer | null }) {
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center gap-6">
        <Link href="/social" className="shrink-0 rounded-md">
          <SocialLogo />
        </Link>
        <nav
          aria-label="Social"
          className="hidden items-center gap-5 text-sm md:flex"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground hidden sm:inline"
          >
            Back to IlluminatED
          </Link>
          {viewer?.profile ? (
            <>
              {viewer.profile.role === "moderator" && (
                <Link
                  href="/social/moderation"
                  className="text-muted-foreground hover:text-foreground hidden sm:inline"
                >
                  Moderation
                </Link>
              )}
              <Link href="/social/account" className="font-medium">
                {viewer.profile.username}
              </Link>
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground hidden sm:inline"
              >
                Dashboard
              </Link>
            </>
          ) : viewer ? (
            <Link
              href="/onboarding?next=/social"
              className="text-primary font-medium"
            >
              Finish setting up
            </Link>
          ) : (
            <Link
              href="/sign-in?next=/social"
              className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 font-semibold"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      <nav
        aria-label="Social (mobile)"
        className="container flex gap-5 pb-3 text-sm md:hidden"
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-muted-foreground hover:text-foreground"
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground ml-auto sm:hidden"
        >
          IlluminatED
        </Link>
      </nav>
      {!socialConfigured && (
        <div className="border-t">
          <p className="container py-2.5 text-sm">
            <span className="text-primary font-semibold">Preview.</span>{" "}
            <span className="text-muted-foreground">
              Social isn't connected to its database yet, so you're seeing
              example threads and posting is switched off. See the README to
              connect Supabase.
            </span>
          </p>
        </div>
      )}
    </header>
  );
}

export function SocialFooter() {
  return (
    <footer className="mt-24 border-t">
      <div className="text-muted-foreground container flex flex-wrap gap-x-6 gap-y-2 py-8 text-sm">
        <span>IlluminatEDSocial is part of IlluminatED.</span>
        <Link href="/social/guidelines" className="hover:text-foreground">
          Community guidelines
        </Link>
        <Link href="/social/guidelines#help" className="hover:text-foreground">
          Need to talk to someone?
        </Link>
        <Link href="/" className="hover:text-foreground">
          IlluminatED home
        </Link>
      </div>
    </footer>
  );
}
