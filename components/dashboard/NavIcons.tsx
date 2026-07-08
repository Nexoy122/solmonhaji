"use client";

import type { ReactElement } from "react";

// Sidebar nav icons using Google Material Symbols (Rounded), self-hosted via the
// material-symbols package. Each is a ligature glyph rendered with the .msym font.

function MSym({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <span className="msym" style={{ fontSize: size }} aria-hidden="true">
      {name}
    </span>
  );
}

export function OverviewIcon() { return <MSym name="home" />; }
export function DiscoverIcon() { return <MSym name="explore" />; }
export function ExploreIcon() { return <MSym name="search" />; }
export function NicheIcon() { return <MSym name="query_stats" />; }
export function ScriptIcon() { return <MSym name="edit_note" />; }
export function TrustIcon() { return <MSym name="verified_user" />; }
export function AuditIcon() { return <MSym name="fact_check" />; }
export function TranscriptIcon() { return <MSym name="description" />; }

export const NAV_ICONS: Record<string, () => ReactElement> = {
  overview: OverviewIcon,
  discover: DiscoverIcon,
  explore: ExploreIcon,
  niche: NicheIcon,
  script: ScriptIcon,
  trust: TrustIcon,
  audit: AuditIcon,
  transcript: TranscriptIcon,
};
