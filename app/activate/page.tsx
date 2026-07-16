import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivateScreen } from "@/components/access/ActivateScreen";

export const metadata: Metadata = {
  title: "Activate your account · NicheSpy",
  robots: { index: false, follow: false },
};

export default function ActivatePage() {
  return (
    <Suspense fallback={null}>
      <ActivateScreen />
    </Suspense>
  );
}
