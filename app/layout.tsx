import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nichespy.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "NicheSpy — Spy on Your YouTube Competitors",
  description:
    "NicheSpy automates the competitor research creators waste 3–5 hours on every week. Type your niche, get full competitor intelligence in 60 seconds.",
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
      "Know exactly what your competitors are doing. Always. Automated YouTube competitor intelligence in 60 seconds.",
    url: SITE_URL,
    siteName: "NicheSpy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NicheSpy — Spy on Your YouTube Competitors",
    description:
      "Automated YouTube competitor intelligence in 60 seconds. Join the waitlist.",
  },
  robots: { index: true, follow: true },
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
    <html lang="en" className={`${roboto.variable} ${robotoMono.variable}`}>
      {/* suppressHydrationWarning: browser extensions (e.g. Bitdefender) inject
          attributes like bis_skin_checked into <body> before React hydrates. */}
      <body suppressHydrationWarning>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
