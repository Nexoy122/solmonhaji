import Link from "next/link";

const MESSAGES: Record<string, { title: string; body: string; ok: boolean }> = {
  success: {
    title: "You're in! 🎉",
    body: "Your Discord account has been added to the NicheSpy server and your role is assigned. Jump in and say hi.",
    ok: true,
  },
  exists: {
    title: "Welcome back!",
    body: "You're already in the NicheSpy server, your role has been refreshed. See you inside.",
    ok: true,
  },
  error: {
    title: "Something went wrong",
    body: "We couldn't complete the Discord connection. Please try again, or join via the invite link.",
    ok: false,
  },
};

export default async function DiscordDone({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const m = MESSAGES[status ?? "error"] ?? MESSAGES.error;

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-[440px] rounded-3xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
            m.ok ? "bg-primary-container text-on-primary-container" : "bg-error/10 text-error"
          }`}
        >
          {m.ok ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          )}
        </div>

        <h1 className="text-headline-small font-bold text-on-surface">{m.title}</h1>
        <p className="mt-3 text-body-medium text-on-surface-variant">{m.body}</p>

        <div className="mt-7 flex flex-col gap-2.5">
          <a
            href="https://discord.gg/7AYW4693XQ"
            target="_blank"
            rel="noopener noreferrer"
            className="m3-btn-filled w-full"
          >
            Open Discord
          </a>
          <Link href="/" className="m3-btn-tonal w-full">
            Back to NicheSpy
          </Link>
        </div>
      </div>
    </main>
  );
}
