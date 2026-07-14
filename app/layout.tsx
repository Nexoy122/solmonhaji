import type { Metadata } from "next";
import { Roboto, Roboto_Mono, Space_Grotesk, Outfit } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";
import { AuthProvider } from "@/components/AuthProvider";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono-roboto",
  display: "swap",
});

// Heading font for the new dark redesign (auth + dashboard).
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

// Landing page (/) typeface — Outfit (geometric sans, Bauhaus design system).
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-outfit",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nichespy.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "NicheSpy — Spy on Your YouTube Competitors",
  description:
    "NicheSpy automates the competitor research creators waste 3–5 hours on every week. Type your niche, get full competitor intelligence in 60 seconds — plus a free Trust Score analysis of your own channel for waitlist members.",
  keywords: [
    "youtube competitor research",
    "youtube analytics",
    "niche research",
    "youtube outlier videos",
    "content gap finder",
    "faceless youtube",
  ],
  openGraph: {
    title: "NicheSpy — Spy on Your YouTube Competitors",
    description:
      "Know exactly what your competitors are doing. Always. Automated YouTube competitor intelligence in 60 seconds — plus a free Trust Score analysis of your channel for waitlist members.",
    url: SITE_URL,
    siteName: "NicheSpy",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1366,
        height: 768,
        alt: "NicheSpy — Tools for Creators",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NicheSpy — Spy on Your YouTube Competitors",
    description:
      "Automated YouTube competitor intelligence in 60 seconds. Plus a free Trust Score analysis of your channel for waitlist members. Join the waitlist.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  verification: {
    google: "2gfzfxvr_cCtx66UmSk4iyLVXc8DXFteZg2nCJa-2Gg",
  },
  icons: {
    icon: [{ url: "/favicon.webp", type: "image/webp" }],
    shortcut: "/favicon.webp",
    apple: "/favicon.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${roboto.variable} ${robotoMono.variable} ${spaceGrotesk.variable} ${outfit.variable}`}>
      <head>
        {/* Preload the Material Symbols font so sidebar icons render fast (it's
            large — without this the browser fetches it late and icons flash in). */}
        <link
          rel="preload"
          href="/material-symbols-rounded.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      {/* suppressHydrationWarning: browser extensions (e.g. Bitdefender) inject
          attributes like bis_skin_checked into <body> before React hydrates. */}
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  );
}
