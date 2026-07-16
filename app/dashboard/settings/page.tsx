import type { Metadata } from "next";
import { Settings } from "@/components/dashboard/Settings";

export const metadata: Metadata = {
  title: "Settings · NicheSpy",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <Settings />;
}
