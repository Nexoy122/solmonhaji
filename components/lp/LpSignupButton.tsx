import Link from "next/link";

// vidIQ-style "Sign Up for Free" button: blue gradient pill with a gradient
// border, soft stacked shadow, and the Google "G" mark. Sizes: sm (navbar),
// md (default), lg (hero / big CTAs).
type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "h-9 px-4 text-[14px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-14 px-8 text-[16px]",
};

// White circle diameter + inner glyph px, per size.
const GLYPH: Record<Size, { box: number; g: number }> = {
  sm: { box: 20, g: 12 },
  md: { box: 22, g: 13 },
  lg: { box: 26, g: 15 },
};

function GoogleG({ box, g }: { box: number; g: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-white"
      style={{ width: box, height: box }}
    >
      <svg width={g} height={g} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
        <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
        <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
        <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
      </svg>
    </span>
  );
}

export function LpSignupButton({
  size = "md",
  label = "Sign Up for Free",
  href = "/signup",
  className = "",
}: {
  size?: Size;
  label?: string;
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium text-[#f7f7f7] transition-all duration-300 ease-in-out ${SIZE[size]} border border-transparent shadow-[0px_28px_8px_0px_rgba(0,0,0,0),0px_18px_7px_0px_rgba(0,0,0,0.01),0px_10px_6px_0px_rgba(0,0,0,0.02),0px_4px_4px_0px_rgba(0,0,0,0.05),0px_1px_2px_0px_rgba(0,0,0,0.05)] [background:linear-gradient(#0463fd,#0463fd)_padding-box,linear-gradient(180deg,#67a1ff_0%,#0463fd_50%,#3880f7_100%)_border-box] hover:[background:linear-gradient(#0463fd,#0463fd)_padding-box,linear-gradient(180deg,#8bb5ff_0%,#0463fd_50%,#3880f7_100%)_border-box] active:scale-[0.98] ${className}`}
    >
      <GoogleG box={GLYPH[size].box} g={GLYPH[size].g} />
      <span>{label}</span>
    </Link>
  );
}
