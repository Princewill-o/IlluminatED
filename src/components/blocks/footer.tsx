import Link from "next/link";

import { Logo } from "@/components/brand";
import { NAV } from "@/lib/nav";

export function Footer() {
  return (
    <footer className="mt-20 border-t">
      <div className="container grid gap-10 py-12 lg:grid-cols-[1fr_2fr]">
        <div>
          <Logo />
          <p className="text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed">
            Free revision help for learners in the UK. Use it without an
            account, or sign in to track progress and get a tutor. Apps for
            iPhone and Android are coming soon.
          </p>
        </div>
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
