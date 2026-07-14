import type { Metadata } from "next";
import { BhNavbar } from "@/components/lp/bauhaus/BhNavbar";
import { BhHero } from "@/components/lp/bauhaus/BhHero";
import { BhStats } from "@/components/lp/bauhaus/BhStats";
import { BhTools } from "@/components/lp/bauhaus/BhTools";
import { BhReviews } from "@/components/lp/bauhaus/BhReviews";
import { BhPricing } from "@/components/lp/bauhaus/BhPricing";
import { BhFaq } from "@/components/lp/bauhaus/BhFaq";
import { BhFinalCta } from "@/components/lp/bauhaus/BhFinalCta";
import { BhFooter } from "@/components/lp/bauhaus/BhFooter";

// Homepage — Bauhaus design system: constructivist, geometric, primary colors,
// hard offset shadows, Outfit typeface. Scoped via .lp-root.
export const metadata: Metadata = {
  title: "NicheSpy — Spy on What Actually Works",
  description:
    "AI-powered competitor intelligence, outlier detection, and untapped-topic ideas for YouTube Shorts creators.",
};

export default function Home() {
  return (
    <main className="lp-root min-h-screen bg-[#F0F0F0] text-[#121212] antialiased">
      <BhNavbar />
      <BhHero />
      <BhStats />
      <BhTools />
      <BhReviews />
      <BhPricing />
      <BhFaq />
      <BhFinalCta />
      <BhFooter />
    </main>
  );
}
