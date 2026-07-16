// Channel Audit is temporarily disabled ("Soon"). The full tool lives in
// components/dashboard/ChannelAudit.tsx and the /api/audit* routes + audit-worker
//, re-enable by restoring the <ChannelAudit /> render below and removing the
// `soon: true` flag on the sidebar nav item in DashboardShell.tsx.

function Icon({ d, size = 30 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function ChannelAuditPage() {
  return (
    <div className="dash-fade-up flex min-h-[60vh] w-full items-center justify-center">
      <div className="flex max-w-[440px] flex-col items-center rounded-none border border-white/10 bg-[#1B1D1F] p-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-none bg-[#01D4FF]/10 text-[#01D4FF]">
          <Icon d="M12 2l8 4v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-4z M9 12l2 2 4-4" />
        </span>
        <div className="mt-5 flex items-center gap-2">
          <h1 className="text-[22px] font-extrabold text-on-surface">Channel Audit</h1>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-white/60">Soon</span>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-on-surface-variant">
          A full AI review of your Shorts, hooks, editing, voiceover, music &amp; captions.
          We&apos;re putting the finishing touches on it. Check back shortly.
        </p>
      </div>
    </div>
  );
}
