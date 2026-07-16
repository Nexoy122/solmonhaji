import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CountdownScreen } from "@/components/CountdownScreen";
import { hasLaunched, LAUNCH_AT_MS } from "@/lib/launch";

export const metadata: Metadata = {
  title: "NicheSpy Beta launches soon",
  description: "The NicheSpy Beta is almost here. Find the Shorts that actually work in your niche.",
};

// Never cache: this page's whole job is to be correct about the current time.
export const dynamic = "force-dynamic";

export default function SoonPage() {
  // Once the timer has passed, /soon stops existing.
  if (hasLaunched()) redirect("/");
  return <CountdownScreen launchAt={LAUNCH_AT_MS} />;
}
