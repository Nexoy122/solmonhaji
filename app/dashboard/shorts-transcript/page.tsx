import { Suspense } from "react";
import { ShortsTranscript } from "@/components/dashboard/ShortsTranscript";

export default function ShortsTranscriptPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" /></div>}>
      <ShortsTranscript />
    </Suspense>
  );
}
