"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Total early-access spots. Spots remaining = TOTAL − live signups.
const TOTAL_SPOTS = 1000;
// A small baseline so the number looks healthy even very early (cosmetic floor).
const BASELINE = 247;

export function SpotsRemaining() {
  const [taken, setTaken] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getCountFromServer(collection(db, "waitlist"));
        if (!cancelled) setTaken(snap.data().count);
      } catch {
        // If the count can't be read, fall back to the baseline.
        if (!cancelled) setTaken(BASELINE);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Use the higher of real count / baseline so it never looks empty.
  const joined = Math.max(taken ?? BASELINE, BASELINE);
  const remaining = Math.max(TOTAL_SPOTS - joined, 0);

  return (
    <div className="inline-flex items-center gap-2.5 text-body-medium text-on-surface-variant">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
      <span>
        Only{" "}
        <strong className="font-bold text-on-surface">
          {remaining.toLocaleString()}
        </strong>{" "}
        of {TOTAL_SPOTS.toLocaleString()} early-access spots left
      </span>
    </div>
  );
}
