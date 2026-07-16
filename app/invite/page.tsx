import type { Metadata } from "next";
import { Suspense } from "react";
import { InviteScreen } from "@/components/access/InviteScreen";

export const metadata: Metadata = {
  title: "Your invite · NicheSpy",
  robots: { index: false, follow: false },
};

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteScreen />
    </Suspense>
  );
}
