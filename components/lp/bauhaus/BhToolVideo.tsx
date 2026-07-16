"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";

// A tool demo clip. Autoplays muted + loops inline; click to open it large in a
// lightbox. Because six of these share the page, the inline clip only plays
// while on screen, we're not running six decoders in a background tab.
export function BhToolVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect users who don't want motion: leave the poster frame up.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => { /* autoplay blocked, poster stays */ });
        else el.pause();
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pause the inline clip while the lightbox is up, and lock scroll.
  useEffect(() => {
    if (!open) return;
    ref.current?.pause();
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
      ref.current?.play().catch(() => {});
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Play ${label} demo`}
        className="group/v relative block w-full cursor-pointer border-b-2 bh-border md:border-b-4"
      >
        <video
          ref={ref}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
          className="block aspect-video w-full bg-[#0A0A0A] object-cover"
        />
        {/* expand affordance, appears on hover */}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover/v:bg-black/35">
          <span className="flex h-11 w-11 items-center justify-center border-2 border-black bg-white opacity-0 shadow-[3px_3px_0_0_#121212] transition-all duration-200 group-hover/v:opacity-100">
            <Maximize2 className="h-5 w-5 text-black" strokeWidth={3} />
          </span>
        </span>
      </button>

      {/* Lightbox */}
      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-[15px] font-black uppercase tracking-wider text-white">{label}</p>
              <button
                onClick={close}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center border-2 border-white bg-transparent text-white transition-colors hover:bg-white hover:text-black"
              >
                <X className="h-5 w-5" strokeWidth={3} />
              </button>
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={src}
              poster={poster}
              autoPlay
              loop
              controls
              playsInline
              className="block max-h-[80vh] w-full border-4 border-white bg-black object-contain"
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
