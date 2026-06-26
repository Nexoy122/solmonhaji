import { TopBar } from "@/components/TopBar";
import { Hero } from "@/components/Hero";
import { Ticker } from "@/components/Ticker";
import { Stats } from "@/components/Stats";
import { WhatIsIt } from "@/components/WhatIsIt";
import { Features } from "@/components/Features";
import { TrustScore } from "@/components/TrustScore";
import { HowItWorks } from "@/components/HowItWorks";
import { FAQ } from "@/components/FAQ";
import { BottomCTA } from "@/components/BottomCTA";
import { Footer } from "@/components/Footer";
import { DiscordButton } from "@/components/DiscordButton";
import { ReferralModal } from "@/components/ReferralModal";

// Seed count for the hero social-proof number.
const BASE_COUNT = 247;

export default function Home() {
  return (
    <main>
      <TopBar />
      <Hero count={BASE_COUNT} />
      <Ticker />
      <Stats />
      <WhatIsIt />
      <Features />
      <TrustScore />
      <HowItWorks />
      <FAQ />
      <BottomCTA />
      <Footer />
      <DiscordButton />
      <ReferralModal />
    </main>
  );
}
