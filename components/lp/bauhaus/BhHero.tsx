import { ArrowRight } from "lucide-react";
import { BhButton, BhLabel } from "./BhKit";

// Asymmetric Bauhaus hero: bold left copy, right blue color-block panel with an
// overlapping geometric composition (circle + rotated square + triangle).
export function BhHero() {
  return (
    <section id="top" className="border-b-4 border-black">
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* left — copy */}
        <div className="relative flex flex-col justify-center border-b-4 border-black px-4 py-14 md:px-8 md:py-20 lg:border-b-0 lg:border-r-4">
          <BhLabel className="text-[#D02020]">// Competitor intelligence</BhLabel>
          <h1 className="mt-5 text-[clamp(38px,7vw,80px)] font-black uppercase leading-[0.9] tracking-tighter text-black">
            Spy on<br />what<br /><span className="text-[#1040C0]">actually</span><br />works
          </h1>
          <p className="mt-7 max-w-md text-[17px] font-medium leading-relaxed text-black/80 md:text-[18px]">
            AI-powered outlier detection, untapped-topic ideas, and channel scoring —
            the research you waste hours on, done in a minute.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <BhButton href="/signup" color="red">
              Get started <ArrowRight className="h-5 w-5" strokeWidth={3} />
            </BhButton>
            <BhButton href="#tools" color="outline">See the tools</BhButton>
          </div>
        </div>

        {/* right — blue color-block with geometric composition */}
        <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden bg-[#1040C0] bh-dots-light lg:min-h-[560px]">
          {/* big circle */}
          <span className="absolute left-8 top-10 h-40 w-40 rounded-full border-4 border-black bg-[#F0C020] md:h-56 md:w-56" />
          {/* rotated square */}
          <span className="absolute bottom-12 right-10 h-36 w-36 rotate-45 border-4 border-black bg-[#D02020] md:h-52 md:w-52" />
          {/* centered square holding a triangle */}
          <span className="relative flex h-40 w-40 items-center justify-center border-4 border-black bg-white shadow-[8px_8px_0px_0px_#121212] md:h-56 md:w-56">
            <span className="h-20 w-20 bh-triangle bg-[#1040C0] md:h-28 md:w-28" />
          </span>
          {/* small accent circle */}
          <span className="absolute right-16 top-12 h-10 w-10 rounded-full border-4 border-black bg-white" />
        </div>
      </div>
    </section>
  );
}
