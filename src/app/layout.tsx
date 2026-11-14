import localFont from "next/font/local";

 
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { SiteChrome } from "@/components/app/site-chrome";
import { Footer } from "@/components/blocks/footer";
import { Navbar } from "@/components/blocks/navbar";
import { FeatureTracker } from "@/components/feature-tracker";
import { HideOnSocial } from "@/components/hide-on-social";
import { OfflineBanner } from "@/components/offline-banner";
import { ThemeProvider } from "@/components/theme-provider";
import { PUBLIC_WEB_URL as SITE_URL } from "@/lib/site";
import "@/styles/globals.css";

const dmSans = localFont({
  src: [
    {
      path: "../../fonts/dm-sans/DMSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/dm-sans/DMSans-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../fonts/dm-sans/DMSans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../fonts/dm-sans/DMSans-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../fonts/dm-sans/DMSans-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-dm-sans",
  display: "swap",
});

const description =
  "IlluminatED Learning brings together IllumWorld virtual work experience, IllumMaths, IllumScience and IllumEnglish, with one account and one school dashboard.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "IlluminatED Learning",
    template: "%s | IlluminatED Learning",
  },
  description,
  applicationName: "IlluminatED Learning",
  verification: process.env.GOOGLE_SITE_VERIFICATION ? {google:process.env.GOOGLE_SITE_VERIFICATION} : undefined,
  twitter:{card:"summary_large_image",title:"IlluminatED Learning",description},
  appleWebApp: {
    capable: true,
    title: "IlluminatED",
    statusBarStyle: "black-translucent",
  },
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
    title: "IlluminatED Learning",
    description,
    siteName: "IlluminatED Learning",
    locale: "en_GB",
    type: "website",
    // The image comes from src/app/opengraph-image.png (and twitter-image.png).
  },
};

export const viewport: Viewport = {
  // Let the app run edge to edge on phones (the app shell pads for the notch and home bar).
  viewportFit: "cover",
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
      <body className={`${dmSans.variable} ${GeistSans.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <FeatureTracker />
          <SiteChrome
            navbar={<Navbar />}
            footer={
              <HideOnSocial>
                <Footer />
              </HideOnSocial>
            }
          >
            {children}
          </SiteChrome>
          <OfflineBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
