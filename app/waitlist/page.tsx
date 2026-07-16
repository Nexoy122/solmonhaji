import type { Metadata } from "next";
import { WaitlistScreen } from "@/components/access/WaitlistScreen";

export const metadata: Metadata = {
  title: "You're on the list · NicheSpy",
  robots: { index: false, follow: false },
};

export default function WaitlistPage() {
  return <WaitlistScreen />;
}
