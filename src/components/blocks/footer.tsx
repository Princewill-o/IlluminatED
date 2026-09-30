"use client";

import Link from "next/link";

import { Logo } from "@/components/brand";
import { NAV } from "@/lib/nav";
import { useSignedIn } from "@/lib/use-signed-in";

const PUBLIC_LINKS = [
  { href: "/about", title: "About IlluminatED" },
  { href: "/faq", title: "FAQ" },
  { href: "/your-data", title: "Your data" },
  { href: "/accessibility", title: "Accessibility" },
  { href: "/social/guidelines", title: "Community guidelines" },
];

export function Footer() {
  const signedIn = useSignedIn();
  return (
    <footer className="mt-20 border-t">
      <div className="container grid gap-10 py-12 lg:grid-cols-[1fr_2fr]">
        <div>
          <Logo />
          <p className="text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed">
            Revision, progress tracking and tutors for learners in the UK. Apps
            for iPhone and Android are coming soon.
          </p>
        </div>
        {signedIn ? (
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 sm:grid-cols-5"
          >
            {NAV.map((g) => (
              <div key={g.label}>
                <h2 className="font-text text-sm font-semibold">{g.label}</h2>
                <ul className="mt-3 space-y-2">
                  {g.items.map((i) => (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        className="text-muted-foreground hover:text-foreground text-sm"
                      >
                        {i.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        ) : (
          <nav aria-label="Footer" className="lg:justify-self-end">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {PUBLIC_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      <div className="border-t">
        <p className="text-muted-foreground container py-6 text-xs leading-relaxed">
          © {new Date().getFullYear()} IlluminatED. Independent, and not
          endorsed by any exam board, Ofqual or the Department for Education.
          Always check details against your own specification.
        </p>
      </div>
    </footer>
  );
}
