import Link from "next/link";
import { Logo } from "./Navbar";
import { Footer } from "./Footer";
import { DiscordButton } from "./DiscordButton";
import type { ReactNode } from "react";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main>
      {/* simple top bar */}
      <header className="border-b border-outline-variant">
        <div className="mx-auto flex max-w-[820px] items-center justify-between px-5 md:px-8 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-[20px] font-bold tracking-[-0.4px]">
            <Logo />
            NicheSpy
          </Link>
          <Link href="/" className="m3-btn-tonal !h-10 !px-5 !text-[14px]">
            ← Back home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-[820px] px-5 md:px-8 py-16 md:py-20">
        <h1 className="text-display-small">{title}</h1>
        <p className="mt-3 text-body-medium text-on-surface-variant">Last updated: {updated}</p>

        <div className="legal-body mt-12">{children}</div>
      </article>

      <Footer />
      <DiscordButton />
    </main>
  );
}
