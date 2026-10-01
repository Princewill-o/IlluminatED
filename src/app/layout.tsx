import localFont from "next/font/local";

import type { Metadata, Viewport } from "next";

import { Footer } from "@/components/blocks/footer";
import { Navbar } from "@/components/blocks/navbar";
import { HideOnSocial } from "@/components/hide-on-social";
import { OfflineBanner } from "@/components/offline-banner";
import { SplashScreen, splashBootScript } from "@/components/splash-screen";
import { ThemeProvider } from "@/components/theme-provider";
import "@/styles/globals.css";

const dmSans = localFont({
  src: [
    {
      path: "../../fonts/dm-sans/DMSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/dm-sans/DMSans-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../fonts/dm-sans/DMSans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../fonts/dm-sans/DMSans-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../fonts/dm-sans/DMSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-dm-sans",
  display: "swap",
});

const description =
  "Free revision for GCSE, A level, BTEC, T Level and Level 2/3 learners: courses, quizzes, flashcards, planners and official resources.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://illuminated-omega.vercel.app",
  ),
  title: {
    default: "IlluminatED: revision for UK learners",
    template: "%s | IlluminatED",
  },
  description,
  applicationName: "IlluminatED",
  robots: { index: true, follow: true },
  manifest: "/favicon/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "48x48" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "IlluminatED: revision for UK learners",
    description,
    siteName: "IlluminatED",
    locale: "en_GB",
    type: "website",
    // The image comes from src/app/opengraph-image.png (and twitter-image.png).
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1326" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        {splashBootScript && (
          <script dangerouslySetInnerHTML={{ __html: splashBootScript }} />
        )}
      </head>
      <body className={`${dmSans.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SplashScreen />
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Navbar />
          <main id="main" tabIndex={-1} className="min-h-[60vh] outline-none">
            {children}
          </main>
          <HideOnSocial>
            <Footer />
          </HideOnSocial>
          <OfflineBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
