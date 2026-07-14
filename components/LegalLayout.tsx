import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BhLogoMark } from "./lp/bauhaus/BhKit";
import { BhFooter } from "./lp/bauhaus/BhFooter";
import type { ReactNode } from "react";

// Bauhaus-styled legal layout (privacy / terms).
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
    <main className="lp-root min-h-screen bg-[#F0F0F0] text-[#121212]">
      {/* top bar */}
      <header className="border-b-4 border-black bg-[#F0F0F0]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <BhLogoMark size={28} />
            <span className="text-[20px] font-black uppercase tracking-tighter">NicheSpy</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 text-[13px] font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#121212] transition-all duration-200 ease-out active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={3} /> Home
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-14 md:px-8 md:py-20">
        <span className="inline-block h-6 w-6 border-2 border-black bg-[#1040C0]" />
        <h1 className="mt-4 text-[clamp(36px,7vw,72px)] font-black uppercase leading-[0.9] tracking-tighter">{title}</h1>
        <p className="mt-4 inline-block border-2 border-black bg-[#F0C020] px-3 py-1 text-[12px] font-black uppercase tracking-widest">
          Last updated: {updated}
        </p>

        <div className="bh-legal mt-12">{children}</div>
      </article>

      <BhFooter />
    </main>
  );
}
