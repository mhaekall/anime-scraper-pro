// features/home/HeroCarousel.tsx — Lightweight hero with CSS scroll-snap

"use client";

import { useState, useRef, useEffect, memo } from "react";
import Link from "next/link";
import { IconPlay, IconInfo } from "@/ui/icons";
import { useSettings } from "@/core/stores/app-store";
import type { AnimeHome } from "@/core/types/anime";

function HeroCarouselInner({ items }: { items: AnimeHome[] }) {
  const accent = "#0A84FF";
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const heroes = items.slice(0, 5); // Max 5 for speed

  // Auto-advance
  useEffect(() => {
    if (heroes.length <= 1) return;
    const t = setInterval(() => {
      setIdx((p) => {
        const next = (p + 1) % heroes.length;
        ref.current?.scrollTo({ left: ref.current.offsetWidth * next, behavior: "smooth" });
        return next;
      });
    }, 5000);
    return () => clearInterval(t);
  }, [heroes.length]);

  if (heroes.length === 0) return null;

  return (
    <div className="relative">
      <div ref={ref} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar px-5 md:px-8 gap-4"
        onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth))}
      >
        {heroes.map((a, i) => {
          const cover = a.img || a.banner;
          const c = a.color || accent;
          return (
            <div key={a.id + i} className="min-w-full snap-center relative h-[380px] md:h-[460px] rounded-3xl overflow-hidden border border-white/5">
              {cover && <img src={cover} alt={a.title} className="absolute inset-0 w-full h-full object-cover" loading={i === 0 ? "eager" : "lazy"} decoding="async" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: `linear-gradient(to top, ${c}, transparent)` }} />

              <div className="absolute bottom-6 md:bottom-8 left-6 md:left-8 right-6 md:right-8 z-10 anim-fade">
                <div className="flex gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-white text-black text-[10px] font-black rounded-sm uppercase tracking-widest">TRENDING #{i + 1}</span>
                  {a.score && <span className="px-2.5 py-1 bg-black/60 text-white text-[10px] font-bold rounded-sm border border-white/20">{(a.score > 10 ? (a.score / 10).toFixed(1) : a.score)}/10</span>}
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white leading-[1.05] mb-4">{a.title}</h2>
                <div className="flex gap-3">
                  <Link href={`/watch/${a.id}/1`}><button className="px-8 bg-white text-black font-black py-3 rounded-2xl flex items-center gap-2 text-sm active:scale-95 transition-transform"><IconPlay /> Putar</button></Link>
                  <Link href={`/anime/${a.id}`}><button className="w-12 h-12 rounded-2xl bg-black/50 border border-white/20 flex items-center justify-center text-white active:scale-90"><IconInfo /></button></Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {heroes.map((_, i) => (
          <button key={i} onClick={() => { ref.current?.scrollTo({ left: ref.current.offsetWidth * i, behavior: "smooth" }); setIdx(i); }}
            className={`h-1.5 rounded-full transition-all duration-400 ${idx === i ? "w-7 bg-white" : "w-2 bg-[#3a3a3c]"}`}
          />
        ))}
      </div>
    </div>
  );
}

export const HeroCarousel = memo(HeroCarouselInner);
