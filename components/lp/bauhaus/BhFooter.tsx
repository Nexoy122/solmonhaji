import Link from "next/link";
import { BhLogoMark } from "./BhKit";

const DISCORD = "https://discord.gg/7AYW4693XQ";

export function BhFooter() {
  return (
    <footer className="bg-[#121212] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <BhLogoMark size={28} />
              <span className="text-[20px] font-black uppercase tracking-tighter">NicheSpy</span>
            </div>
            <p className="mt-4 max-w-xs text-[14px] font-medium leading-relaxed text-white/50">
              The YouTube Shorts intelligence toolkit for faceless creators.
            </p>
          </div>

          <div>
            <div className="text-[12px] font-black uppercase tracking-widest text-[#F0C020]">Product</div>
            <ul className="mt-4 space-y-2 text-[14px] font-medium text-white/60">
              <li><a href="#tools" className="hover:text-white">Tools</a></li>
              <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
              <li><a href="#reviews" className="hover:text-white">Reviews</a></li>
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
            </ul>
          </div>

          <div>
            <div className="text-[12px] font-black uppercase tracking-widest text-[#F0C020]">Account</div>
            <ul className="mt-4 space-y-2 text-[14px] font-medium text-white/60">
              <li><Link href="/login" className="hover:text-white">Sign In</Link></li>
              <li><Link href="/signup" className="hover:text-white">Sign Up</Link></li>
              <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-[12px] font-black uppercase tracking-widest text-[#F0C020]">Company</div>
            <ul className="mt-4 space-y-2 text-[14px] font-medium text-white/60">
              <li><a href={DISCORD} target="_blank" rel="noopener noreferrer" className="hover:text-white">Discord</a></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              <li><a href="mailto:support@vixo.live" className="hover:text-white">Support</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t-2 border-white/15 pt-6 text-[13px] font-bold uppercase tracking-wide text-white/40 sm:flex-row">
          <span>© {new Date().getFullYear()} NicheSpy</span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#D02020]" />
            <span className="h-3 w-3 bg-[#1040C0]" />
            <span className="h-3 w-3 bh-triangle bg-[#F0C020]" />
          </span>
        </div>
      </div>
    </footer>
  );
}
