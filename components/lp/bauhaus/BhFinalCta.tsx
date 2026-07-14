import { ArrowRight } from "lucide-react";
import { BhButton } from "./BhKit";

export function BhFinalCta() {
  return (
    <section className="relative overflow-hidden border-b-4 border-black bg-[#F0C020]">
      {/* big decorative shapes at 50% opacity in corners */}
      <span className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full border-4 border-black opacity-50" />
      <span className="pointer-events-none absolute -bottom-20 -right-16 h-72 w-72 rotate-45 border-4 border-black bg-[#D02020] opacity-50" />

      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center md:px-8 md:py-28">
        <h2 className="text-[clamp(36px,6.5vw,80px)] font-black uppercase leading-[0.9] tracking-tighter text-black">
          Stop guessing.<br />Start spying.
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-[18px] font-medium text-black/80">
          Get competitor intelligence, outlier alerts, and AI scripts before anyone else.
        </p>
        <div className="mt-10 flex justify-center">
          <BhButton href="/signup" color="red" className="!px-8 !py-4 !text-[16px]">
            Get started free <ArrowRight className="h-5 w-5" strokeWidth={3} />
          </BhButton>
        </div>
      </div>
    </section>
  );
}
