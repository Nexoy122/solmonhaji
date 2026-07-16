import type { Metadata } from "next";
import { BhThemeProvider } from "@/components/lp/bauhaus/BhTheme";
import { BhNavbar } from "@/components/lp/bauhaus/BhNavbar";
import { BhHero } from "@/components/lp/bauhaus/BhHero";
import { BhNicheStrip } from "@/components/lp/bauhaus/BhNicheStrip";
import { BhStats } from "@/components/lp/bauhaus/BhStats";
import { BhHowItWorks } from "@/components/lp/bauhaus/BhHowItWorks";
import { BhTools } from "@/components/lp/bauhaus/BhTools";
import { BhReviews } from "@/components/lp/bauhaus/BhReviews";
import { BhPricing } from "@/components/lp/bauhaus/BhPricing";
import { BhFaq } from "@/components/lp/bauhaus/BhFaq";
import { BhFinalCta } from "@/components/lp/bauhaus/BhFinalCta";
import { BhFooter } from "@/components/lp/bauhaus/BhFooter";

// Homepage, Bauhaus design system (constructivist, geometric, hard offset
// shadows, Outfit typeface) carrying YouTube-native content: red-forward
// palette, play marks, 9:16 Shorts outlier cards. Dark by default; the toggle
// lives in the navbar. Scoped via .lp-root + data-theme on <html>.
export const metadata: Metadata = {
  title: "NicheSpy: Spy on What Actually Works on Shorts",
  description:
    "Find the YouTube Shorts pulling 10–100× a channel's average, break down why they popped, and turn them into your next script. Outlier detection, niche research, and AI scripts for Shorts creators.",
};

export default function Home() {
  return (
    <BhThemeProvider>
      <main className="lp-root bh-bg bh-text min-h-screen antialiased">
        <BhNavbar />
        <BhHero />
        <BhNicheStrip />
        <BhStats />
        <BhHowItWorks />
        <BhTools />
        <BhReviews />
        <BhPricing />
        <BhFaq />
        <BhFinalCta />
        <BhFooter />
      </main>
    </BhThemeProvider>
  );
}
