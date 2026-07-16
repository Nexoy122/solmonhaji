import Image from "next/image";

// The NicheSpy mark. One source of truth so the logo can be swapped in a single
// place. The art is a red rounded tile with a light crosshair reticle, so it
// needs no border or background of its own and reads on light or dark.
export function Logo({
  size = 30,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.png"
      alt="NicheSpy"
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 rounded-[22%] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// Mark + wordmark, the standard lockup used in navs and footers.
export function LogoLockup({
  size = 30,
  className = "",
  textClassName = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  textClassName?: string;
  priority?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo size={size} priority={priority} />
      <span className={`font-black uppercase tracking-tighter ${textClassName}`}>NicheSpy</span>
    </span>
  );
}
