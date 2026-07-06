import { Suspense } from "react";
import { TrustScore } from "@/components/dashboard/TrustScore";

export default function TrustScorePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" /></div>}>
      <TrustScore />
    </Suspense>
  );
}
