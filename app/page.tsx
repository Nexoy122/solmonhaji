import type { Metadata } from "next";
import { LpNavbar } from "@/components/lp/LpNavbar";
import { LpHero } from "@/components/lp/LpHero";
import { LpStats } from "@/components/lp/LpStats";
import { LpTrustedBy } from "@/components/lp/LpTrustedBy";
import { LpToolsBento } from "@/components/lp/LpToolsBento";
import { LpHowItWorks } from "@/components/lp/LpHowItWorks";
import { LpFaq } from "@/components/lp/LpFaq";
import { LpFinalCta } from "@/components/lp/LpFinalCta";
import { LpFooter } from "@/components/lp/LpFooter";
import { LpOfferPopup } from "@/components/lp/LpOfferPopup";
import { LpScrollProgress } from "@/components/lp/LpScrollFx";

// Homepage = the vidIQ-style product landing (from the tatti design). Sign Up /
// Sign In link to this same app's /signup, /login → /dashboard. The old light
// waitlist page is preserved at components/{Hero,Features,…} + app/_waitlist.
export const metadata: Metadata = {
  title: "NicheSpy — Get More Views & Subscribers on YouTube",
  description:
    "AI-powered competitor intelligence, outlier detection, and untapped-topic ideas that do the heavy lifting — so you can focus on creating. Sign up free.",
};

export default function Home() {
  return (
    <main className="lp-root min-h-screen bg-[#0f1420] text-white antialiased">
      <LpScrollProgress />
      <LpNavbar />
      <LpHero />
      <LpStats />
      <LpTrustedBy />
      <LpToolsBento />
      <LpHowItWorks />
      <LpFaq />
      <LpFinalCta />
      <LpFooter />
      <LpOfferPopup />
    </main>
  );
}
